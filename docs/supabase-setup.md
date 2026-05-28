# Connecting Been Compliance Platform to Supabase

This app reads and writes **`clients`**, **`assets`**, and **`inspections`** using the **service role key on the server only** (`SUPABASE_SERVICE_ROLE_KEY`). Nothing in the browser bypasses Postgres row-level protections when you tighten policies later.

## 1. Create the Supabase project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in (create an account if needed).
2. **New project** · pick an organisation · name it (e.g. `been-compliance-prod`).
3. Set a database password you can store in a vault.
4. Choose a region close to UK users · create the project and wait until the dashboard is healthy.

Your project replaces any generic “beencompliance.com” placeholder—you can still use Been Compliance branding in-app; the hostname is whichever `*.supabase.co` URL Supabase assigns.

## 2. Apply the SQL schema

1. In Supabase: **SQL** → **New query**.
2. Paste the contents of [`supabase/migrations/20260502183000_initial_schema.sql`](/supabase/migrations/20260502183000_initial_schema.sql).
3. **Run**.

You should see **`clients`**, **`assets`**, and **`inspections`** tables in **Database → Tables**.

If you created the schema before Pass/Fail/Monitor outcomes were added, also run:

[`supabase/migrations/20260503120000_inspection_outcomes.sql`](/supabase/migrations/20260503120000_inspection_outcomes.sql)

> Row Level Security is **enabled** without public policies yet. Next.js talks to Postgres with the **service role**, which bypasses RLS until you intentionally add tighter policies tied to authenticated users.

## 3. Add API credentials to `.env.local`

1. Supabase · **Project Settings** → **API**.
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (reserved for future client-side helpers; not yet required).
4. Under **API Keys**, copy the **secret / service_role** value → `SUPABASE_SERVICE_ROLE_KEY`.  
   - New projects use `sb_secret_...`; older projects use a long `eyJ...` JWT.  
   - Do **not** paste the `sb_publishable_...` anon key here.  
   - **Never commit this.** Keep it server-side only (.env.local, Vercel “Environment Variables”, etc.).

Your `.env.local` should be **one variable per line**, for example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Use [`.env.example`](/.env.example) as your checklist.

## 4. Run the app locally

```bash
cd platform
pnpm install
pnpm dev
```

Add assets at `/assets/new` — saves should persist through refresh on `/assets` and `/`.

Verify connectivity:

```bash
pnpm db:verify
```

When connected, the app shows a green **“Live database connected”** banner above every dashboard screen.

### Production reminders

- Rotate keys if leaked; prefer **least privilege** (scoped DB roles / edge functions) as you mature the stack.
- Replace open service-role writes with authenticated users + granular RLS when you onboard real inspectors.
