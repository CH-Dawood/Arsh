// Applies the project's migrations to an in-memory Postgres 17 (PGlite) with Supabase stand-ins,
// then exercises security and checkout behaviour. Usage: node test.mjs <path-to-supabase-dir>
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const db = new PGlite({ extensions: { pg_trgm } })

// Minimal Supabase environment: API roles, auth.uid(), storage tables, default grants.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage; create schema extensions;
  grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}',
    email_confirmed_at timestamptz default now(), created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`)

for (const f of readdirSync(join(dir, 'migrations')).sort()) {
  try { await db.exec(readFileSync(join(dir, 'migrations', f), 'utf8')) }
  catch (e) { console.error(`MIGRATION FAILED: ${f}\n${e.message}`); process.exit(1) }
  console.log('applied', f)
}
await db.exec(readFileSync(join(dir, 'seed.sql'), 'utf8'))
console.log('applied seed.sql')
await db.exec(`grant all on all tables in schema public to anon, authenticated, service_role;`)

let passed = 0, failed = 0
const check = (name, ok, extra = '') => {
  ok ? passed++ : failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`)
}
// Runs fn as an API role (optionally as a signed-in user), rolling back afterwards unless keep=true.
async function as(role, uid, fn, keep = false) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? ''])
    await tx.exec(`set local role ${role}`)
    const out = await fn(tx)
    if (!keep) await tx.rollback()
    return out
  })
}
async function fails(name, fn, expect) {
  try { await fn(); check(name, false, 'expected an error') }
  catch (e) { check(name, !expect || e.message.includes(expect), e.message.split('\n')[0]) }
}
const one = async (q, p) => (await db.query(q, p)).rows[0]

// --- Users ---------------------------------------------------------------
const admin = (await one(`insert into auth.users (email, raw_user_meta_data) values ('a@x.pk', '{"full_name":"Admin"}') returning id`)).id
const alice = (await one(`insert into auth.users (email, raw_user_meta_data) values ('alice@x.pk', '{"full_name":"Alice","phone":"+92 300 1234567"}') returning id`)).id
const bob = (await one(`insert into auth.users (email) values ('bob@x.pk') returning id`)).id
check('profile auto-created with normalized phone', (await one(`select phone from profiles where id=$1`, [alice])).phone === '03001234567')
// The store owner is added to the allowlist once, in the SQL editor (the migration carries over existing admins).
await db.query(`insert into admin_access (slot, email, user_id, linked_at) values (1, 'a@x.pk', $1, now())`, [admin])
await db.query(`select private.sync_admin_roles()`)
check('owner profile shows admin role', (await one(`select role from profiles where id=$1`, [admin])).role === 'admin')

await fails('customer cannot promote self to admin', () =>
  as('authenticated', alice, (tx) => tx.query(`update profiles set role='admin' where id=$1`, [alice])), 'FORBIDDEN')
check('customer can update own name', (await as('authenticated', alice, (tx) =>
  tx.query(`update profiles set full_name='Alice K' where id=$1`, [alice]))).affectedRows === 1)
check('customer cannot see other profiles', (await as('authenticated', alice, (tx) =>
  tx.query(`select * from profiles`))).rows.length === 1)

// --- Catalogue (as admin) ------------------------------------------------
const ids = await as('authenticated', admin, async (tx) => {
  const cat = (await tx.query(`select id from categories where slug='2-piece-suits'`)).rows[0].id
  const brand = (await tx.query(`insert into brands (name, slug, is_featured) values ('Demo Brand','demo-brand',true) returning id`)).rows[0].id
  const p = (await tx.query(`insert into products (name, slug, category_id, brand_id, base_price, compare_at_price, fabric, is_new_arrival)
      values ('Embroidered Lawn Suit','embroidered-lawn-suit',$1,$2,8500,10000,'Lawn, chiffon dupatta',true) returning id`, [cat, brand])).rows[0].id
  const p2 = (await tx.query(`insert into products (name, slug, category_id, base_price, is_active)
      values ('Hidden Draft','hidden-draft',$1,5000,false) returning id`, [cat])).rows[0].id
  const m = (await tx.query(`select id from sizes where code='M'`)).rows[0].id
  const l = (await tx.query(`select id from sizes where code='L'`)).rows[0].id
  const vM = (await tx.query(`insert into product_variants (product_id, size_id, sku, stock) values ($1,$2,'ELS-M',3) returning id`, [p, m])).rows[0].id
  const vL = (await tx.query(`insert into product_variants (product_id, size_id, sku, stock, price_override) values ($1,$2,'ELS-L',5,9000) returning id`, [p, l])).rows[0].id
  await tx.query(`insert into product_images (product_id, storage_path, alt) values ($1,'products/els-1.webp','Front view')`, [p])
  await tx.query(`insert into coupons (code, discount_type, value, min_order_amount, per_customer_limit) values ('EID10','percent',10,5000,1)`)
  await tx.query(`insert into coupons (code, discount_type, value, expires_at) values ('OLD','fixed',500, now() - interval '1 day')`)
  return { p, p2, vM, vL }
}, true)
check('admin writes are audited', Number((await one(`select count(*) c from admin_audit_log`)).c) >= 5)
check('initial stock logged in ledger', Number((await one(`select coalesce(sum(delta),0) s from inventory_movements`)).s) === 8)

