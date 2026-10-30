# Pakistani Women's Fashion Store

Premium e-commerce platform: Next.js 16 + Supabase (Postgres, Auth, Storage).
Full architecture, security model and phase plan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
project arsh/
├── .claude/skills/      Claude skills (UI/UX, design, motion, Prisma reference)
├── docs/                Architecture & decisions
└── web/                 The application
    ├── src/app/         Routes (storefront, admin, API)
    ├── src/lib/         Supabase clients, auth guards, data, actions, motion tokens
    ├── src/proxy.ts     Session refresh + private-area redirects
    └── supabase/
        ├── migrations/  Schema, RLS, functions, storage policies (versioned SQL)
        ├── seed.sql     Sizes, colours, categories, home sections
        └── tests/       Database security & checkout tests (run without a server)
```

## Setup

1. Create a Supabase project, then copy `web/.env.example` to `web/.env.local` and fill it in.
2. From `web/`, link the project, apply migrations, then generate types:

```bash
npx supabase link --project-ref your-project-ref
```

```bash
npx supabase db push --include-seed
```

```bash
npm run db:types
```

3. Sign up on the site, then make yourself admin in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Commands (from `web/`)

| Command | Does |
|---|---|
| `npm run dev` | Start the site at http://localhost:3000 |
| `npm run test:db` | Apply all migrations to an in-memory Postgres and run 58 security/checkout checks |
| `npm run typecheck` · `npm run lint` | Static checks |
| `npm run db:push` · `npm run db:types` | Apply migrations to Supabase · regenerate TypeScript types |

Animation code imports from `motion/react` only, never `framer-motion`.
