-- Been Compliance · contractor dispatch
-- Run in Supabase SQL Editor after the inspection start location migration. Safe to run more than once.
--
-- contractors            freelance inspectors: their login, regions and approved product categories
-- inspection_orders      gains contractor_id (set by an admin on the dispatch board)
--
-- Access:
--   admins manage contractors and assign jobs;
--   a contractor sees only their own contractor record and the jobs assigned to them,
--   and can carry out those inspections (checklist, start, defects) but not change the booking itself.

CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  regions TEXT[] NOT NULL DEFAULT '{}',
  approved_categories UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contractors IS 'Freelance inspectors who can be dispatched to product inspections.';
COMMENT ON COLUMN public.contractors.regions IS 'Countries or cities the contractor covers, e.g. {China, Vietnam}.';
COMMENT ON COLUMN public.contractors.approved_categories IS
  'product_categories ids the contractor may inspect. Empty means every category.';

DROP TRIGGER IF EXISTS contractors_set_updated_at ON public.contractors;
CREATE TRIGGER contractors_set_updated_at BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inspection_orders
  ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES public.contractors (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inspection_orders_contractor_idx ON public.inspection_orders (contractor_id);

-- The signed-in user's contractor id, or NULL.
CREATE OR REPLACE FUNCTION public.current_contractor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_contractor_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_contractor_id() TO authenticated, service_role;

-- Admins look up an existing login by email when adding a contractor.
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_been_compliance_admin() THEN
    RAISE EXCEPTION 'Only Been Compliance admins can look up users.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, p.full_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(p_email))
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------------------

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contractors_admin ON public.contractors;
CREATE POLICY contractors_admin ON public.contractors
  FOR ALL TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

DROP POLICY IF EXISTS contractors_self_select ON public.contractors;
CREATE POLICY contractors_self_select ON public.contractors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.contractors FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;

-- Contractors see and work on the jobs assigned to them.
DROP POLICY IF EXISTS inspection_orders_contractor_select ON public.inspection_orders;
CREATE POLICY inspection_orders_contractor_select ON public.inspection_orders
  FOR SELECT TO authenticated
  USING (contractor_id IS NOT NULL AND contractor_id = public.current_contractor_id());

DROP POLICY IF EXISTS inspection_orders_contractor_update ON public.inspection_orders;
CREATE POLICY inspection_orders_contractor_update ON public.inspection_orders
  FOR UPDATE TO authenticated
  USING (contractor_id IS NOT NULL AND contractor_id = public.current_contractor_id())
  WITH CHECK (contractor_id IS NOT NULL AND contractor_id = public.current_contractor_id());

-- Only admins assign contractors; a contractor may fill in the inspection but not edit the booking.
CREATE OR REPLACE FUNCTION public.inspection_orders_guard_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Direct database sessions (SQL Editor, service role) have no signed-in user.
  IF auth.uid() IS NULL OR public.is_been_compliance_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.contractor_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only Been Compliance admins can assign a contractor.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.contractor_id IS DISTINCT FROM OLD.contractor_id THEN
    RAISE EXCEPTION 'Only Been Compliance admins can assign a contractor.' USING ERRCODE = '42501';
  END IF;

  -- The assigned contractor (not the person who booked it) can only change the inspection itself.
  IF OLD.created_by IS DISTINCT FROM auth.uid() AND (
    NEW.reference IS DISTINCT FROM OLD.reference
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.stage IS DISTINCT FROM OLD.stage
    OR NEW.target_date IS DISTINCT FROM OLD.target_date
    OR NEW.product_name IS DISTINCT FROM OLD.product_name
    OR NEW.po_number IS DISTINCT FROM OLD.po_number
    OR NEW.factory_name IS DISTINCT FROM OLD.factory_name
    OR NEW.factory_address IS DISTINCT FROM OLD.factory_address
    OR NEW.factory_city IS DISTINCT FROM OLD.factory_city
    OR NEW.factory_country IS DISTINCT FROM OLD.factory_country
    OR NEW.factory_contact IS DISTINCT FROM OLD.factory_contact
    OR NEW.aql_inspection_level IS DISTINCT FROM OLD.aql_inspection_level
    OR NEW.aql_critical IS DISTINCT FROM OLD.aql_critical
    OR NEW.aql_major IS DISTINCT FROM OLD.aql_major
    OR NEW.aql_minor IS DISTINCT FROM OLD.aql_minor
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR (NEW.status IN ('Requested', 'Confirmed', 'Cancelled') AND NEW.status IS DISTINCT FROM OLD.status)
  ) THEN
    RAISE EXCEPTION 'Contractors can only fill in the inspection, not change the booking.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspection_orders_guard_dispatch ON public.inspection_orders;
CREATE TRIGGER inspection_orders_guard_dispatch
  BEFORE INSERT OR UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.inspection_orders_guard_dispatch();

-- Defects: the assigned contractor can log them too.
DROP POLICY IF EXISTS defect_logs_owner ON public.defect_logs;
CREATE POLICY defect_logs_owner ON public.defect_logs
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.inspection_orders o WHERE o.id = defect_logs.order_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.inspection_orders o
      WHERE o.id = defect_logs.order_id
        AND (
          o.created_by = auth.uid()
          OR public.is_been_compliance_admin()
          OR (o.contractor_id IS NOT NULL AND o.contractor_id = public.current_contractor_id())
        )
    )
  );