// --- Public access -------------------------------------------------------
const anonProducts = (await as('anon', null, (tx) => tx.query(`select slug from products`))).rows
check('anon sees only active products', anonProducts.length === 1 && anonProducts[0].slug === 'embroidered-lawn-suit')
check('anon cannot read coupons', (await as('anon', null, (tx) => tx.query(`select * from coupons`))).rows.length === 0)
check('anon cannot read orders', (await as('anon', null, (tx) => tx.query(`select * from orders`))).rows.length === 0)
await fails('anon cannot insert products', () => as('anon', null, (tx) =>
  tx.query(`insert into products (name, slug, category_id, base_price) select 'X','x',id,1 from categories limit 1`)), 'row-level security')
await fails('customer cannot edit prices', async () => {
  const r = await as('authenticated', alice, (tx) => tx.query(`update products set base_price=1`))
  if (r.affectedRows === 0) throw new Error('no rows updated (blocked by RLS)')
})
await fails('anon cannot call place_order directly', () => as('anon', null, (tx) =>
  tx.query(`select * from place_order('[]'::jsonb, '{}'::jsonb, 'cod')`)), 'permission denied')
await fails('customer cannot call place_order directly', () => as('authenticated', alice, (tx) =>
  tx.query(`select * from place_order('[]'::jsonb, '{}'::jsonb, 'cod')`)), 'permission denied')
await fails('customer cannot read dashboard stats', () => as('authenticated', alice, (tx) =>
  tx.query(`select admin_dashboard_stats()`)), 'FORBIDDEN')
check('settings readable publicly', (await as('anon', null, (tx) => tx.query(`select free_shipping_threshold from store_settings`))).rows[0]?.free_shipping_threshold === 12000)
await fails('customer cannot change shipping threshold', async () => {
  const r = await as('authenticated', alice, (tx) => tx.query(`update store_settings set free_shipping_threshold=0`))
  if (r.affectedRows === 0) throw new Error('no rows updated (blocked by RLS)')
})

// --- Search --------------------------------------------------------------
const s = async (q) => (await as('anon', null, (tx) => tx.query(`select slug from search_products($1)`, [q]))).rows.map((r) => r.slug)
check('search by name prefix', (await s('embroid')).includes('embroidered-lawn-suit'))
check('search by fabric', (await s('chiffon')).includes('embroidered-lawn-suit'))
check('search by brand name', (await s('demo brand')).includes('embroidered-lawn-suit'))
check('search by category name', (await s('2 piece')).includes('embroidered-lawn-suit'))
check('search hides inactive products', !(await s('hidden')).includes('hidden-draft'))
check('search handles junk safely', (await s(`'; drop table products; --`)).length >= 0)

// --- Checkout ------------------------------------------------------------
const customer = { full_name: 'Alice Khan', phone: '0300-1234567', email: 'Alice@X.pk', city: 'Lahore', address_line: 'House 12, Street 4, DHA Phase 5' }
const items = (list) => JSON.stringify(list)
const svc = (q, p) => as('service_role', null, (tx) => tx.query(q, p), true)

const quote = (await svc(`select quote_cart($1::jsonb, 'eid10') q`, [items([{ variant_id: ids.vM, quantity: 1 }, { variant_id: ids.vL, quantity: 1 }])])).rows[0].q
check('quote prices from DB (8500 + 9000)', quote.subtotal === 17500, JSON.stringify({ s: quote.subtotal }))
check('quote applies 10% coupon', quote.discount === 1750)
check('quote: free shipping at >= 12,000', quote.shipping === 0 && quote.total === 15750)
const small = (await svc(`select quote_cart($1::jsonb) q`, [items([{ variant_id: ids.vM, quantity: 1 }])])).rows[0].q
check('quote: shipping fee below threshold', small.shipping === 250 && small.total === 8750)
const expired = (await svc(`select quote_cart($1::jsonb, 'OLD') q`, [items([{ variant_id: ids.vM, quantity: 1 }])])).rows[0].q
check('quote reports expired coupon', expired.coupon.error === 'COUPON_INVALID' && expired.discount === 0)

await fails('oversell is rejected', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod')`,
  [items([{ variant_id: ids.vM, quantity: 4 }]), JSON.stringify(customer)]), 'ITEM_UNAVAILABLE')
await fails('bank transfer disabled until configured', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'bank_transfer')`,
  [items([{ variant_id: ids.vM, quantity: 1 }]), JSON.stringify(customer)]), 'PAYMENT_METHOD_UNAVAILABLE')
await fails('wallet gateways unavailable until integrated', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'easypaisa')`,
  [items([{ variant_id: ids.vM, quantity: 1 }]), JSON.stringify(customer)]), 'PAYMENT_METHOD_UNAVAILABLE')
