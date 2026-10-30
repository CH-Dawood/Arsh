# Architecture & Development Plan

Premium Pakistani women's fashion e-commerce platform. This document is the
single source of truth for how the system is built. Update it when a decision
changes.

---

## 1. Requirements analysis

| Area | What it really means | Key risk |
|------|---------------------|----------|
| Storefront | 25 pages, header/search, hero slider, 6 home categories, 6 product rails, PDP, cart, checkout, tracking | Visual quality vs. Core Web Vitals on Pakistani mobile networks |
| Commerce | Server-priced cart, coupons, shipping threshold, COD / bank transfer / wallets, stock reservation | Overselling, price tampering, fake "paid" status |
| Admin | Full CRUD for products, variants, stock, categories, brands, banners, coupons, orders, customers, settings | Privilege escalation; admin UI that can't actually manage data |
| Security | RLS on every table, server-side authorization, validated uploads, rate limits, audit log | Leaking the service-role key; trusting the browser |
| SEO | Metadata, sitemap, robots, canonical, Product/Offer/Breadcrumb/Organization JSON-LD | Fake ratings in structured data (forbidden) |
| Motion / 3D | Card tilt, image zoom, hero transitions, page transitions, reveals, one 3D promo moment | Jank, battery drain, inaccessible motion |

### Business information that is missing (placeholders, all admin-configurable)

Brand name and logo · WhatsApp number · Instagram / TikTok / Facebook URLs ·
contact email, phone, address · bank account details for transfers ·
policy texts (privacy, shipping, refund, terms) · size chart values ·
real product photography · payment-gateway merchant credentials.

None of these are invented. They live in `store_settings` / CMS tables and
show a clearly marked placeholder until the owner fills them in.

---

## 2. Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16 (App Router), React 19.2, TypeScript strict** | Server Components keep JS small; Server Actions for mutations; built-in image optimisation and metadata APIs |
| Styling | **Tailwind CSS 4** with CSS-variable design tokens | One token source for colours, type, spacing, motion |
| Motion | **Motion** (`motion/react`) + CSS 3D transforms | Covers tilt, transitions, reveals with no WebGL cost |
| 3D | **React Three Fiber** — one lazy-loaded promo scene only | Used where it adds something CSS can't; skipped on reduced-motion / low-end devices |
| Database | **Supabase PostgreSQL** | Relational integrity, RLS, transactional functions |
| Auth | **Supabase Auth** (email + password, optional magic link / Google later) | Secure sessions via `@supabase/ssr` HTTP-only cookies |
| Storage | **Supabase Storage** | Public bucket for catalogue images, private bucket for payment receipts |
| Validation | **Zod** | One schema shared by forms and server actions |
| Hosting | **Vercel** (recommended) + Supabase cloud | Edge CDN, image optimisation, preview deployments |

### Dependencies to remove from the earlier scaffold

The spec chooses Supabase, so the separate Express + Prisma + SQLite `backend/`
is retired; all server logic moves into the Next.js app (Server Actions,
Route Handlers, Postgres functions). Unused front-end packages are dropped
(`axios` → `fetch`, `@react-three/postprocessing`, and `gsap` / `lenis` unless a
specific effect needs them).

---

## 3. Project structure

