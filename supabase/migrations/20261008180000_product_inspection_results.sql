-- Been Compliance · carrying out a product inspection
-- Run in Supabase SQL Editor after the product inspections migration. Safe to run more than once.
--
-- Adds the inspector's checklist answers and the final result to inspection_orders,
-- and a private Storage bucket for defect photos.
-- defect_logs.photo_url holds the photo's Storage path, opened through short-lived signed links.

ALTER TABLE public.inspection_orders
  ADD COLUMN IF NOT EXISTS inspection_date DATE,
  ADD COLUMN IF NOT EXISTS inspector_name TEXT,
  ADD COLUMN IF NOT EXISTS checklist_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inspection_result TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.inspection_orders
  DROP CONSTRAINT IF EXISTS inspection_orders_inspection_result_check;
ALTER TABLE public.inspection_orders
  ADD CONSTRAINT inspection_orders_inspection_result_check
  CHECK (inspection_result IS NULL OR inspection_result IN ('Pass', 'Fail'));

COMMENT ON COLUMN public.inspection_orders.checklist_results IS
  '{"<section key>.<item index>": {"answer": "Pass" | "Fail" | "N/A", "note": "..."}}';
COMMENT ON COLUMN public.inspection_orders.inspection_result IS
  'Overall result when the inspection is completed: Pass or Fail (AQL and checklist).';

-- ------------------------------------------------------------------------------
-- Defect photos (private bucket, files at "<user id>/<order id>/<random id>.<ext>")
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'defect-photos',
  'defect-photos',
  FALSE,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS defect_photos_insert_own ON storage.objects;
DROP POLICY IF EXISTS defect_photos_select ON storage.objects;
DROP POLICY IF EXISTS defect_photos_delete_own ON storage.objects;

-- Inspectors upload into their own folder only.
CREATE POLICY defect_photos_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'defect-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone who can see the defect (its owner, admins, the order's client) can see its photo.
CREATE POLICY defect_photos_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'defect-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.defect_logs d WHERE d.photo_url = storage.objects.name)
    )
  );

CREATE POLICY defect_photos_delete_own ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'defect-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
