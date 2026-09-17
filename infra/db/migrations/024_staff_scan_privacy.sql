-- Staff doesn't need a customer's phone number for a normal QR scan
-- (identity or reward) — drop it from resolve_qr_token()'s DTO rather
-- than just hiding it in the UI, so it never reaches the Staff app at
-- all. mask_phone() itself is left in place (harmless, may still be
-- useful elsewhere) — only this call site changes.

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

-- Guest's "current location" selector (docs/ARCHITECTURE.md "Guest
-- location selection") reuses the existing home_location_id column —
-- already nullable, already an FK, and app_customer already has an
-- UPDATE grant on it from 006_rls.sql. No schema change needed here.