await fails('invalid phone rejected', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod')`,
  [items([{ variant_id: ids.vM, quantity: 1 }]), JSON.stringify({ ...customer, phone: '12345' })]), 'INVALID_PHONE')
await fails('quantity above 10 rejected', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod')`,
  [items([{ variant_id: ids.vL, quantity: 11 }]), JSON.stringify(customer)]), 'ITEM_UNAVAILABLE')

await db.query(`insert into cart_items (user_id, variant_id, quantity) values ($1,$2,1)`, [alice, ids.vM])
const order = (await svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod', 'EID10', $3)`,
  [items([{ variant_id: ids.vM, quantity: 2 }, { variant_id: ids.vL, quantity: 1 }]), JSON.stringify(customer), alice])).rows[0]
check('order placed with server total', order.total === 23400, `${order.order_number} total=${order.total}`) // 17000+9000=26000 -10% = 23400, free ship
check('order number format', /^ORD-\d{6}-[0-9A-F]{6}$/.test(order.order_number))
check('stock decremented', (await one(`select stock from product_variants where id=$1`, [ids.vM])).stock === 1)
check('ledger has order movements', Number((await one(`select count(*) c from inventory_movements where order_id=$1 and reason='order'`, [order.order_id])).c) === 2)
check('ordered items removed from saved cart', Number((await one(`select count(*) c from cart_items where user_id=$1`, [alice])).c) === 0)
check('coupon usage counted', (await one(`select times_used from coupons where code='EID10'`)).times_used === 1)
check('email stored lowercase', (await one(`select email from orders where id=$1`, [order.order_id])).email === 'alice@x.pk')
check('payment row pending', (await one(`select status from payments where order_id=$1`, [order.order_id])).status === 'pending')
await fails('per-customer coupon limit enforced', () => svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod', 'EID10')`,
  [items([{ variant_id: ids.vL, quantity: 1 }]), JSON.stringify(customer)]), 'COUPON_LIMIT_REACHED')

check('customer reads own order', (await as('authenticated', alice, (tx) => tx.query(`select * from orders`))).rows.length === 1)
check('other customer cannot read it', (await as('authenticated', bob, (tx) => tx.query(`select * from orders`))).rows.length === 0)
check('other customer cannot read its items', (await as('authenticated', bob, (tx) => tx.query(`select * from order_items`))).rows.length === 0)
await fails('customer cannot change order status', async () => {
  const r = await as('authenticated', alice, (tx) => tx.query(`update orders set status='delivered', payment_status='paid'`))
  if (r.affectedRows === 0) throw new Error('no rows updated (blocked by RLS)')
})

const tracked = (await svc(`select track_order($1, '+923001234567') t`, [order.order_number.toLowerCase()])).rows[0].t
check('tracking works with number + phone', tracked?.status === 'pending' && tracked.items.length === 2)
check('tracking with wrong phone returns nothing', (await svc(`select track_order($1, '03119999999') t`, [order.order_number])).rows[0].t === null)

// --- Admin order lifecycle ----------------------------------------------
await fails('pending order cannot be marked returned', () => as('authenticated', admin, (tx) =>
  tx.query(`update orders set status='returned' where id=$1`, [order.order_id])), 'INVALID_STATUS_TRANSITION')
await as('authenticated', admin, (tx) => tx.query(`update orders set status='cancelled', cancel_reason='Customer request' where id=$1`, [order.order_id]), true)
check('cancel restocks variants', (await one(`select stock from product_variants where id=$1`, [ids.vM])).stock === 3
  && (await one(`select stock from product_variants where id=$1`, [ids.vL])).stock === 5)
check('cancel releases coupon', (await one(`select times_used from coupons where code='EID10'`)).times_used === 0)
check('status history recorded', Number((await one(`select count(*) c from order_status_history where order_id=$1`, [order.order_id])).c) === 2)
await fails('cancelled order cannot be revived', () => as('authenticated', admin, (tx) =>
  tx.query(`update orders set status='confirmed' where id=$1`, [order.order_id])), 'INVALID_STATUS_TRANSITION')
check('stock never double-restocked', (await one(`select coalesce(sum(delta),0) s from inventory_movements where variant_id=$1`, [ids.vM])).s == 3)

const stats = (await as('authenticated', admin, (tx) => tx.query(`select admin_dashboard_stats() s`))).rows[0].s
check('admin dashboard stats', stats.total_orders === 1 && stats.sales_by_day.length === 30 && stats.status_counts.cancelled === 1)

// --- Admin operations (status control, notifications, inventory, reports) -----
const asAdmin = (q, p) => as('authenticated', admin, (tx) => tx.query(q, p), true)
const rows = async (q, p) => (await db.query(q, p)).rows

await db.query(`update notification_settings set enabled = true`)
await db.query(`update notification_settings set events = jsonb_set(events, '{order_processing,enabled}', 'false')`)

const place = async (cust, list) => (await svc(`select * from place_order($1::jsonb, $2::jsonb, 'cod')`,
  [items(list), JSON.stringify(cust)])).rows[0]
