-- Been Compliance · allow users to delete their own uploaded certificates
-- Run in Supabase SQL Editor (or: supabase db push).

DROP POLICY IF EXISTS certificates_delete_own ON public.certificates;

CREATE POLICY certificates_delete_own ON public.certificates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT DELETE ON public.certificates TO authenticated;
