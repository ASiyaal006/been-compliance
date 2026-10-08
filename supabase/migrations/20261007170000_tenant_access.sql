-- Been Compliance · customer (tenant) access + profile lock-down
-- Replaces 20260504120000_rls_multi_tenancy.sql, which was never run on the live
-- database. The live database already has "Admin full access to …" policies on
-- clients/assets/inspections and own-row policies on profiles; this script keeps
-- them and adds what was missing. Safe to run more than once.
--
-- 1. Users can no longer make themselves admin or move themselves to another
--    client: only full_name is writable on their own profile.
-- 2. Customer logins (profiles.client_id set) can see and manage their own
--    client's assets and inspections. Admins keep full access.

-- ------------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — read profiles without recursing into RLS)
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
-- profiles: users may only create/edit their own name
-- (is_been_admin and client_id are set by an admin in the Supabase dashboard)
-- ------------------------------------------------------------------------------

REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, full_name) ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- clients: customers see their own client record
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS clients_tenant_select ON public.clients;
CREATE POLICY clients_tenant_select ON public.clients
  FOR SELECT
  TO authenticated
  USING (id = public.current_user_client_id());

-- ------------------------------------------------------------------------------
-- assets: customers manage their own client's assets
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS assets_tenant_all ON public.assets;
CREATE POLICY assets_tenant_all ON public.assets
  FOR ALL
  TO authenticated
  USING (client_id = public.current_user_client_id())
  WITH CHECK (client_id = public.current_user_client_id());

-- ------------------------------------------------------------------------------
-- inspections: scoped via parent asset → client
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS inspections_tenant_all ON public.inspections;
CREATE POLICY inspections_tenant_all ON public.inspections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );
