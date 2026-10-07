-- Been Compliance · keep the original certificate file (PDF or photo)
-- Run in Supabase SQL Editor (or: supabase db push).
--
-- Files live in a private Storage bucket at "<user id>/<random id>.<ext>".
-- The app opens them through short-lived signed links, never public URLs.

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS file_path TEXT;

COMMENT ON COLUMN public.certificates.file_path IS
  'Path of the original uploaded file in the private "certificates" Storage bucket.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  FALSE,
  20971520, -- 20 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS certificate_files_insert_own ON storage.objects;
DROP POLICY IF EXISTS certificate_files_select ON storage.objects;
DROP POLICY IF EXISTS certificate_files_delete ON storage.objects;

-- Users upload into their own folder only.
CREATE POLICY certificate_files_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users read their own files (matching the certificates table, which is owner-only).
CREATE POLICY certificate_files_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY certificate_files_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
