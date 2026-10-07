-- Deterministic local dev seed. Safe to re-run (pnpm db:seed) — every
-- insert is idempotent via a fixed id or a unique idempotency_key.
-- No real personal data: names/phones/emails are fixture data, and all
-- passwords are clearly-labeled local dev accounts (see
-- docs/LOCAL-BACKEND.md "Demo accounts").
--
-- IDs are stable across the whole file's history — packages/server/tests
-- and the E2E smoke script pin specific UUIDs (Николай, LUA-1001, the
-- "Маленький принц" reward, …). New rows added for the catalog-CMS/
-- presentation-polish pass use fresh ids; nothing already referenced
-- elsewhere was renumbered.

-- ---- Locations -----------------------------------------------------------
-- short_name is what Staff/Admin tables and compact Guest UI show;
-- name (the full "Lua Pastry Studio — …" form) stays available for
-- detail views. Both are real editable Admin data (Settings →
-- Локации), these are just the starting values.
insert into locations (id, name, short_name, address, city, open_hours, phone, sort_order, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'Lua Pastry Studio — Достык', 'Достык', 'пр. Достык, 89', 'Алматы', '08:00–22:00', '+7 727 000 11 22', 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Lua Pastry Studio — Кок-Тобе', 'Кок-Тобе', 'ул. Достоевского, 1/1', 'Алматы', '09:00–21:00', '+7 727 000 33 44', 2, true)
on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, address = excluded.address, sort_order = excluded.sort_order, is_active = excluded.is_active;

-- ---- Categories ------------------------------------------------------------
insert into product_categories (id, name, slug, sort_order, active) values
  ('20000000-0000-0000-0000-000000000001', '{"ru":"Кофе","kk":"Кофе","en":"Coffee"}', 'coffee', 1, true),
  ('20000000-0000-0000-0000-000000000004', '{"ru":"Чай","kk":"Шай","en":"Tea"}', 'tea', 2, true),
  ('20000000-0000-0000-0000-000000000002', '{"ru":"Выпечка","kk":"Нан өнімдері","en":"Pastry"}', 'pastry', 3, true),
  ('20000000-0000-0000-0000-000000000003', '{"ru":"Десерты","kk":"Десерттер","en":"Desserts"}', 'desserts', 4, true),
  ('20000000-0000-0000-0000-000000000005', '{"ru":"Сезонное","kk":"Маусымдық","en":"Seasonal"}', 'seasonal', 5, true)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, sort_order = excluded.sort_order;

-- ---- Products (prices in KZT minor units: 1 ₸ = 100 minor units) -----
insert into products (id, category_id, name, description, price_minor_units, allergens, is_seasonal, is_new, is_must_try, active) values
  -- Coffee
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '{"ru":"Эспрессо","kk":"Эспрессо","en":"Espresso"}', '{"ru":"Классический двойной эспрессо из сезонного бленда."}', 120000, '{}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '{"ru":"Капучино","kk":"Капучино","en":"Cappuccino"}', '{"ru":"Классика, с которой день становится лучше."}', 190000, '{milk}', false, false, true, true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '{"ru":"Латте","kk":"Латте","en":"Latte"}', '{"ru":"Мягкий кофе с молоком, наш самый популярный выбор."}', 210000, '{milk}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', '{"ru":"Флэт уайт","kk":"Флэт уайт","en":"Flat white"}', '{"ru":"Двойной эспрессо и тонкий слой микропены."}', 220000, '{milk}', false, false, false, true),
  -- Tea
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', '{"ru":"Чай улун","kk":"Улун шайы","en":"Oolong tea"}', '{"ru":"Листовой улун, мягкий и цветочный."}', 150000, '{}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', '{"ru":"Чай каркаде","kk":"Каркаде шайы","en":"Hibiscus tea"}', '{"ru":"Терпкий каркаде, подаётся горячим или со льдом."}', 140000, '{}', false, false, false, true),
  -- Pastry
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '{"ru":"Круассан миндальный","kk":"Бадам круассаны","en":"Almond croissant"}', '{"ru":"Слоёное тесто, миндальный крем и хрустящая корочка."}', 270000, '{gluten,nuts,milk,egg}', false, false, true, true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '{"ru":"Круассан классический","kk":"Классикалық круассан","en":"Classic croissant"}', '{"ru":"Французский рецепт, 27 слоёв масляного теста."}', 220000, '{gluten,milk,egg}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', '{"ru":"Синнабон","kk":"Синнабон","en":"Cinnamon roll"}', '{"ru":"Тёплая булочка с корицей и сливочной глазурью."}', 240000, '{gluten,milk,egg}', false, true, false, true),
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000002', '{"ru":"Багет с сыром и прошутто","kk":"Ірімшік пен прошуттосы бар багет","en":"Cheese and prosciutto baguette"}', '{"ru":"Хрустящий багет, выдержанный сыр, прошутто."}', 260000, '{gluten,milk}', false, false, false, true),
  -- Desserts
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', '{"ru":"Мильфей","kk":"Мильфей","en":"Mille-feuille"}', '{"ru":"Хрустящие слои теста и ванильный заварной крем."}', 320000, '{gluten,milk,egg}', false, true, false, true),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', '{"ru":"Тарт с малиной","kk":"Таңқурай тарты","en":"Raspberry tart"}', '{"ru":"Песочная основа, миндальный крем и свежая малина."}', 340000, '{gluten,nuts,milk,egg}', true, false, false, true),
  ('30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000003', '{"ru":"Чизкейк Нью-Йорк","kk":"Нью-Йорк чизкейкі","en":"New York cheesecake"}', '{"ru":"Классический плотный чизкейк на песочной основе."}', 330000, '{gluten,milk,egg}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', '{"ru":"Десерт «Маленький принц»","kk":"«Кіші ханзада» десерты","en":"“Le Petit Prince” dessert"}', '{"ru":"Шоколадный мусс, карамелизированный лесной орех и хрустящий пралине. Из коллекции The Book Collection."}', 350000, '{gluten,nuts,milk,egg}', false, false, true, true),
  ('30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000003', '{"ru":"Десерт «Грозовой перевал»","kk":"«Дауылды асу» десерты","en":"“Wuthering Heights” dessert"}', '{"ru":"Тёмный шоколад, вересковый мёд и морская соль. Из коллекции The Book Collection."}', 360000, '{gluten,milk,egg}', false, true, false, true),
  ('30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000003', '{"ru":"Десерт «Цветы для Элджернона»","kk":"«Элджернонға арналған гүлдер» десерты","en":"“Flowers for Algernon” dessert"}', '{"ru":"Лёгкий бисквит, лаванда и белый шоколад. Из коллекции The Book Collection."}', 340000, '{gluten,milk,egg}', false, false, false, true),
  ('30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000003', '{"ru":"Десерт «Властелин колец»","kk":"«Сақиналар әміршісі» десерты","en":"“The Lord of the Rings” dessert"}', '{"ru":"Медовый бисквит, карамель и жареный фундук. Из коллекции The Book Collection."}', 380000, '{gluten,nuts,milk,egg}', false, false, false, true),
  -- Seasonal
  ('30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000005', '{"ru":"Тыквенный латте","kk":"Асқабақты латте","en":"Pumpkin latte"}', '{"ru":"Латте с тыквенной специей и корицей."}', 230000, '{milk}', true, false, false, true),
  ('30000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000005', '{"ru":"Глинтвейн безалкогольный","kk":"Алкогольсіз глинтвейн","en":"Non-alcoholic mulled fruit drink"}', '{"ru":"Яблоко, апельсин и пряности, подаётся тёплым."}', 210000, '{}', true, false, false, true)