const optIn = { ...customer, whatsapp_opt_in: true }
const orderA = await place(optIn, [{ variant_id: ids.vL, quantity: 1 }])
const orderB = await place({ ...customer, full_name: 'Bilal Ahmed', phone: '03211234567' }, [{ variant_id: ids.vL, quantity: 1 }])

check('opted-in order queues "order placed" WhatsApp', (await rows(`select phone, event, status from notification_logs where order_id=$1`, [orderA.order_id]))
  .some((r) => r.event === 'order_placed' && r.phone === '923001234567' && r.status === 'pending'))
check('order without opt-in queues nothing', (await rows(`select 1 from notification_logs where order_id=$1`, [orderB.order_id])).length === 0)

await fails('customer cannot use admin_update_order_status', () => as('authenticated', alice, (tx) =>
  tx.query(`select * from admin_update_order_status($1, 'confirmed')`, [orderA.order_id])), 'FORBIDDEN')
await fails('anon cannot use admin_update_order_status', () => as('anon', null, (tx) =>
  tx.query(`select * from admin_update_order_status($1, 'confirmed')`, [orderA.order_id])), 'permission denied')

await asAdmin(`select * from admin_update_order_status($1, 'confirmed', 'Called customer, address verified')`, [orderA.order_id])
const histA = await rows(`select to_status, note, actor_id from order_status_history where order_id=$1 order by id`, [orderA.order_id])
check('status change records note and admin', histA.at(-1).to_status === 'confirmed' && histA.at(-1).note === 'Called customer, address verified' && histA.at(-1).actor_id === admin)
check('other customer\'s order unchanged', (await one(`select status from orders where id=$1`, [orderB.order_id])).status === 'pending')
check('"confirmed" WhatsApp queued', (await rows(`select 1 from notification_logs where order_id=$1 and event='order_confirmed'`, [orderA.order_id])).length === 1)

await asAdmin(`select * from admin_update_order_status($1, 'confirmed', 'saved again')`, [orderA.order_id])
check('saving the same status adds no history', (await rows(`select 1 from order_status_history where order_id=$1`, [orderA.order_id])).length === histA.length)

await asAdmin(`select * from admin_update_order_status($1, 'processing')`, [orderA.order_id])
check('disabled event ("being prepared") is not queued', (await rows(`select 1 from notification_logs where order_id=$1 and event='order_processing'`, [orderA.order_id])).length === 0)

await asAdmin(`select * from admin_update_order_status($1, 'shipped', null, 'TCS', 'TCS123456')`, [orderA.order_id])
const shipped = await one(`select courier, tracking_number from orders where id=$1`, [orderA.order_id])
const shipLog = await one(`select variables from notification_logs where order_id=$1 and event='order_shipped'`, [orderA.order_id])
check('shipping saves courier + tracking', shipped.courier === 'TCS' && shipped.tracking_number === 'TCS123456')
check('"shipped" WhatsApp carries courier + tracking', JSON.stringify(shipLog?.variables) === JSON.stringify([orderA.order_number, 'TCS', 'TCS123456']))

await asAdmin(`select * from admin_update_order_status($1, 'processing', 'Wrong parcel, re-packing')`, [orderA.order_id])
await asAdmin(`select * from admin_update_order_status($1, 'shipped')`, [orderA.order_id])
check('re-entering a status never re-sends WhatsApp', (await rows(`select 1 from notification_logs where order_id=$1 and event='order_shipped'`, [orderA.order_id])).length === 1)

await asAdmin(`select * from admin_update_order_status($1, 'delivered')`, [orderA.order_id])
check('delivered time recorded', (await one(`select delivered_at from orders where id=$1`, [orderA.order_id])).delivered_at !== null)
await fails('delivered order cannot be cancelled (use return)', () => as('authenticated', admin, (tx) =>
  tx.query(`select * from admin_update_order_status($1, 'cancelled')`, [orderA.order_id])), 'INVALID_STATUS_TRANSITION')
check('tracking shows delivery time', (await svc(`select track_order($1, '03001234567') t`, [orderA.order_number])).rows[0].t.delivered_at !== null)

const claimed = (await svc(`select id from claim_notifications(null, 50)`)).rows
check('sender claims queued messages', claimed.length === 4) // placed, confirmed, shipped, delivered
check('a second sender gets nothing (no double send)', (await svc(`select id from claim_notifications(null, 50)`)).rows.length === 0)
await db.query(`update notification_logs set status='failed', error='test' where id=$1`, [claimed[0].id])
check('failed message can be retried', (await svc(`select id from claim_notifications($1::uuid[], 5, true)`, [[claimed[0].id]])).rows.length === 1)
check('anon cannot read notification logs', (await as('anon', null, (tx) => tx.query(`select * from notification_logs`))).rows.length === 0)
check('customer cannot read notification logs', (await as('authenticated', alice, (tx) => tx.query(`select * from notification_logs`))).rows.length === 0)
await fails('customer cannot claim notifications', () => as('authenticated', alice, (tx) => tx.query(`select * from claim_notifications()`)), 'permission denied')

const before = (await one(`select stock from product_variants where id=$1`, [ids.vM])).stock
check('admin sets stock with a note', (await asAdmin(`select admin_adjust_stock($1, 'set', 12, 'Stock count') s`, [ids.vM])).rows[0].s === 12)
check('admin adds stock', (await asAdmin(`select admin_adjust_stock($1, 'add', -2, 'Damaged') s`, [ids.vM])).rows[0].s === 10)
const lastMove = await one(`select delta, note, actor_id from inventory_movements where variant_id=$1 order by id desc limit 1`, [ids.vM])
check('stock ledger keeps note + admin', lastMove.delta === -2 && lastMove.note === 'Damaged' && lastMove.actor_id === admin && before !== 12)
await fails('stock cannot go negative', () => as('authenticated', admin, (tx) => tx.query(`select admin_adjust_stock($1, 'add', -99)`, [ids.vM])), 'check')
await fails('customer cannot adjust stock', () => as('authenticated', alice, (tx) => tx.query(`select admin_adjust_stock($1, 'set', 99)`, [ids.vM])), 'FORBIDDEN')

await asAdmin(`select admin_set_payment_status($1, 'paid')`, [orderA.order_id])
const report = (await asAdmin(`select admin_sales_report(current_date - 1, current_date + 1, 'day') r`)).rows[0].r
check('report: net revenue counts only paid orders', report.totals.net_revenue === orderA.total)
check('report: gross excludes cancelled orders', report.totals.gross_sales === 9000 * 2 && report.totals.cancelled_orders === 1)
check('report: best products and categories', report.best_products.length > 0 && report.best_categories[0].name === '2 Piece Suits')
await fails('customer cannot read sales report', () => as('authenticated', alice, (tx) => tx.query(`select admin_sales_report(current_date, current_date)`)), 'FORBIDDEN')

const custs = (await asAdmin(`select * from admin_customers(null, 50, 0)`)).rows
const aliceRow = custs.find((c) => c.phone === '03001234567')
check('customers grouped by phone with spend', aliceRow && Number(aliceRow.orders_count) === 2 && Number(aliceRow.total_spent) === orderA.total)
check('customer search by name', (await asAdmin(`select * from admin_customers('bilal')`)).rows.length === 1)
check('registered customers without orders listed', custs.some((c) => c.email === 'bob@x.pk' && Number(c.orders_count) === 0))

// Product editor (one transaction)
const cat2 = (await one(`select id from categories where slug='printed-suits'`)).id
const sz = Object.fromEntries((await rows(`select code, id from sizes`)).map((r) => [r.code, r.id]))
const savedId = (await asAdmin(`select admin_save_product($1::jsonb, $2::jsonb, $3::jsonb) id`, [
  JSON.stringify({ name: 'Admin Test Suit', slug: 'admin-test-suit', category_id: cat2, base_price: 5000, compare_at_price: 6000, is_featured: true }),
  JSON.stringify([{ storage_path: 'products/a.webp', alt: 'Front' }, { storage_path: 'products/b.webp', alt: 'Back' }]),
  JSON.stringify([{ size_id: sz.S, sku: 'ATS-S', stock: 4 }, { size_id: sz.M, sku: 'ATS-M', stock: 6 }]),
])).rows[0].id
check('product editor creates product + images + variants', (await rows(`select 1 from product_variants where product_id=$1`, [savedId])).length === 2
  && (await rows(`select 1 from product_images where product_id=$1`, [savedId])).length === 2)
const vS = (await one(`select id from product_variants where sku='ATS-S'`)).id
const imgB = (await one(`select id from product_images where storage_path='products/b.webp'`)).id
await asAdmin(`select admin_save_product($1::jsonb, $2::jsonb, $3::jsonb)`, [
  JSON.stringify({ id: savedId, name: 'Admin Test Suit II', slug: 'admin-test-suit', category_id: cat2, base_price: 4500 }),
  JSON.stringify([{ id: imgB, alt: 'Back now first' }]),
  JSON.stringify([{ id: vS, size_id: sz.S, sku: 'ATS-S', stock: 9 }]),
])
const editedImgs = await rows(`select storage_path, sort_order from product_images where product_id=$1`, [savedId])
check('editor reorders/removes images', editedImgs.length === 1 && editedImgs[0].storage_path === 'products/b.webp' && editedImgs[0].sort_order === 0)
check('editor removes dropped variants', (await rows(`select sku from product_variants where product_id=$1`, [savedId])).map((r) => r.sku).join() === 'ATS-S')
check('editor stock change is in the ledger', (await one(`select delta, note from inventory_movements where variant_id=$1 order by id desc limit 1`, [vS])).note === 'Product editor')
await fails('product needs at least one variant', () => as('authenticated', admin, (tx) =>
  tx.query(`select admin_save_product($1::jsonb, '[]'::jsonb, '[]'::jsonb)`, [JSON.stringify({ id: savedId, name: 'x', slug: 'admin-test-suit', category_id: cat2, base_price: 1 })])), 'VARIANT_REQUIRED')
