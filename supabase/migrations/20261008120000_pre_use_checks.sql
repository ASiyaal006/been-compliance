-- Been Compliance · routine pre-use checks
-- Quick operator checks before equipment is used (LOLER regulation 9(3)/PUWER
-- inspections). They are recorded against the asset but never change
-- assets.next_inspection_due: only a thorough examination resets that clock.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.pre_use_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  checked_on DATE NOT NULL,
  checked_by TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('OK', 'Fault')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  fault_notes TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pre_use_checks IS 'Routine pre-use checks by operators. Do not reset the thorough examination due date.';
COMMENT ON COLUMN public.pre_use_checks.items IS 'Checklist answers: [{"item": "...", "answer": "OK" | "Fault" | "N/A"}].';

CREATE INDEX IF NOT EXISTS pre_use_checks_asset_checked_on_idx
  ON public.pre_use_checks (asset_id, checked_on DESC, created_at DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security: anyone who can see the asset can see and add its checks.
-- The assets table's own policies (admin + customer) decide who that is.
-- ------------------------------------------------------------------------------

ALTER TABLE public.pre_use_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pre_use_checks_select ON public.pre_use_checks;
CREATE POLICY pre_use_checks_select ON public.pre_use_checks
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = pre_use_checks.asset_id));

DROP POLICY IF EXISTS pre_use_checks_insert ON public.pre_use_checks;
CREATE POLICY pre_use_checks_insert ON public.pre_use_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.assets a WHERE a.id = pre_use_checks.asset_id)
  );

DROP POLICY IF EXISTS pre_use_checks_delete ON public.pre_use_checks;
CREATE POLICY pre_use_checks_delete ON public.pre_use_checks
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.assets a WHERE a.id = pre_use_checks.asset_id)
  );

REVOKE ALL ON public.pre_use_checks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pre_use_checks TO authenticated;