on conflict (id) do update set name = excluded.name, price_minor_units = excluded.price_minor_units, active = excluded.active;

-- Explicit within-category display order (Admin → Меню → drag/reorder
-- controls edit this going forward) — kept as a separate update rather
-- than a column on the insert above so the product list stays readable.
update products set sort_order = v.sort_order from (values
  ('30000000-0000-0000-0000-000000000001'::uuid, 1), ('30000000-0000-0000-0000-000000000002'::uuid, 2),
  ('30000000-0000-0000-0000-000000000003'::uuid, 3), ('30000000-0000-0000-0000-000000000009'::uuid, 4),
  ('30000000-0000-0000-0000-000000000010'::uuid, 1), ('30000000-0000-0000-0000-000000000011'::uuid, 2),
  ('30000000-0000-0000-0000-000000000004'::uuid, 1), ('30000000-0000-0000-0000-000000000005'::uuid, 2),
  ('30000000-0000-0000-0000-000000000012'::uuid, 3), ('30000000-0000-0000-0000-000000000013'::uuid, 4),
  ('30000000-0000-0000-0000-000000000006'::uuid, 1), ('30000000-0000-0000-0000-000000000007'::uuid, 2),
  ('30000000-0000-0000-0000-000000000014'::uuid, 3), ('30000000-0000-0000-0000-000000000008'::uuid, 4),
  ('30000000-0000-0000-0000-000000000015'::uuid, 5), ('30000000-0000-0000-0000-000000000016'::uuid, 6),
  ('30000000-0000-0000-0000-000000000017'::uuid, 7),
  ('30000000-0000-0000-0000-000000000018'::uuid, 1), ('30000000-0000-0000-0000-000000000019'::uuid, 2)
) as v(id, sort_order)
where products.id = v.id;

