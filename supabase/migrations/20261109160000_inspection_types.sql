-- Been Compliance · PUWER inspections, electrical (PAT) testing and load tests
-- Run in Supabase SQL Editor after the earlier migrations (or: supabase db push).
-- Safe to run more than once. Existing assets and inspections keep working:
-- inspections with no type are LOLER thorough examinations.

-- ------------------------------------------------------------------------------
-- Assets: two new equipment types
-- ------------------------------------------------------------------------------

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_machinery_type_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_machinery_type_check
  CHECK (
    machinery_type IN (
      'LOLER (Personnel)',
      'LOLER (Accessory)',
      'LOLER (Standard)',
      'LOLER',
      'PUWER',
      'Electrical',
      'PSSR',
      'COSHH',
      'Other'
    )
  );

-- ------------------------------------------------------------------------------
-- Inspections: which kind of inspection, and its structured results
-- ------------------------------------------------------------------------------

ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS inspection_type TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS test_results JSONB;

ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_inspection_type_check;

ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_inspection_type_check
  CHECK (
    inspection_type IS NULL
    OR inspection_type IN ('Thorough examination', 'PUWER inspection', 'Electrical test', 'Load test')
  );

COMMENT ON COLUMN public.inspections.inspection_type IS 'Thorough examination (LOLER), PUWER inspection, Electrical test (PAT) or Load test. NULL means Thorough examination.';
COMMENT ON COLUMN public.inspections.test_results IS 'Structured results for the inspection type: PUWER checks, PAT readings or load test details.';
