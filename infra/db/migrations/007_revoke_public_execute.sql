-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default. Every
-- function in 005_functions.sql relies on only the intended role being
-- able to call it at all (the in-function identity check is
-- defense-in-depth, not the primary control) — so revoke the implicit
-- PUBLIC grant everywhere before anything else can depend on it.

revoke execute on function verify_customer_login(text) from public;
revoke execute on function verify_staff_login(text) from public;
revoke execute on function request_reward_redemption(uuid, uuid, integer) from public;
revoke execute on function create_qr_session(text, text, uuid, uuid, integer) from public;
revoke execute on function resolve_qr_token(text) from public;
revoke execute on function confirm_reward_redemption(uuid, uuid) from public;
revoke execute on function confirm_order_earn(uuid, uuid, uuid) from public;
-- mask_phone has no sensitive side effects and is used inside other
-- SECURITY DEFINER functions regardless of caller, so it stays public.
