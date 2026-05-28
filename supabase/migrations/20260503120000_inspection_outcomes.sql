-- Extend inspection outcomes to Pass / Fail / Monitor (keeps legacy Compliant / Defect if present).
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_outcome_check;

ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_outcome_check
  CHECK (outcome IN ('Pass', 'Fail', 'Monitor', 'Compliant', 'Defect'));
