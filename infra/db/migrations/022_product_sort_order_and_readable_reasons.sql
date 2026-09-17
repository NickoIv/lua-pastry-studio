-- (a) Product sort order — the owner's test product landed at the very
-- bottom of Guest Menu with no way to move it; categories already had
-- sort_order (013_catalog_cms_columns.sql), products didn't.
-- (b) confirm_order_earn() embedded a raw order UUID in the ledger
-- reason whenever an order had no external_order_code — visible
-- verbatim in Guest's Lua Club history and Admin's customer ledger
-- ("Покупка 80000000-0000-..."). Fixed going forward, and backfilled
-- for the existing seeded history in seed.sql (also updated in this
-- pass to give those orders real LUA-#### codes).

alter table products add column sort_order integer not null default 0;
update products set sort_order = ordinal - 1
  from (select id, row_number() over (partition by category_id order by created_at) as ordinal from products) ranked
  where products.id = ranked.id;

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
  v_order_label text;
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

  -- Never a raw UUID: a real order code if one exists, else the order's
  -- own date — both human-readable in Guest/Admin history views.
  v_order_label := coalesce(v_order.external_order_code, 'от ' || to_char(v_order.created_at, 'DD.MM.YYYY'));

  if v_points > 0 then
    insert into loyalty_transactions (customer_id, type, points, order_id, performed_by_staff_id, reason, idempotency_key)
    values (
      p_customer_id, 'earn', v_points, p_order_id, p_staff_id,
      'Заказ ' || v_order_label, 'earn:' || p_order_id
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

-- Backfill: rewrite the existing seeded 'earn' reasons the same way,
-- joining back to the order they reference.
update loyalty_transactions lt
set reason = 'Заказ ' || coalesce(o.external_order_code, 'от ' || to_char(o.created_at, 'DD.MM.YYYY'))
from orders o
where lt.order_id = o.id and lt.type = 'earn' and lt.reason like 'Покупка %';
