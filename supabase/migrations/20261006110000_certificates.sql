-- Been Compliance · certificates parsed from uploaded documents
-- Matches parsedDocumentSchema in src/lib/types/parsed-document.ts
-- Run in Supabase SQL Editor (or: supabase db push).

-- ------------------------------------------------------------------------------
-- Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- parsedDocumentSchema fields (camelCase → snake_case)
  asset_name TEXT NOT NULL DEFAULT '',
  serial_or_model_number TEXT NOT NULL DEFAULT '',
  inspection_date DATE,
  expiry_date DATE,
  inspector_or_company TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Unknown' CHECK (
    status IN ('Pass', 'Fail', 'Monitor', 'Unknown')
  ),
  client_name TEXT NOT NULL DEFAULT '',
  site_location TEXT NOT NULL DEFAULT '',
  machinery_type TEXT NOT NULL DEFAULT 'Unknown' CHECK (
    machinery_type IN ('LOLER', 'PSSR', 'COSHH', 'Other', 'Unknown')
  ),
  certificate_reference TEXT NOT NULL DEFAULT '',
  examiner_notes TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE public.certificates IS
  'Parsed compliance certificates owned by the authenticated user who uploaded them.';
COMMENT ON COLUMN public.certificates.inspection_date IS
  'YYYY-MM-DD from parsedDocumentSchema.inspectionDate. NULL when the parser returns an empty string.';
COMMENT ON COLUMN public.certificates.expiry_date IS
  'YYYY-MM-DD from parsedDocumentSchema.expiryDate. NULL when the parser returns an empty string.';

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON public.certificates (user_id);
CREATE INDEX IF NOT EXISTS certificates_user_created_at_idx
  ON public.certificates (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security — a user may only insert, view, and update their own rows
-- ------------------------------------------------------------------------------

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificates_insert_own ON public.certificates;
DROP POLICY IF EXISTS certificates_select_own ON public.certificates;
DROP POLICY IF EXISTS certificates_update_own ON public.certificates;

CREATE POLICY certificates_insert_own ON public.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY certificates_select_own ON public.certificates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY certificates_update_own ON public.certificates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.certificates TO authenticated;