```
web/
├── src/
│   ├── app/
│   │   ├── (store)/           Public storefront — shared header/footer layout
│   │   │   ├── page.tsx                      Home
│   │   │   ├── shop/                         Shop All + filters
│   │   │   ├── collections/[slug]/           New Arrivals, Luxury, 2 Piece, Ready To Wear, Best Sellers
│   │   │   ├── brands/ · brands/[slug]/
│   │   │   ├── products/[slug]/              Product details
│   │   │   ├── search/ · cart/ · checkout/ · wishlist/
│   │   │   ├── orders/[number]/ · track-order/
│   │   │   ├── account/ · login/ · register/
│   │   │   └── (content)/ about, contact, faqs, size-guide, privacy-policy, shipping-policy, refund-policy, terms
│   │   ├── admin/             Protected dashboard (own layout)
│   │   ├── api/               Route Handlers: payment webhooks, search suggestions
│   │   ├── sitemap.ts · robots.ts · opengraph-image.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                Design-system primitives (Button, Input, Badge, Sheet, Dialog, Skeleton…)
│   │   ├── layout/            Header, MobileDrawer, Footer, WhatsAppButton
│   │   ├── home/              HeroSlider, CategoryGrid, ProductRail, ShippingPromo
│   │   ├── product/           ProductCard, Gallery, VariantPicker, QuickView, Reviews
│   │   ├── cart/ · checkout/ · admin/
│   │   └── motion/            Reveal, PageTransition, Tilt (built on lib/motion)
│   ├── lib/
│   │   ├── supabase/          server.ts, client.ts, admin.ts (service role — server-only), proxy.ts helper
│   │   ├── data/              Read queries (products, categories, settings…) — server-only
│   │   ├── actions/           Server Actions (cart, checkout, auth, admin/*) — all validate + authorize
│   │   ├── validation/        Zod schemas
│   │   ├── payments/          Provider adapters: cod, bank-transfer, easypaisa, jazzcash, card
│   │   ├── motion/            Tokens, springs, shouldAnimate()
│   │   ├── seo/               Metadata + JSON-LD builders
│   │   └── utils/             money (PKR), slug, format
│   ├── types/database.ts      Generated by `supabase gen types`
│   └── proxy.ts               Session refresh + /admin and /account gating (Next 16 replacement for middleware)
├── supabase/
│   ├── migrations/            Versioned SQL: schema, indexes, RLS, functions, storage policies
│   ├── seed.sql               Reference data (sizes, colours, categories, home sections)
│   └── tests/db.test.mjs      Applies migrations to in-memory Postgres (PGlite) and checks RLS + checkout
└── public/                    Static brand assets, payment-method icons
```

---

## 4. Database schema (PostgreSQL)

All tables: `uuid` primary keys, `created_at` / `updated_at` timestamps
(trigger-maintained), foreign keys with explicit `on delete` behaviour, and
indexes on every FK and filter column. Money is stored as `integer` PKR
(whole rupees, no floats).

| Table | Purpose / key columns |
|-------|-----------------------|
| `profiles` | 1:1 with `auth.users`; `full_name`, `phone`, `role` (`customer` \| `admin`) |
| `addresses` | user's saved delivery addresses |
| `categories` | product types (Kurta Shalwar, 2 Piece, 3 Piece, Embroidered, Printed, Ready To Wear, Designer…); `slug`, `image_path`, `sort_order`, `is_active` |
| `brands` | `name`, `slug`, `logo_path`, `is_featured` |
| `products` | `name`, `slug`, `description`, `fabric`, `embroidery`, `care`, `base_price`, `compare_at_price`, `category_id`, `brand_id`, flags `is_new_arrival`, `is_best_seller`, `is_luxury`, `is_active`; `search_vector` (generated tsvector) |
| `product_images` | ordered gallery; `storage_path`, `alt`, `sort_order`, optional `color_id` |
| `sizes` | master list (XS…XXL, Unstitched) with `sort_order` |
| `colors` | master list with `hex` |
| `product_variants` | **inventory lives here**: `product_id`, `size_id`, `color_id`, `sku` (unique), `stock`, `price_override`; unique (`product_id`,`size_id`,`color_id`) |
| `inventory_movements` | append-only stock ledger (order, cancel, restock, manual adjust) |
| `home_sections` | the six home categories/rails, admin-ordered: `title`, `source` (`flag` \| `category` \| `brand`), `source_value`, `image_path`, `sort_order` |
| `carts` / `cart_items` | one cart per user **or** guest token; items reference variants (price never stored on the client) |
| `wishlists` | (`user_id`, `product_id`) unique |
| `coupons` | `code` (unique, case-insensitive), `type` (`percent` \| `fixed`), `value`, `min_order`, `starts_at`, `expires_at`, `usage_limit`, `per_user_limit`, `is_active` |
| `coupon_redemptions` | enforces usage limits |
| `orders` | `order_number` (unique, human-readable `ORD-YYMM-XXXXX`), `user_id` (nullable for guests), contact + address snapshot, `subtotal`, `discount`, `shipping`, `total`, `status`, `payment_method`, `payment_status`, `tracking_number`, `courier`, `notes` |
| `order_items` | **price snapshot** at purchase: product name, variant label, `unit_price`, `quantity` |
| `order_status_history` | every status change, who made it, when |
| `payments` | `provider`, `provider_ref` (unique → idempotency), `amount`, `status`, raw verified payload, receipt path for bank transfers |
| `returns` | return/exchange requests linked to order items |
| `reviews` | one per user per product, only from verified purchasers; `is_approved` (moderated) |
| `banners` | hero slides: `heading`, `subheading`, `cta_label`, `cta_href`, `promo_text`, desktop + mobile image paths, `sort_order`, `is_active`, optional schedule |
| `newsletter_subscribers` | unique email, `status`, consent timestamp |
| `store_settings` | single row: store name, logo, contact, WhatsApp, socials, `free_shipping_threshold` (default 12,000), `shipping_fee`, bank details, policy rich text |
| `admin_audit_log` | actor, action, entity, before/after JSON, timestamp |
| `rate_limits` | key + window counter for sensitive endpoints |