await fails('customer cannot save products', () => as('authenticated', alice, (tx) =>
  tx.query(`select admin_save_product('{}'::jsonb, '[]'::jsonb, '[]'::jsonb)`)), 'FORBIDDEN')

await db.query(`update store_settings set store_open = false`)
await fails('closed store rejects orders', () => place(customer, [{ variant_id: ids.vL, quantity: 1 }]), 'STORE_CLOSED')
await db.query(`update store_settings set store_open = true`)

// --- Duplicate submission protection -------------------------------------
const keyed = { ...customer, checkout_key: '6f1c2a4e-9b7d-4c3e-8a21-0d5f7e9b3c11' }
const stockBefore = (await one(`select stock from product_variants where id=$1`, [ids.vL])).stock
const first = await place(keyed, [{ variant_id: ids.vL, quantity: 1 }])
const again = await place(keyed, [{ variant_id: ids.vL, quantity: 1 }])
check('same checkout key returns the same order', first.order_id === again.order_id && first.order_number === again.order_number)
check('resubmission does not take stock twice', (await one(`select stock from product_variants where id=$1`, [ids.vL])).stock === stockBefore - 1)
check('one order row per checkout key', Number((await one(`select count(*) c from orders where checkout_key=$1`, [keyed.checkout_key])).c) === 1)
const otherPhone = await place({ ...keyed, phone: '03451234567' }, [{ variant_id: ids.vL, quantity: 1 }]).catch((e) => e)
check('a reused key with another phone never reveals the first order', otherPhone instanceof Error || otherPhone.order_id !== first.order_id)

// --- Homepage content: banners and the 3D hanger ---------------------------
const bannerSql = `insert into banners (title, heading, image_path, mobile_image_path, alt, is_active) values ('Test','Eid edit','banners/d.jpg','banners/m.jpg','Eid edit',false) returning id`
await fails('anon cannot add banners', () => as('anon', null, (tx) => tx.query(bannerSql)), 'row-level security')
await fails('customer cannot add banners', () => as('authenticated', alice, (tx) => tx.query(bannerSql)), 'row-level security')
check('admin adds banner with desktop + mobile image', (await asAdmin(bannerSql)).rows.length === 1)
check('disabled banner hidden from the public', (await as('anon', null, (tx) => tx.query(`select 1 from banners where heading='Eid edit'`))).rows.length === 0)
check('anon reads hanger settings', (await as('anon', null, (tx) => tx.query(`select heading from hanger_settings`))).rows[0]?.heading === 'Signature pieces, on the rail')
await fails('customer cannot change hanger settings', async () => {
  const r = await as('authenticated', alice, (tx) => tx.query(`update hanger_settings set heading='Hacked'`))
  if (r.affectedRows === 0) throw new Error('no rows updated (blocked by RLS)')
})
await fails('customer cannot add hanger pieces', () => as('authenticated', alice, (tx) =>
  tx.query(`insert into hanger_items (product_id, sort_order) values ($1, 1)`, [ids.p])), 'row-level security')
await fails('customer cannot save the hanger', () => as('authenticated', alice, (tx) => tx.query(`select admin_save_hanger('{}'::jsonb, '[]'::jsonb)`)), 'FORBIDDEN')
await fails('anon cannot save the hanger', () => as('anon', null, (tx) => tx.query(`select admin_save_hanger('{}'::jsonb, '[]'::jsonb)`)), 'permission denied')

const saveHanger = (settings, list) => asAdmin(`select admin_save_hanger($1::jsonb, $2::jsonb)`, [JSON.stringify(settings), JSON.stringify(list)])
await saveHanger({ heading: 'On the rail', featured_product_id: ids.p, max_items: 6, interval_ms: 3000 },
  [{ product_id: ids.p, title: 'Featured title', image_path: 'products/custom.webp' }, { product_id: ids.p2, is_active: false }])
const hs = await one(`select s.heading, s.max_items, s.interval_ms, h.product_id, h.title, h.image_path from hanger_settings s left join hanger_items h on h.id = s.featured_item_id`)
check('hanger saves settings and featured piece', hs.heading === 'On the rail' && hs.max_items === 6 && hs.interval_ms === 3000 && hs.product_id === ids.p)
check('hanger piece keeps custom title and image', hs.title === 'Featured title' && hs.image_path === 'products/custom.webp')
check('public sees only enabled hanger pieces', (await as('anon', null, (tx) => tx.query(`select product_id from hanger_items`))).rows.length === 1)
await saveHanger({ featured_product_id: ids.p }, [{ product_id: ids.p2 }, { product_id: ids.p }])
check('hanger pieces can be reordered', (await rows(`select product_id from hanger_items order by sort_order`)).map((r) => r.product_id).join() === [ids.p2, ids.p].join())
await saveHanger({ featured_product_id: ids.p }, [{ product_id: ids.p }])
check('removed hanger piece is deleted, product untouched', Number((await one(`select count(*) c from hanger_items`)).c) === 1
  && Number((await one(`select count(*) c from products where id=$1`, [ids.p2])).c) === 1)