insert into product_availability (product_id, location_id, in_stock, daily_limit)
select p.id, l.id, true, null
from products p cross join locations l
on conflict (product_id, location_id) do update set in_stock = excluded.in_stock;

-- ---- Collections -----------------------------------------------------------
insert into collections (id, name, subtitle, description, active, sort_order, featured, starts_at, ends_at) values
  ('40000000-0000-0000-0000-000000000001', '{"ru":"The Book Collection","kk":"The Book Collection","en":"The Book Collection"}', '{"ru":"Десерты, вдохновлённые любимыми историями"}', '{"ru":"Десерты, вдохновлённые любимыми историями."}', true, 1, true, null, null),
  ('40000000-0000-0000-0000-000000000002', '{"ru":"Осенняя коллекция","kk":"Күз коллекциясы","en":"Autumn collection"}', '{"ru":"Сезонные вкусы: малина, тыква и пряности"}', '{"ru":"Сезонные вкусы: малина, орех, тыква и пряности."}', true, 2, true, '2026-09-01T00:00:00Z', '2026-11-30T23:59:59Z')
on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle;

insert into collection_products (collection_id, product_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000015'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000016'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000017'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000018'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000019')
on conflict do nothing;

-- ---- Loyalty program (singleton) ---------------------------------------
insert into loyalty_programs (id, is_active, earn_rate_per_currency_unit, points_rounding_strategy, min_order_amount_minor_units, birthday_bonus_points, points_expire_after_days, tiers)
values ('default', true, 0.05, 'round', 0, 1000, 365,
  '[{"name":"Lua","minLifetimePoints":0,"earnRateMultiplier":1},{"name":"Lua Gold","minLifetimePoints":20000,"earnRateMultiplier":1.25}]')
on conflict (id) do update set earn_rate_per_currency_unit = excluded.earn_rate_per_currency_unit;

-- ---- Rewards -----------------------------------------------------------
insert into rewards (id, title, linked_product_id, points_cost, is_active, per_customer_limit, per_customer_limit_window_days) values
  ('70000000-0000-0000-0000-000000000001', '{"ru":"Капучино","kk":"Капучино","en":"Cappuccino"}', '30000000-0000-0000-0000-000000000002', 1000, true, 1, 1),
  ('70000000-0000-0000-0000-000000000002', '{"ru":"Круассан","kk":"Круассан","en":"Croissant"}', '30000000-0000-0000-0000-000000000005', 1800, true, 1, 1),
  ('70000000-0000-0000-0000-000000000003', '{"ru":"Десерт «Маленький принц»","kk":"«Кіші ханзада» десерты","en":"“Le Petit Prince” dessert"}', '30000000-0000-0000-0000-000000000008', 2500, true, 1, 7),
  ('70000000-0000-0000-0000-000000000004', '{"ru":"Чизкейк Нью-Йорк","kk":"Нью-Йорк чизкейкі","en":"New York cheesecake"}', '30000000-0000-0000-0000-000000000014', 3000, true, 1, 7)
on conflict (id) do update set points_cost = excluded.points_cost, is_active = excluded.is_active;

-- ---- Demo staff accounts (LOCAL DEV ONLY — see docs/LOCAL-BACKEND.md) --
-- Every demo account keeps working with email+password exactly as
-- before (existing integration tests and docs rely on it) AND now also
-- has a staff-code + PIN (021_staff_pin_auth.sql) — the simplified
-- flow a brand-new employee created from Admin would actually use,
-- with no individual work email required. Both methods work for the
-- same row; see the staff_profiles_has_login_method check constraint.
-- Айгерим works both locations; Ерлан is Достык-only — one example of
-- each multi-/single-location staff member, per the product brief.
insert into staff_profiles (id, email, password_hash, display_name, role, location_id, staff_code, pin_hash, active) values
  ('50000000-0000-0000-0000-000000000001', 'aigerim@lua.dev', crypt('LuaStaff123!', gen_salt('bf', 10)), 'Айгерим', 'BARISTA', '10000000-0000-0000-0000-000000000001', 'AIGERIM', crypt('4821', gen_salt('bf', 10)), true),
  ('50000000-0000-0000-0000-000000000002', 'yerlan@lua.dev', crypt('LuaStaff123!', gen_salt('bf', 10)), 'Ерлан', 'SHIFT_MANAGER', '10000000-0000-0000-0000-000000000001', 'YERLAN', crypt('1932', gen_salt('bf', 10)), true),
  ('50000000-0000-0000-0000-000000000003', 'dana@lua.dev', crypt('LuaStaff123!', gen_salt('bf', 10)), 'Дана', 'ADMIN', '10000000-0000-0000-0000-000000000001', 'DANA01', crypt('5310', gen_salt('bf', 10)), true),
  -- The one seeded OWNER — see docs/ARCHITECTURE.md "Staff management &
  -- OWNER protection". No Admin-UI path can create, promote to, demote,
  -- deactivate, or otherwise touch this row; a future owner-handover
  -- flow is a deliberately separate, more heavily-guarded feature.
  ('50000000-0000-0000-0000-000000000004', 'marat@lua.dev', crypt('LuaStaff123!', gen_salt('bf', 10)), 'Марат', 'OWNER', '10000000-0000-0000-0000-000000000001', 'MARAT01', null, true)
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, staff_code = excluded.staff_code, pin_hash = excluded.pin_hash, email = excluded.email, password_hash = excluded.password_hash;

insert into staff_locations (staff_id, location_id) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002')
on conflict do nothing;

-- ---- Demo guest accounts (LOCAL DEV ONLY) --------------------------------
-- created_at is set explicitly (not left to default now()) so "В клубе
-- с …" on Admin's Customer Detail shows a real-looking join date instead
-- of always reading as "today", whatever day this seed happens to run.
insert into customer_profiles (id, email, password_hash, first_name, phone, birth_date, home_location_id, favorite_product_ids, marketing_opt_in, created_at) values
  ('60000000-0000-0000-0000-000000000001', 'nikolay@lua.dev', crypt('LuaGuest123!', gen_salt('bf', 10)), 'Николай', '+7 701 234 56 78', '1993-06-18', '10000000-0000-0000-0000-000000000001',
    array['30000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000008'::uuid], true, '2026-01-05T04:00:00Z'),
  ('60000000-0000-0000-0000-000000000002', 'aizhan@lua.dev', crypt('LuaGuest123!', gen_salt('bf', 10)), 'Айжан', '+7 707 555 12 34', null, '10000000-0000-0000-0000-000000000002', '{}', true, '2026-02-14T10:00:00Z')
on conflict (id) do update set first_name = excluded.first_name;

-- ---- Николай's loyalty ledger — sums to exactly 3288, same worked
-- example as the product brief. Timestamps are true UTC instants
-- (Asia/Almaty is UTC+5); the app renders them in the viewer's local
-- time, so no manual offset is needed here.
insert into loyalty_transactions (customer_id, type, points, reason, created_at, idempotency_key) values
  ('60000000-0000-0000-0000-000000000001', 'manual_adjustment', 3353, 'Перенос баллов из предыдущей программы лояльности при запуске Lua Club', '2026-01-05T04:05:00Z', 'seed:migration'),
  ('60000000-0000-0000-0000-000000000001', 'birthday_bonus', 1000, 'С днём рождения! Бонус Lua Club', '2026-06-18T04:00:00Z', 'seed:birthday')
on conflict (idempotency_key) do nothing;

-- Historical completed orders (already earned) for Николай, seeded
-- directly as COMPLETED so Guest Order History has real history beyond
-- the live demo order below.
insert into orders (id, external_order_code, customer_id, location_id, staff_user_id, subtotal_minor_units, total_minor_units, status, points_earned, created_at, completed_at) values
  ('80000000-0000-0000-0000-000000000001', 'LUA-0320', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 530000, 530000, 'COMPLETED', 265, '2026-03-20T05:12:00Z', '2026-03-20T05:15:00Z'),
  ('80000000-0000-0000-0000-000000000002', 'LUA-0530', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 680000, 680000, 'COMPLETED', 340, '2026-05-30T12:40:00Z', '2026-05-30T12:43:00Z'),
  ('80000000-0000-0000-0000-000000000003', 'LUA-0810', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 850000, 850000, 'COMPLETED', 425, '2026-08-10T07:05:00Z', '2026-08-10T07:08:00Z')
on conflict (id) do update set status = excluded.status, external_order_code = excluded.external_order_code;

insert into order_items (order_id, product_id, product_name, quantity, unit_price_minor_units, line_total_minor_units) values
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Латте', 1, 210000, 210000),
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', 'Мильфей', 1, 320000, 320000),
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Эспрессо', 1, 120000, 120000),
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 'Тарт с малиной', 1, 340000, 340000),
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', 'Круассан классический', 1, 220000, 220000),
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', 'Тарт с малиной', 1, 340000, 340000),
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', 'Мильфей', 1, 320000, 320000),
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Капучино', 1, 190000, 190000)
on conflict do nothing;