### Critical operations run as Postgres functions (single transaction)

- **`place_order(cart, contact, address, coupon, payment_method)`** — reloads
  prices from `product_variants`/`products`, validates the coupon and
  shipping threshold, locks variant rows (`SELECT … FOR UPDATE`), checks and
  decrements stock, writes order + items + inventory movements, generates the
  order number. The browser never supplies a price or a total.
- **`cancel_order` / `restock_order`** — restore inventory exactly once.
- **`record_payment(provider, ref, payload)`** — idempotent on `provider_ref`;
  only called from verified webhook handlers or by an admin confirming a bank
  transfer.

---

## 5. Authentication & security architecture

**Sessions** — `@supabase/ssr` with HTTP-only, `SameSite=Lax`, `Secure`
cookies. `proxy.ts` refreshes the session and redirects unauthenticated users
away from `/account` and non-admins away from `/admin`. That redirect is a UX
convenience only; **every** admin Server Action and Route Handler re-checks
`role = 'admin'` on the server, and RLS enforces it again in the database.

**Roles** — `profiles.role`, writable only by the service role or an existing
admin (RLS + a trigger that blocks self-promotion). Helper SQL function
`is_admin()` used by policies.

**Row Level Security** — enabled on every table, default deny:

| Data | Public | Owner | Admin |
|------|--------|-------|-------|
| Active products, images, variants, categories, brands, banners, settings | read | read | full |
| Profiles, addresses, carts, wishlists | — | own rows | read/manage |
| Orders, order items, payments | — | read own | full |
| Reviews | read approved | create (verified buyer), edit own | moderate |
| Coupons, audit log, inventory ledger, rate limits | — | — | admin / service only |

Guest order tracking goes through a function that requires **order number +
phone** and returns a minimal projection — never a table scan.

**Application security**
- SQL injection: Supabase client parameterises; Postgres functions use typed
  arguments, no dynamic SQL.
- XSS: React escaping; admin rich text sanitised server-side before storage;
  strict Content-Security-Policy.
- CSRF: Server Actions are POST-only with Next's built-in origin check;
  cookies are `SameSite=Lax`.
- Input: Zod on every action and route; reject unknown fields.
- Rate limiting: Postgres-backed limiter on login, register, checkout, coupon
  apply, newsletter, contact, order tracking.
- Uploads: admin-only, MIME sniffed from file bytes (not the extension),
  JPEG/PNG/WebP/AVIF only, 5 MB cap, random file names, storage policies.
- Headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `frame-ancestors 'none'`.
- Errors: generic messages to the client, details to server logs only.

**Secrets** — only `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key
reach the browser. `SUPABASE_SERVICE_ROLE_KEY` and payment secrets are used
only in `server-only` modules. `.env.example` lists every variable with
placeholders; `.env*.local` is git-ignored.

**Payments**
| Method | Behaviour |
|--------|-----------|
| Cash on Delivery | Order `confirmed` after admin review; payment `pending` until the courier remits and admin marks it `paid` |
| Bank Transfer | Customer sees bank details from settings, uploads a receipt (private bucket); admin verifies → `paid` |
| Easypaisa / JazzCash | Adapter + signed webhook verification scaffolded; **disabled** until merchant credentials are configured |
| Card gateway (e.g. Safepay / PayFast) | Same adapter pattern; disabled until configured |

No code path marks an order paid without a verified webhook signature or an
admin action recorded in the audit log. Card data never touches our servers.

---

## 6. Design system

Direction: quiet luxury — editorial whitespace, photography first, restrained
gold accents, hairline borders, almost no rounding.

| Token | Value |
|-------|-------|
| `--ivory` (background) | `#FAF7F2` |
| `--champagne` (surface) | `#EFE6D8` |
| `--taupe` (muted / borders) | `#B8A99A` · hairline `#E4DCD0` |
| `--espresso` (text / primary) | `#2B211C` |
| `--gold` (accent, ≤ 5 % of any screen) | `#A8864E` |
| Headings | **Cormorant Garamond** (500–600), tight tracking on display sizes |
| Body / UI | **Jost** or **Montserrat** (300–500), uppercase letter-spaced labels |
| Radius | 0–2 px (buttons, inputs, cards) |
| Shadows | two levels, warm-tinted, used on hover/elevation only |
| Spacing | 4 px base; section rhythm 96 / 128 px desktop, 56 / 72 px mobile |
| Breakpoints | 375 · 640 · 768 · 1024 · 1280 · 1536 · 1920 |
| Motion | durations 120 / 200 / 350 / 600 ms; ease `cubic-bezier(.22,1,.36,1)`; all transforms off under `prefers-reduced-motion` |