await fails('hanger rejects an out-of-range speed', () => saveHanger({ interval_ms: 100 }, [{ product_id: ids.p }]), 'check constraint')
const afterDelete = await as('authenticated', admin, async (tx) => {
  await tx.query(`delete from products where id=$1`, [ids.p])
  return (await tx.query(`select featured_item_id, (select count(*) from hanger_items) n from hanger_settings`)).rows[0]
})
check('deleting a product removes its piece and clears featured safely', afterDelete.featured_item_id === null && Number(afterDelete.n) === 0)

// --- Safe category deletion ------------------------------------------------
const twoPiece = (await one(`select id from categories where slug='2-piece-suits'`)).id
const threePiece = (await one(`select id from categories where slug='3-piece-suits'`)).id
await fails('category with products is not deleted blindly', () => asAdmin(`select admin_delete_category($1)`, [twoPiece]), 'CATEGORY_NOT_EMPTY')
await fails('customer cannot delete categories', () => as('authenticated', alice, (tx) => tx.query(`select admin_delete_category($1, $2)`, [twoPiece, threePiece])), 'FORBIDDEN')
const moved = await as('authenticated', admin, async (tx) => {
  const n = (await tx.query(`select admin_delete_category($1, $2) n`, [twoPiece, threePiece])).rows[0].n
  const left = (await tx.query(`select count(*) c from products where category_id=$1`, [threePiece])).rows[0].c
  const gone = (await tx.query(`select count(*) c from categories where id=$1`, [twoPiece])).rows[0].c
  const orders = (await tx.query(`select count(*) c from order_items`)).rows[0].c
  return { n, left: Number(left), gone: Number(gone), orders: Number(orders) }
})
check('deleting a category moves its products first', moved.n >= 2 && moved.left >= 2 && moved.gone === 0)
check('category deletion keeps order history', moved.orders > 0)

// --- Reviews -------------------------------------------------------------
await fails('non-buyer cannot review', () => as('authenticated', bob, (tx) =>
  tx.query(`insert into reviews (product_id, user_id, rating) values ($1,$2,5)`, [ids.p, bob])), 'row-level security')

// --- Storage -------------------------------------------------------------
await fails('customer cannot upload catalog images', () => as('authenticated', alice, (tx) =>
  tx.query(`insert into storage.objects (bucket_id, name) values ('catalog','x.webp')`)), 'row-level security')
check('admin can upload catalog images', (await as('authenticated', admin, (tx) =>
  tx.query(`insert into storage.objects (bucket_id, name) values ('catalog','x.webp')`))).affectedRows === 1)
check('anon cannot list receipts', (await as('anon', null, (tx) => tx.query(`select * from storage.objects where bucket_id='receipts'`))).rows.length === 0)

// --- Brands / labels -------------------------------------------------------
const demoBrand = (await one(`select id from brands where slug='demo-brand'`)).id
const brandB = (await one(`insert into brands (name, slug) values ('Summer Collection','summer-collection') returning id`)).id
await fails('customer cannot add brands', () => as('authenticated', alice, (tx) =>
  tx.query(`insert into brands (name, slug) values ('X','x')`)), 'row-level security')
check('customer cannot rename brands', (await as('authenticated', alice, (tx) =>
  tx.query(`update brands set name='Hacked' where id=$1`, [demoBrand]))).affectedRows === 0)
await fails('customer cannot delete brands', () => as('authenticated', alice, (tx) => tx.query(`select admin_delete_brand($1, null, true)`, [demoBrand])), 'FORBIDDEN')
check('anon sees only active brands', await as('authenticated', admin, (tx) => tx.query(`update brands set is_active=false where id=$1`, [brandB]), true).then(() =>
  as('anon', null, (tx) => tx.query(`select id from brands where id=$1`, [brandB]))).then((r) => r.rows.length === 0))
await fails('brand in use is not deleted blindly', () => asAdmin(`select admin_delete_brand($1)`, [demoBrand]), 'BRAND_IN_USE')
await fails('brand in use cannot be removed by a plain delete', () => asAdmin(`delete from brands where id=$1`, [demoBrand]), 'foreign key')
const brandMove = await as('authenticated', admin, async (tx) => {
  const before = Number((await tx.query(`select count(*) c from products where brand_id=$1`, [demoBrand])).rows[0].c)
  const n = (await tx.query(`select admin_delete_brand($1, $2) n`, [demoBrand, brandB])).rows[0].n
  const after = Number((await tx.query(`select count(*) c from products where brand_id=$1`, [brandB])).rows[0].c)
  return { before, n, after }
})
check('deleting a brand moves its products to the chosen brand', brandMove.before > 0 && brandMove.n === brandMove.before && brandMove.after === brandMove.before)
const brandClear = await as('authenticated', admin, async (tx) => {
  const n = (await tx.query(`select admin_delete_brand($1, null, true) n`, [demoBrand])).rows[0].n
  const left = Number((await tx.query(`select count(*) c from products where brand_id is null`)).rows[0].c)
  return { n, left }
})
check('deleting a brand can clear the label instead', brandClear.n > 0 && brandClear.left > 0)

