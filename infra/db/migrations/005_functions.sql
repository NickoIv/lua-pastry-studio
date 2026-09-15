-- Atomic server-side operations. Every function is SECURITY DEFINER with
-- a pinned search_path (the classic SECURITY DEFINER hijack vector),
-- re-checks the caller's identity against the `app.*` session GUCs the
-- API server sets from a verified JWT (never trusts a plain parameter),
-- and is granted to exactly the role that should be able to call it.
-- See docs/QR-SECURITY.md and docs/ARCHITECTURE.md "Server-side business
-- operations".

create or replace function mask_phone(p_phone text) returns text
language sql
immutable
as $$
  select '+' || substring(regexp_replace(p_phone, '\D', '', 'g') from 1 for 3)
    || ' •• •• ' || right(regexp_replace(p_phone, '\D', '', 'g'), 2);
$$;

-- Login lookups happen before the caller has an authenticated session,
-- so these run as the bare app_server login role rather than any of the
-- app_customer/app_staff/app_admin session roles.
create or replace function verify_customer_login(p_email text)
returns table (id uuid, password_hash text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, password_hash from customer_profiles where email = lower(p_email);
$$;

create or replace function verify_staff_login(p_email text)
returns table (id uuid, password_hash text, role text, display_name text, location_id uuid, active boolean)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, password_hash, role, display_name, location_id, active
  from staff_profiles
  where email = lower(p_email);
$$;

grant execute on function verify_customer_login(text) to app_server;
grant execute on function verify_staff_login(text) to app_server;

-- Scenario B step 1 (packages/domain's RedemptionService.requestRedemption
-- equivalent): never touches the ledger, only creates a PENDING row.
create or replace function request_reward_redemption(
  p_customer_id uuid,
  p_reward_id uuid,
  p_ttl_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := nullif(current_setting('app.customer_id', true), '')::uuid;
  v_reward rewards;
  v_balance integer;
  v_redemption reward_redemptions;
begin
  if v_caller is null or v_caller <> p_customer_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_reward from rewards where id = p_reward_id;
  if not found then
    raise exception 'REWARD_INACTIVE';
  end if;
  if not v_reward.is_active or (v_reward.stock is not null and v_reward.stock <= 0) then
    raise exception 'REWARD_INACTIVE';
  end if;

  select coalesce(sum(points), 0) into v_balance from loyalty_transactions where customer_id = p_customer_id;
  if v_balance < v_reward.points_cost then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into reward_redemptions (reward_id, customer_id, points_cost, expires_at)
  values (p_reward_id, p_customer_id, v_reward.points_cost, now() + make_interval(secs => p_ttl_seconds))
  returning * into v_redemption;

  return jsonb_build_object(
    'id', v_redemption.id,
    'rewardId', v_redemption.reward_id,
    'customerId', v_redemption.customer_id,
    'pointsCost', v_redemption.points_cost,
    'status', v_redemption.status,
    'createdAt', v_redemption.created_at,
    'expiresAt', v_redemption.expires_at
  );
end;
$$;

grant execute on function request_reward_redemption(uuid, uuid, integer) to app_customer;

-- Guest-issued QR sessions (both purposes). Raw token generation and its
-- digest happen in Node (packages/server/src/qr.ts); only the digest
-- ever reaches this function/table.
create or replace function create_qr_session(
  p_token_digest text,
  p_purpose text,
  p_customer_id uuid,
  p_reward_redemption_id uuid,
  p_ttl_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := nullif(current_setting('app.customer_id', true), '')::uuid;
  v_row qr_sessions;
begin
  if v_caller is null or v_caller <> p_customer_id then
    raise exception 'FORBIDDEN';
  end if;
  if p_purpose not in ('IDENTITY', 'REWARD_REDEMPTION') then
    raise exception 'INVALID_PURPOSE';
  end if;
  if p_purpose = 'REWARD_REDEMPTION' then
    if not exists (
      select 1 from reward_redemptions
      where id = p_reward_redemption_id and customer_id = p_customer_id and status = 'PENDING'
    ) then
      raise exception 'REDEMPTION_ALREADY_COMPLETED';
    end if;
  end if;

  insert into qr_sessions (token_digest, purpose, customer_id, reward_redemption_id, expires_at)
  values (p_token_digest, p_purpose, p_customer_id, p_reward_redemption_id, now() + make_interval(secs => p_ttl_seconds))
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'expiresAt', v_row.expires_at);
end;
$$;

grant execute on function create_qr_session(text, text, uuid, uuid, integer) to app_customer;

-- Staff "scan" step: read-only resolve of a QR digest into the minimal
-- DTO the Staff UI is allowed to see (see docs/ARCHITECTURE.md §6/§35).
create or replace function resolve_qr_token(p_token_digest text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session qr_sessions;
  v_customer customer_profiles;
  v_balance integer;
  v_result jsonb;
  v_redemption reward_redemptions;
  v_reward rewards;
begin
  select * into v_session from qr_sessions where token_digest = p_token_digest;
  if not found then
    raise exception 'QR_INVALID';
  end if;
  if v_session.expires_at < now() then
    raise exception 'QR_EXPIRED';
  end if;
  if v_session.purpose = 'REWARD_REDEMPTION' and v_session.used_at is not null then
    raise exception 'QR_USED';
  end if;

  select * into v_customer from customer_profiles where id = v_session.customer_id;
  select coalesce(sum(points), 0) into v_balance from loyalty_transactions where customer_id = v_session.customer_id;

  v_result := jsonb_build_object(
    'purpose', v_session.purpose,
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'displayName', trim(both from (v_customer.first_name || ' ' || coalesce(v_customer.last_name, ''))),
      'maskedPhone', mask_phone(v_customer.phone),
      'balance', v_balance
    )
  );

  if v_session.purpose = 'REWARD_REDEMPTION' then
    select * into v_redemption from reward_redemptions where id = v_session.reward_redemption_id;
    if v_redemption.status <> 'PENDING' then
      raise exception 'REDEMPTION_ALREADY_COMPLETED';
    end if;
    select * into v_reward from rewards where id = v_redemption.reward_id;
    v_result := v_result || jsonb_build_object(
      'redemption', jsonb_build_object(
        'id', v_redemption.id,
        'pointsCost', v_redemption.points_cost,
        'rewardTitle', v_reward.title,
        'expiresAt', v_redemption.expires_at
      )
    );
  end if;

  return v_result;
end;
$$;

grant execute on function resolve_qr_token(text) to app_staff;

-- Scenario B step 2 — the only place points for a redemption are
-- deducted. FOR UPDATE + the unique idempotency_key on
-- loyalty_transactions together close the two-staff-scan-at-once race
-- from docs/ARCHITECTURE.md/the product brief §17.
create or replace function confirm_reward_redemption(
  p_redemption_id uuid,
  p_staff_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_staff uuid := nullif(current_setting('app.staff_id', true), '')::uuid;
  v_redemption reward_redemptions;
  v_reward rewards;
  v_balance integer;
  v_tx loyalty_transactions;
begin
  if v_caller_staff is null or v_caller_staff <> p_staff_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_redemption from reward_redemptions where id = p_redemption_id for update;
  if not found then
    raise exception 'REDEMPTION_NOT_FOUND';
  end if;
  if v_redemption.status <> 'PENDING' then
    raise exception 'REDEMPTION_ALREADY_COMPLETED';
  end if;
  if v_redemption.expires_at < now() then
    update reward_redemptions set status = 'EXPIRED' where id = p_redemption_id;
    raise exception 'QR_EXPIRED';
  end if;

  select * into v_reward from rewards where id = v_redemption.reward_id;
  if not v_reward.is_active then
    raise exception 'REWARD_INACTIVE';
  end if;

  select coalesce(sum(points), 0) into v_balance from loyalty_transactions where customer_id = v_redemption.customer_id;
  if v_balance < v_redemption.points_cost then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into loyalty_transactions (customer_id, type, points, reward_redemption_id, performed_by_staff_id, reason, idempotency_key)
  values (
    v_redemption.customer_id, 'redeem', -v_redemption.points_cost, v_redemption.id, p_staff_id,
    'Списание: ' || (v_reward.title ->> 'ru'), 'redemption:' || v_redemption.id
  )
  returning * into v_tx;

  update reward_redemptions
  set status = 'FULFILLED', fulfilled_by_staff_id = p_staff_id, fulfilled_at = now(), loyalty_transaction_id = v_tx.id
  where id = p_redemption_id
  returning * into v_redemption;

  update qr_sessions set used_at = now(), used_by_staff_id = p_staff_id
  where reward_redemption_id = p_redemption_id and used_at is null;

  insert into audit_logs (action, actor_staff_id, target_type, target_id, summary, metadata)
  values (
    'reward.redemption.fulfilled', p_staff_id, 'reward_redemption', p_redemption_id::text,
    'Выдана награда: ' || (v_reward.title ->> 'ru'),
    jsonb_build_object('pointsCost', v_redemption.points_cost, 'customerId', v_redemption.customer_id)
  );

  return jsonb_build_object(
    'redemption', jsonb_build_object('id', v_redemption.id, 'status', v_redemption.status, 'fulfilledAt', v_redemption.fulfilled_at),
    'transaction', jsonb_build_object('id', v_tx.id, 'points', v_tx.points),
    'newBalance', v_balance - v_redemption.points_cost
  );
end;
$$;

grant execute on function confirm_reward_redemption(uuid, uuid) to app_staff;

-- Scenario A: attach a PAID_UNASSIGNED demo order to the scanned
-- customer and award points in one step. Re-confirming a COMPLETED
-- order is rejected (ORDER_ALREADY_REWARDED), not double-earned.
create or replace function confirm_order_earn(
  p_order_id uuid,
  p_customer_id uuid,
  p_staff_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_staff uuid := nullif(current_setting('app.staff_id', true), '')::uuid;
  v_order orders;
  v_program loyalty_programs;
  v_points integer := 0;
  v_raw numeric;
begin
  if v_caller_staff is null or v_caller_staff <> p_staff_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = 'COMPLETED' then
    raise exception 'ORDER_ALREADY_REWARDED';
  end if;
  if v_order.status <> 'PAID_UNASSIGNED' then
    raise exception 'ORDER_ALREADY_ASSIGNED';
  end if;

  select * into v_program from loyalty_programs where id = 'default';

  if v_program.is_active and v_order.total_minor_units >= v_program.min_order_amount_minor_units then
    v_raw := (v_order.total_minor_units / 100.0) * v_program.earn_rate_per_currency_unit;
    v_points := case v_program.points_rounding_strategy
      when 'floor' then floor(v_raw)
      when 'ceil' then ceil(v_raw)
      else round(v_raw)
    end;
    if v_points < 0 then
      v_points := 0;
    end if;
  end if;

  update orders
  set customer_id = p_customer_id, staff_user_id = p_staff_id, status = 'COMPLETED',
      points_earned = v_points, completed_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_points > 0 then
    insert into loyalty_transactions (customer_id, type, points, order_id, performed_by_staff_id, reason, idempotency_key)
    values (
      p_customer_id, 'earn', v_points, p_order_id, p_staff_id,
      'Покупка ' || coalesce(v_order.external_order_code, p_order_id::text), 'earn:' || p_order_id
    );
  end if;

  insert into audit_logs (action, actor_staff_id, target_type, target_id, summary, metadata)
  values (
    'loyalty.earn', p_staff_id, 'order', p_order_id::text,
    'Начислено ' || v_points || ' баллов за заказ', jsonb_build_object('customerId', p_customer_id, 'points', v_points)
  );

  return jsonb_build_object(
    'order', jsonb_build_object('id', v_order.id, 'status', v_order.status, 'pointsEarned', v_order.points_earned, 'completedAt', v_order.completed_at)
  );
end;
$$;

grant execute on function confirm_order_earn(uuid, uuid, uuid) to app_staff;