All contrast pairs meet WCAG AA (espresso on ivory ≈ 14:1; gold is used for
accents and large text only).

---

## 7. Motion & 3D plan (performance-budgeted)

| Effect | Technique | Cost |
|--------|-----------|------|
| Product card 3D tilt + secondary image + soft shadow | CSS `perspective` + pointer-driven transform via Motion values (no re-renders) | ~0 |
| Image zoom on PDP | CSS transform on pointer position; pinch-zoom lightbox on mobile | ~0 |
| Hero slider | Crossfade + slow Ken Burns scale, `aspect-ratio` reserved (no CLS), first slide `priority`, others lazy | low |
| Page transitions | React 19.2 View Transitions / Motion `AnimatePresence` | low |
| Scroll reveals | `whileInView`, `once: true`, transform + opacity only | low |
| Drawer, cart sheet, add-to-cart fly-in | Motion springs | low |
| 3D promo moment (shipping / brand section) | R3F scene, dynamically imported, rendered only when in view and capable; static image fallback | isolated |

Budgets: < 170 KB JS on the home route (excluding the lazy 3D chunk),
LCP < 2.5 s on 4G, CLS < 0.05, INP < 200 ms.

---

## 8. SEO

`generateMetadata` per route (unique title + description + canonical +
Open Graph), `app/sitemap.ts` from the database, `app/robots.ts`,
breadcrumb UI with matching `BreadcrumbList` JSON-LD, `Product` + `Offer`
(price, availability from real stock) on PDPs, `Organization` + `WebSite`
(with `SearchAction`) site-wide. `AggregateRating` only when real approved
reviews exist. Semantic headings, descriptive alt text from the database,
AVIF/WebP via `next/image`, `next/font` with `display: swap`.

---

## 9. Phased delivery

| Phase | Deliverables | Exit check |
|-------|--------------|-----------|
| **1. Foundation** — *done except linking (waiting on credentials)* | Retire Express backend; Supabase project linked; migrations for full schema + RLS + functions + storage; generated types; Supabase clients; `proxy.ts`; design tokens, fonts, UI primitives; security headers; `.env.example` | Migrations apply cleanly; RLS tests pass; typecheck clean |
| **2. Storefront UI** | Header + search, mobile drawer, hero slider, category grid, product rails, shipping promo, footer, WhatsApp button, PDP, cart, checkout, content pages | Responsive at 320 → 1920 px; no horizontal scroll |
| **3. Commerce backend** | Cart (guest + user, merge on login), coupons, `place_order`, order confirmation + tracking, wishlist, reviews, newsletter, auth flows | Order journey end-to-end against the real database |
| **4. Admin dashboard** | Overview metrics, products/variants/stock/images, categories, brands, home sections, banners, coupons, orders (status, payment, tracking, refunds/returns), customers, settings, audit log | Every store setting changeable without code |
| **5. Motion & 3D** | Tilt, zoom, transitions, reveals, cart animations, 3D promo | Reduced-motion and low-end fallbacks verified; budgets met |
| **6. SEO & hardening** | Metadata, JSON-LD, sitemap, CSP tuning, rate limits, upload checks, security review | Lighthouse ≥ 90 across the board; review findings fixed |
| **7. QA** | Journey tests (discover → order), admin permission tests, RLS tests, responsive sweep, console/broken-image sweep | All checks in spec §21 pass |

---

## 10. Credentials required from the owner

| Credential | Needed for | Phase |
|------------|-----------|-------|
| Supabase project URL + publishable (anon) key | Everything | 1 |
| Supabase service-role key (owner pastes into `.env.local` directly) | Admin operations, webhooks | 1 |
| Supabase access token + DB password (for `supabase db push` / type generation) | Migrations | 1 |
| Business WhatsApp number, socials, contact details | Footer, WhatsApp button | set in admin anytime |
| Bank account details | Bank-transfer checkout | set in admin anytime |
| Easypaisa / JazzCash / card-gateway merchant credentials | Online payments | optional, later |
| Product photography | Catalogue | ongoing |
