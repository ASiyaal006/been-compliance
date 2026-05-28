-- Been Compliance · Multi-tenancy via Row Level Security (RLS)
-- Run in Supabase SQL Editor (or: supabase db push).
--
-- After running:
-- 1. Create users in Authentication → Users.
-- 2. For each user, set public.profiles.client_id (tenant) OR is_been_admin = true (Been staff).
-- 3. Public QR pages continue to use the server service role (bypasses RLS) — not exposed to browsers.

-- ------------------------------------------------------------------------------
-- Profiles (links auth.users → tenant client)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients (id) ON DELETE SET NULL,
  is_been_admin BOOLEAN NOT NULL DEFAULT FALSE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'App users: tenant scope via client_id; Been Compliance staff via is_been_admin.';
COMMENT ON COLUMN public.profiles.is_been_admin IS 'When true, user can access all clients (Been Compliance Admin).';

CREATE INDEX IF NOT EXISTS profiles_client_id_idx ON public.profiles (client_id);

-- Auto-create profile row when a Supabase Auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER — read profiles safely)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_been_compliance_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_been_admin FROM public.profiles p WHERE p.id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.client_id FROM public.profiles p WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.is_been_compliance_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_client_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_been_compliance_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_client_id() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- Enable RLS (idempotent)
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Drop legacy / draft policies if re-running
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;

DROP POLICY IF EXISTS assets_select ON public.assets;
DROP POLICY IF EXISTS assets_insert ON public.assets;
DROP POLICY IF EXISTS assets_update ON public.assets;
DROP POLICY IF EXISTS assets_delete ON public.assets;

DROP POLICY IF EXISTS inspections_select ON public.inspections;
DROP POLICY IF EXISTS inspections_insert ON public.inspections;
DROP POLICY IF EXISTS inspections_update ON public.inspections;
DROP POLICY IF EXISTS inspections_delete ON public.inspections;

-- ------------------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------------------

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_been_compliance_admin()
  );

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Been admins manage profiles (assign client_id / admin flag)
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

-- ------------------------------------------------------------------------------
-- clients
-- ------------------------------------------------------------------------------

CREATE POLICY clients_select ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR id = public.current_user_client_id()
  );

CREATE POLICY clients_insert ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_been_compliance_admin());

CREATE POLICY clients_update ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_been_compliance_admin()
    OR id = public.current_user_client_id()
  );

CREATE POLICY clients_delete ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.is_been_compliance_admin());

-- ------------------------------------------------------------------------------
-- assets
-- ------------------------------------------------------------------------------

CREATE POLICY assets_select ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR client_id = public.current_user_client_id()
  );

CREATE POLICY assets_insert ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_been_compliance_admin()
    OR client_id = public.current_user_client_id()
  );

CREATE POLICY assets_update ON public.assets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR client_id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_been_compliance_admin()
    OR client_id = public.current_user_client_id()
  );

CREATE POLICY assets_delete ON public.assets
  FOR DELETE
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR client_id = public.current_user_client_id()
  );

-- ------------------------------------------------------------------------------
-- inspections (scoped via parent asset → client_id)
-- ------------------------------------------------------------------------------

CREATE POLICY inspections_select ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

CREATE POLICY inspections_insert ON public.inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_been_compliance_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

CREATE POLICY inspections_update ON public.inspections
  FOR UPDATE
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  )
  WITH CHECK (
    public.is_been_compliance_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

CREATE POLICY inspections_delete ON public.inspections
  FOR DELETE
  TO authenticated
  USING (
    public.is_been_compliance_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

-- ------------------------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- No anon policies: public QR reads use service role on the server only (bypasses RLS).
