-- Been Compliance · automatic due-date reminder emails
-- Run in Supabase SQL Editor after the earlier migrations (or: supabase db push).
-- Safe to run more than once.
--
-- due_reminders   one row per reminder already emailed for an asset's due date, so the daily
--                 job never sends the same reminder twice. A new due date (after the next
--                 inspection) starts the reminders again.
--
-- Stages: '30_days' (due within 30 days), '7_days' (due within 7 days), 'overdue'.
-- Only the app's server (service role) writes here; Been Compliance admins can read it.

CREATE TABLE IF NOT EXISTS public.due_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('30_days', '7_days', 'overdue')),
  customer_emails TEXT[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, due_date, stage)
);

COMMENT ON TABLE public.due_reminders IS 'Due-date reminder emails already sent, one per asset, due date and stage.';
COMMENT ON COLUMN public.due_reminders.customer_emails IS 'Customer addresses the reminder went to (empty when the client has no login yet).';

CREATE INDEX IF NOT EXISTS due_reminders_asset_idx ON public.due_reminders (asset_id, due_date);

ALTER TABLE public.due_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS due_reminders_admin_select ON public.due_reminders;
CREATE POLICY due_reminders_admin_select ON public.due_reminders
  FOR SELECT TO authenticated
  USING (public.is_been_compliance_admin());

REVOKE ALL ON public.due_reminders FROM anon, authenticated;
GRANT SELECT ON public.due_reminders TO authenticated;
GRANT ALL ON public.due_reminders TO service_role;
