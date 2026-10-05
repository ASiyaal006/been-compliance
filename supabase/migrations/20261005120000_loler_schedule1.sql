-- Been Compliance · LOLER sub-types and Schedule 1 report details
-- Run in Supabase SQL Editor after the earlier migrations (or: supabase db push).
--
-- 1. LOLER sub-types so the 6-month interval applies to people-lifting equipment
--    and lifting accessories. Plain 'LOLER' stays valid for existing assets.
-- 2. Extra fields so the thorough examination report covers LOLER Schedule 1.
-- All new columns are nullable, so existing rows keep working.

-- ------------------------------------------------------------------------------
-- Machinery types
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
      'PSSR',
      'COSHH',
      'Other'
    )
  );

-- ------------------------------------------------------------------------------
-- Clients: employer address (Schedule 1, item 1)
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

-- ------------------------------------------------------------------------------
-- Assets: identifying particulars (Schedule 1, item 3)
-- ------------------------------------------------------------------------------

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS manufacture_date TEXT;

COMMENT ON COLUMN public.assets.description IS 'Make, model and type of equipment.';
COMMENT ON COLUMN public.assets.manufacture_date IS 'Date or year of manufacture, where known.';

-- ------------------------------------------------------------------------------
-- Inspections: report details (Schedule 1, items 4 to 9)
-- ------------------------------------------------------------------------------

ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS reason_for_exam TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS examiner_name TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS examiner_qualifications TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS examiner_employer TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS defects TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS defect_remedy_by DATE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS test_details TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS next_examination_due DATE;

COMMENT ON COLUMN public.inspections.reason_for_exam IS 'Why the thorough examination was carried out (interval, exam scheme, exceptional circumstances, after installation).';
COMMENT ON COLUMN public.inspections.examiner_employer IS 'Name and address of the competent person''s employer (or "Self-employed" with address).';
COMMENT ON COLUMN public.inspections.defects IS 'Defects found, and repair, renewal or alteration required.';
COMMENT ON COLUMN public.inspections.defect_remedy_by IS 'Date by which a defect that could become a danger must be remedied.';
COMMENT ON COLUMN public.inspections.next_examination_due IS 'Latest date for the next thorough examination, as stated on this report.';
