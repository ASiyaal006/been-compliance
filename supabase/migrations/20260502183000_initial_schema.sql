-- Been Compliance · core schema for clients, assets, inspections
-- Run in Supabase: SQL Editor → New query → paste → Run,
-- or: supabase db push / linked CLI when you use Supabase CLI.

-- ------------------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------------------

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.clients IS 'Client organisations that own inspected assets.';

CREATE UNIQUE INDEX clients_name_unique ON public.clients (lower(trim(name)));

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  asset_id_serial TEXT NOT NULL,
  machinery_type TEXT NOT NULL CHECK (
    machinery_type IN ('LOLER', 'PSSR', 'COSHH', 'Other')
  ),
  site_location TEXT NOT NULL,
  commissioning_date DATE NOT NULL,
  next_inspection_due DATE,
  swl TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.assets IS 'Registered plant / machinery under statutory regimes.';

CREATE UNIQUE INDEX asset_client_serial_unique ON public.assets (client_id, lower(trim(asset_id_serial)));

CREATE INDEX assets_client_id_idx ON public.assets (client_id);

CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('Compliant', 'Defect')),
  reference TEXT,
  examiner_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inspections IS 'Statutory inspections and outcomes per asset over time.';

CREATE INDEX inspections_asset_inspection_date_idx ON public.inspections (asset_id, inspection_date DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security — tighten before production (use Supabase Auth + scoped policies).
-- For now: API access should use SERVICE_ROLE_KEY only server-side (bypasses RLS).
-- Anon/authenticated callers are denied until you add intentional policies.
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- No policies ⇒ only service role / bypass can read/write via server.
