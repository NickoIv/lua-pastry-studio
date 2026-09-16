-- Manual loyalty point adjustments. Never an UPDATE to a balance (there
-- is none — see docs/ARCHITECTURE.md "Loyalty ledger") and never an
-- edit to an existing loyalty_transactions row: this inserts exactly
-- one new `manual_adjustment` ledger row, the same way `confirm_order_earn`
-- inserts an `earn` row and `confirm_reward_redemption` inserts a
-- `redeem` row in 005_functions.sql.
--
-- Two guards a UI-only check can't provide:
-- 1. pg_advisory_xact_lock serializes concurrent adjustments (and any
--    other balance-affecting operation) for the same customer, so two
--    simultaneous requests can't both read a stale balance and both
--    pass the negative-balance check.
-- 2. The idempotency_key unique constraint (already on
--    loyalty_transactions since 003_loyalty_rewards_qr.sql) makes a
--    retried request return the original transaction instead of
--    double-applying it.
create or replace function admin_adjust_customer_points(
  p_customer_id uuid,
  p_points integer,
  p_reason text,
  p_actor_staff_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_staff uuid := nullif(current_setting('app.staff_id', true), '')::uuid;
  v_balance integer;
  v_tx loyalty_transactions;
begin
  if v_caller_staff is null or v_caller_staff <> p_actor_staff_id then
    raise exception 'FORBIDDEN';
  end if;
  if p_points = 0 then
    raise exception 'VALIDATION';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'VALIDATION';
  end if;
  if not exists (select 1 from customer_profiles where id = p_customer_id) then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_customer_id::text));

  select * into v_tx from loyalty_transactions where idempotency_key = p_idempotency_key;
  if found then
    select coalesce(sum(points), 0) into v_balance from loyalty_transactions where customer_id = p_customer_id;
    return jsonb_build_object(
      'transaction', jsonb_build_object('id', v_tx.id, 'points', v_tx.points, 'reason', v_tx.reason, 'createdAt', v_tx.created_at),
      'newBalance', v_balance,
      'replayed', true
    );
  end if;

  select coalesce(sum(points), 0) into v_balance from loyalty_transactions where customer_id = p_customer_id;
  if v_balance + p_points < 0 then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into loyalty_transactions (customer_id, type, points, performed_by_staff_id, reason, idempotency_key)
  values (p_customer_id, 'manual_adjustment', p_points, p_actor_staff_id, p_reason, p_idempotency_key)
  returning * into v_tx;

  insert into audit_logs (action, actor_staff_id, target_type, target_id, summary, metadata)
  values (
    'loyalty.manual_adjustment', p_actor_staff_id, 'customer', p_customer_id::text,
    (case when p_points > 0 then 'Начислено вручную ' || p_points else 'Списано вручную ' || abs(p_points) end)
      || ' баллов: ' || p_reason,
    jsonb_build_object('points', p_points, 'newBalance', v_balance + p_points)
  );

  return jsonb_build_object(
    'transaction', jsonb_build_object('id', v_tx.id, 'points', v_tx.points, 'reason', v_tx.reason, 'createdAt', v_tx.created_at),
    'newBalance', v_balance + p_points,
    'replayed', false
  );
end;
$$;

revoke execute on function admin_adjust_customer_points(uuid, integer, text, uuid, text) from public;
grant execute on function admin_adjust_customer_points(uuid, integer, text, uuid, text) to app_admin;
