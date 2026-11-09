-- Been Compliance · customer portal
-- Run in Supabase SQL Editor after the inspection types migration. Safe to run more than once.
--
-- A customer login is a profile with client_id set (and is_been_admin false). Admins invite them
-- from Admin → Customers; the app sets client_id with the service key, so no dashboard steps.
--
-- 1. Customers become read-only: they can see their own client's assets and inspections but no
--    longer add, edit or delete them (that was allowed by 20261007170000_tenant_access.sql).
-- 2. Customers can see certificates uploaded for their own assets (certificates.asset_id), and
--    open the stored PDF.
-- 3. A certificate can only be linked to an asset the uploader can see, so nobody can push a
--    certificate into another customer's portal.

-- ------------------------------------------------------------------------------
-- assets / inspections: customers read only
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS assets_tenant_all ON public.assets;
DROP POLICY IF EXISTS assets_tenant_select ON public.assets;
CREATE POLICY assets_tenant_select ON public.assets
  FOR SELECT
  TO authenticated
  USING (client_id = public.current_user_client_id());

DROP POLICY IF EXISTS inspections_tenant_all ON public.inspections;
DROP POLICY IF EXISTS inspections_tenant_select ON public.inspections;
CREATE POLICY inspections_tenant_select ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = inspections.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

-- ------------------------------------------------------------------------------
-- certificates: customers see the ones linked to their own assets
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS certificates_client_select ON public.certificates;
CREATE POLICY certificates_client_select ON public.certificates
  FOR SELECT
  TO authenticated
  USING (
    asset_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = certificates.asset_id
        AND a.client_id = public.current_user_client_id()
    )
  );

-- Only link a certificate to an asset you can see (RLS on assets applies inside the check).
DROP POLICY IF EXISTS certificates_insert_own ON public.certificates;
CREATE POLICY certificates_insert_own ON public.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (asset_id IS NULL OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = certificates.asset_id))
  );

DROP POLICY IF EXISTS certificates_update_own ON public.certificates;
CREATE POLICY certificates_update_own ON public.certificates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (asset_id IS NULL OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = certificates.asset_id))
  );

-- ------------------------------------------------------------------------------
-- certificate files: anyone who can see the certificate row can open its file
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS certificate_files_client_select ON storage.objects;
CREATE POLICY certificate_files_client_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (SELECT 1 FROM public.certificates c WHERE c.file_path = storage.objects.name)
  );