insert into loyalty_transactions (customer_id, type, points, order_id, reason, created_at, idempotency_key) values
  ('60000000-0000-0000-0000-000000000001', 'earn', 265, '80000000-0000-0000-0000-000000000001', 'Заказ LUA-0320', '2026-03-20T05:15:00Z', 'earn:80000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', 'earn', 340, '80000000-0000-0000-0000-000000000002', 'Заказ LUA-0530', '2026-05-30T12:43:00Z', 'earn:80000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000001', 'earn', 425, '80000000-0000-0000-0000-000000000003', 'Заказ LUA-0810', '2026-08-10T07:08:00Z', 'earn:80000000-0000-0000-0000-000000000003')
on conflict (idempotency_key) do nothing;

-- A past reward redemption, already fulfilled, for Guest history depth.
insert into reward_redemptions (id, reward_id, customer_id, points_cost, status, fulfilled_by_staff_id, fulfilled_at, created_at, expires_at) values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 2500, 'FULFILLED', '50000000-0000-0000-0000-000000000001', '2026-07-22T09:31:00Z', '2026-07-22T09:29:00Z', '2026-07-22T09:31:00Z')
on conflict (id) do update set status = excluded.status;

insert into loyalty_transactions (customer_id, type, points, reward_redemption_id, performed_by_staff_id, reason, created_at, idempotency_key) values
  ('60000000-0000-0000-0000-000000000001', 'redeem', -2500, '71000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Списание: Десерт «Маленький принц»', '2026-07-22T09:31:00Z', 'redemption:71000000-0000-0000-0000-000000000001')
on conflict (idempotency_key) do nothing;

update reward_redemptions set loyalty_transaction_id = (
  select id from loyalty_transactions where idempotency_key = 'redemption:71000000-0000-0000-0000-000000000001'
) where id = '71000000-0000-0000-0000-000000000001';

-- The Sep-14 example order from the product brief (8 100 ₸ → +405) —
-- also seeded as already COMPLETED so it shows in history immediately.
insert into orders (id, external_order_code, customer_id, location_id, staff_user_id, subtotal_minor_units, total_minor_units, status, points_earned, created_at, completed_at) values
  ('80000000-0000-0000-0000-000000000004', 'LUA-0914', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 810000, 810000, 'COMPLETED', 405, '2026-09-14T11:42:00Z', '2026-09-14T11:45:00Z')
on conflict (id) do update set status = excluded.status, external_order_code = excluded.external_order_code;

insert into order_items (order_id, product_id, product_name, quantity, unit_price_minor_units, line_total_minor_units) values
  ('80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'Капучино', 1, 190000, 190000),
  ('80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Круассан миндальный', 1, 270000, 270000),
  ('80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000008', 'Десерт «Маленький принц»', 1, 350000, 350000)
on conflict do nothing;

insert into loyalty_transactions (customer_id, type, points, order_id, reason, created_at, idempotency_key) values
  ('60000000-0000-0000-0000-000000000001', 'earn', 405, '80000000-0000-0000-0000-000000000004', 'Заказ LUA-0914', '2026-09-14T11:45:00Z', 'earn:80000000-0000-0000-0000-000000000004')
on conflict (idempotency_key) do nothing;

-- ---- Live demo order for the Scenario-A smoke test/E2E (LUA-1001) -----
-- Paid at the till, not yet linked to any Lua Club member. Staff scans
-- the guest's identity QR and confirms this order to attach it and
-- award points. Re-running this seed leaves an already-COMPLETED
-- LUA-1001 alone rather than resetting it — use `pnpm db:reset` (or
-- delete the row) to get a fresh PAID_UNASSIGNED one for another test run.
insert into orders (id, external_order_code, location_id, subtotal_minor_units, total_minor_units, status) values
  ('80000000-0000-0000-0000-000000000099', 'LUA-1001', '10000000-0000-0000-0000-000000000001', 810000, 810000, 'PAID_UNASSIGNED')
on conflict (external_order_code) do nothing;

insert into order_items (order_id, product_id, product_name, quantity, unit_price_minor_units, line_total_minor_units)
select '80000000-0000-0000-0000-000000000099', id, name ->> 'ru', 1, price_minor_units, price_minor_units
from products where id in (
  '30000000-0000-0000-0000-000000000002', -- Капучино
  '30000000-0000-0000-0000-000000000004', -- Круассан миндальный
  '30000000-0000-0000-0000-000000000008'  -- Маленький принц
)
and not exists (select 1 from order_items where order_id = '80000000-0000-0000-0000-000000000099');

-- ---- Demo audit trail ---------------------------------------------------
-- Without this, Admin's Journal (Audit Log) screen is empty on every
-- fresh `pnpm db:reset`/`pnpm db:wipe` until a real admin action happens
-- — a blank "Записей не найдено" screen isn't a realistic state to show
-- during a presentation. These mirror actions the CMS/staff-management
-- routes really write (packages/server/src/audit.ts), just backdated
-- instead of generated live, spread across the same history the seeded
-- orders/collections above already imply.
insert into audit_logs (id, action, actor_staff_id, target_type, target_id, summary, metadata, created_at) values
  ('90000000-0000-0000-0000-000000000001', 'catalog.collection.created', '50000000-0000-0000-0000-000000000003', 'collection', '40000000-0000-0000-0000-000000000002', 'Создана коллекция «Осенняя коллекция»', null, '2026-08-25T08:10:00Z'),
  ('90000000-0000-0000-0000-000000000002', 'catalog.product.created', '50000000-0000-0000-0000-000000000003', 'product', '30000000-0000-0000-0000-000000000018', 'Создан товар «Тыквенный латте»', '{"priceMinorUnits": 230000}', '2026-08-25T08:14:00Z'),
  ('90000000-0000-0000-0000-000000000003', 'staff.created', '50000000-0000-0000-0000-000000000004', 'staff', '50000000-0000-0000-0000-000000000002', 'Создан сотрудник «Ерлан» (SHIFT_MANAGER)', null, '2026-05-02T06:00:00Z'),
  ('90000000-0000-0000-0000-000000000004', 'catalog.reward.updated', '50000000-0000-0000-0000-000000000003', 'reward', '70000000-0000-0000-0000-000000000004', 'Обновлена награда «Чизкейк Нью-Йорк»', '{"pointsCost": 3000}', '2026-07-30T13:22:00Z'),
  ('90000000-0000-0000-0000-000000000005', 'loyalty.manual_adjustment', '50000000-0000-0000-0000-000000000003', 'customer', '60000000-0000-0000-0000-000000000002', 'Начислено 200 баллов вручную: извинение за задержку заказа', '{"points": 200}', '2026-08-02T09:40:00Z'),
  ('90000000-0000-0000-0000-000000000006', 'customer.birthday_updated', '50000000-0000-0000-0000-000000000003', 'customer', '60000000-0000-0000-0000-000000000001', 'Обновлена дата рождения клиента', null, '2026-09-01T11:05:00Z'),
  ('90000000-0000-0000-0000-000000000007', 'reward.redemption.fulfilled', '50000000-0000-0000-0000-000000000001', 'reward_redemption', '71000000-0000-0000-0000-000000000001', 'Выдана награда «Десерт «Маленький принц»»', '{"pointsCost": 2500}', '2026-07-22T09:31:00Z'),
  ('90000000-0000-0000-0000-000000000008', 'catalog.availability.updated', '50000000-0000-0000-0000-000000000001', 'product', '30000000-0000-0000-0000-000000000004', 'Обновлена доступность товара', '{"inStock": false}', '2026-09-15T15:48:00Z')
on conflict (id) do nothing;