// --- Admin allowlist (two accounts) ----------------------------------------
const carol = (await one(`insert into auth.users (email, email_confirmed_at) values ('carol@x.pk', null) returning id`)).id
const asUser = (uid, q, p) => as('authenticated', uid, (tx) => tx.query(q, p), true)
check('customer is not admin', (await as('authenticated', alice, (tx) => tx.query(`select is_admin() a`))).rows[0].a === false)
await fails('customer cannot grant admin', () => as('authenticated', alice, (tx) => tx.query(`select admin_grant_second('alice@x.pk')`)), 'FORBIDDEN')
await fails('customer cannot write the allowlist directly', () => as('authenticated', alice, (tx) =>
  tx.query(`insert into admin_access (slot, email, user_id) values (2, 'alice@x.pk', $1)`, [alice])), '') // privilege revoked live; RLS here (the harness re-grants all)
check('customer cannot read the allowlist', (await as('authenticated', alice, (tx) => tx.query(`select * from admin_access`))).rows.length === 0)
await fails('admin cannot set roles directly', () => as('authenticated', admin, (tx) => tx.query(`update profiles set role='admin' where id=$1`, [alice])), 'FORBIDDEN')
check('a role edited in SQL does not grant admin', await (async () => {
  await db.query(`update profiles set role='admin' where id=$1`, [bob])
  const r = (await as('authenticated', bob, (tx) => tx.query(`select is_admin() a`))).rows[0].a
  await db.query(`select private.sync_admin_roles()`)
  return r === false && (await one(`select role from profiles where id=$1`, [bob])).role === 'customer'
})())
await fails('owner cannot add an invalid email', () => asUser(admin, `select admin_grant_second('not-an-email')`), 'INVALID_EMAIL')
await fails('owner cannot add themselves again', () => asUser(admin, `select admin_grant_second('A@x.pk')`), 'ALREADY_ADMIN')
check('owner authorises an email with an unconfirmed account (not linked yet)',
  (await asUser(admin, `select admin_grant_second(' Carol@X.pk ') linked`)).rows[0].linked === false)
check('unconfirmed account is not admin', (await as('authenticated', carol, (tx) => tx.query(`select is_admin() a`))).rows[0].a === false)
await fails('owner cannot add a third admin', () => asUser(admin, `select admin_grant_second('bob@x.pk')`), 'ADMIN_LIMIT')
await fails('allowlist holds at most two rows', () => db.query(`insert into admin_access (slot, email) values (3, 'z@x.pk')`), 'check')
await db.query(`update auth.users set email_confirmed_at=now() where id=$1`, [carol])
check('second admin gets access once their email is confirmed', (await as('authenticated', carol, (tx) => tx.query(`select is_admin() a`))).rows[0].a === true)
check('second admin profile shows admin role', (await one(`select role from profiles where id=$1`, [carol])).role === 'admin')
check('second admin can manage the catalogue', (await as('authenticated', carol, (tx) => tx.query(`update brands set name='Summer Edit' where id=$1`, [brandB]))).affectedRows === 1)
check('second admin can see the allowlist', (await as('authenticated', carol, (tx) => tx.query(`select * from admin_access_list()`))).rows.length === 2)
await fails('second admin cannot add another admin', () => as('authenticated', carol, (tx) => tx.query(`select admin_grant_second('bob@x.pk')`)), 'FORBIDDEN')
await fails('second admin cannot remove admins', () => as('authenticated', carol, (tx) => tx.query(`select admin_revoke_second()`)), 'FORBIDDEN')
await db.query(`update auth.users set email='carol.new@x.pk' where id=$1`, [carol])
check('changing the account email removes admin access', (await as('authenticated', carol, (tx) => tx.query(`select is_admin() a`))).rows[0].a === false)
await db.query(`update auth.users set email='carol@x.pk' where id=$1`, [carol])
check('changing it back relinks the account', (await as('authenticated', carol, (tx) => tx.query(`select is_admin() a`))).rows[0].a === true)
await asUser(admin, `select admin_revoke_second()`)
check('owner can revoke the second admin', (await as('authenticated', carol, (tx) => tx.query(`select is_admin() a`))).rows[0].a === false
  && (await one(`select role from profiles where id=$1`, [carol])).role === 'customer')
const dave = (await one(`insert into auth.users (email) values ('dave@x.pk') returning id`)).id
check('owner authorising an existing confirmed account links it at once',
  (await asUser(admin, `select admin_grant_second('dave@x.pk') linked`)).rows[0].linked === true
  && (await as('authenticated', dave, (tx) => tx.query(`select is_admin() a`))).rows[0].a === true)
check('owner keeps access throughout', (await as('authenticated', admin, (tx) => tx.query(`select is_admin() a`))).rows[0].a === true)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
