-- Been Compliance · proof the inspector was on site
-- Run in Supabase SQL Editor after the product inspection results migration. Safe to run more than once.
--
-- 1. "Start inspection" records when and where (browser GPS) the inspection began.
--    The database sets the time itself and never lets the start time or location change afterwards,
--    so they can't be edited later, even outside the app.
-- 2. Every new defect must have a photo. Defects logged before this change keep working.

ALTER TABLE public.inspection_orders
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS start_accuracy_m DOUBLE PRECISION;

ALTER TABLE public.inspection_orders
  DROP CONSTRAINT IF EXISTS inspection_orders_start_location_check;
ALTER TABLE public.inspection_orders
  ADD CONSTRAINT inspection_orders_start_location_check CHECK (
    (started_at IS NULL AND start_latitude IS NULL AND start_longitude IS NULL AND start_accuracy_m IS NULL)
    OR (
      started_at IS NOT NULL
      AND start_latitude IS NOT NULL
      AND start_longitude IS NOT NULL
      AND start_latitude BETWEEN -90 AND 90
      AND start_longitude BETWEEN -180 AND 180
      AND (start_accuracy_m IS NULL OR start_accuracy_m >= 0)
    )
  );

COMMENT ON COLUMN public.inspection_orders.started_at IS
  'When the inspector pressed Start inspection (set by the database, never changes).';
COMMENT ON COLUMN public.inspection_orders.start_latitude IS
  'Device latitude when the inspection started (browser geolocation).';
COMMENT ON COLUMN public.inspection_orders.start_longitude IS
  'Device longitude when the inspection started (browser geolocation).';
COMMENT ON COLUMN public.inspection_orders.start_accuracy_m IS
  'Accuracy of the start location in metres, as reported by the device.';

-- The start time comes from the database clock, and once recorded the start can't be changed.
CREATE OR REPLACE FUNCTION public.inspection_orders_lock_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.started_at IS NOT NULL THEN
    NEW.started_at := OLD.started_at;
    NEW.start_latitude := OLD.start_latitude;
    NEW.start_longitude := OLD.start_longitude;
    NEW.start_accuracy_m := OLD.start_accuracy_m;
  ELSIF NEW.started_at IS NOT NULL THEN
    NEW.started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspection_orders_lock_start ON public.inspection_orders;
CREATE TRIGGER inspection_orders_lock_start
  BEFORE INSERT OR UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.inspection_orders_lock_start();

-- New defects need a photo. NOT VALID leaves defects logged before this change alone.
ALTER TABLE public.defect_logs
  DROP CONSTRAINT IF EXISTS defect_logs_photo_required;
ALTER TABLE public.defect_logs
  ADD CONSTRAINT defect_logs_photo_required CHECK (photo_url IS NOT NULL) NOT VALID;
