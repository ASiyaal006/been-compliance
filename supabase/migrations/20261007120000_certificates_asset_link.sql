-- Been Compliance · link uploaded certificates to assets in the register
-- Run in Supabase SQL Editor (or: supabase db push).

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.certificates.asset_id IS
  'Asset matched by serial number when the certificate was saved. NULL when no single asset matched.';

CREATE INDEX IF NOT EXISTS certificates_asset_id_idx ON public.certificates (asset_id);
