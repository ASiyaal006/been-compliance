-- Been Compliance · consumer product (factory) inspections
-- QIMA-style inspection bookings with ISO 2859-1 (AQL) sampling settings.
-- Run in Supabase SQL Editor after the earlier migrations. Safe to run more than once.
--
-- Tables:
--   product_categories   main product groups (seeded below)
--   inspection_templates JSONB checklists per category (a starter template is seeded per category)
--   inspection_orders    client bookings: stage (IPC/DUPRO/PSI/CLC), target date, factory, status
--   defect_logs          issues found on an order: Critical / Major / Minor, description, photo
--
-- Access:
--   Orders and defect logs belong to the user who created them (created_by = auth.uid()).
--   Been admins can see and manage everything. Customer logins can view orders
--   (and their defects) booked for their own client.
--   Categories and templates are readable by any signed-in user; only admins change them.

-- ------------------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_stage') THEN
    CREATE TYPE public.inspection_stage AS ENUM ('IPC', 'DUPRO', 'PSI', 'CLC');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_order_status') THEN
    CREATE TYPE public.inspection_order_status AS ENUM (
      'Requested', 'Confirmed', 'In progress', 'Report issued', 'Cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_severity') THEN
    CREATE TYPE public.defect_severity AS ENUM ('Critical', 'Major', 'Minor');
  END IF;
END
$$;

COMMENT ON TYPE public.inspection_stage IS 'IPC = initial production check, DUPRO = during production, PSI = pre-shipment inspection, CLC = container loading check.';

-- ------------------------------------------------------------------------------
-- updated_at helper
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.product_categories IS 'Consumer product groups inspected at the factory.';

CREATE TABLE IF NOT EXISTS public.inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.product_categories (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  checklist JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, name, version)
);

COMMENT ON TABLE public.inspection_templates IS 'Checklist templates per product category.';
COMMENT ON COLUMN public.inspection_templates.checklist IS
  '{"sections": [{"key": "specifications", "title": "...", "items": ["...", ...]}, ...]}';

CREATE INDEX IF NOT EXISTS inspection_templates_category_idx ON public.inspection_templates (category_id);

CREATE TABLE IF NOT EXISTS public.inspection_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT,
  client_id UUID REFERENCES public.clients (id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.product_categories (id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.inspection_templates (id) ON DELETE SET NULL,
  stage public.inspection_stage NOT NULL,
  status public.inspection_order_status NOT NULL DEFAULT 'Requested',
  target_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  po_number TEXT,
  order_quantity INTEGER CHECK (order_quantity IS NULL OR order_quantity > 0),
  factory_name TEXT NOT NULL,
  factory_address TEXT,
  factory_city TEXT,
  factory_country TEXT,
  factory_contact TEXT,
  -- ISO 2859-1 sampling (general inspection level II, AQL 0 / 2.5 / 4.0 is the common default)
  aql_inspection_level TEXT NOT NULL DEFAULT 'II'
    CHECK (aql_inspection_level IN ('I', 'II', 'III', 'S-1', 'S-2', 'S-3', 'S-4')),
  aql_critical NUMERIC(4, 2) NOT NULL DEFAULT 0,
  aql_major NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  aql_minor NUMERIC(4, 2) NOT NULL DEFAULT 4.0,
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inspection_orders IS 'Factory inspection bookings (IPC / DUPRO / PSI / CLC).';

CREATE INDEX IF NOT EXISTS inspection_orders_created_by_idx ON public.inspection_orders (created_by);
CREATE INDEX IF NOT EXISTS inspection_orders_client_idx ON public.inspection_orders (client_id);
CREATE INDEX IF NOT EXISTS inspection_orders_target_date_idx ON public.inspection_orders (target_date);

CREATE TABLE IF NOT EXISTS public.defect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.inspection_orders (id) ON DELETE CASCADE,
  severity public.defect_severity NOT NULL,
  description TEXT NOT NULL,
  checklist_section TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  photo_url TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.defect_logs IS 'Individual defects found during a product inspection.';
COMMENT ON COLUMN public.defect_logs.quantity IS 'Number of sampled units with this defect.';

CREATE INDEX IF NOT EXISTS defect_logs_order_idx ON public.defect_logs (order_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS product_categories_set_updated_at ON public.product_categories;
CREATE TRIGGER product_categories_set_updated_at BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inspection_templates_set_updated_at ON public.inspection_templates;
CREATE TRIGGER inspection_templates_set_updated_at BEFORE UPDATE ON public.inspection_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inspection_orders_set_updated_at ON public.inspection_orders;
CREATE TRIGGER inspection_orders_set_updated_at BEFORE UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS defect_logs_set_updated_at ON public.defect_logs;
CREATE TRIGGER defect_logs_set_updated_at BEFORE UPDATE ON public.defect_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- Row Level Security
-- (uses is_been_compliance_admin() / current_user_client_id() from 20261007170000)
-- ------------------------------------------------------------------------------

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_logs ENABLE ROW LEVEL SECURITY;

-- product_categories: everyone signed in reads, admins manage
DROP POLICY IF EXISTS product_categories_select ON public.product_categories;
CREATE POLICY product_categories_select ON public.product_categories
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS product_categories_admin ON public.product_categories;
CREATE POLICY product_categories_admin ON public.product_categories
  FOR ALL TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

-- inspection_templates: everyone signed in reads, admins manage
DROP POLICY IF EXISTS inspection_templates_select ON public.inspection_templates;
CREATE POLICY inspection_templates_select ON public.inspection_templates
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS inspection_templates_admin ON public.inspection_templates;
CREATE POLICY inspection_templates_admin ON public.inspection_templates
  FOR ALL TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

-- inspection_orders: owner manages, admins manage all, customers view their client's orders
DROP POLICY IF EXISTS inspection_orders_owner ON public.inspection_orders;
CREATE POLICY inspection_orders_owner ON public.inspection_orders
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    -- a customer can only book against their own client
    AND (
      client_id IS NULL
      OR client_id = public.current_user_client_id()
      OR public.is_been_compliance_admin()
    )
  );

DROP POLICY IF EXISTS inspection_orders_admin ON public.inspection_orders;
CREATE POLICY inspection_orders_admin ON public.inspection_orders
  FOR ALL TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

DROP POLICY IF EXISTS inspection_orders_client_select ON public.inspection_orders;
CREATE POLICY inspection_orders_client_select ON public.inspection_orders
  FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND client_id = public.current_user_client_id());

-- defect_logs: owner of the log AND able to see the order; admins all; customers view via order
DROP POLICY IF EXISTS defect_logs_owner ON public.defect_logs;
CREATE POLICY defect_logs_owner ON public.defect_logs
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.inspection_orders o WHERE o.id = defect_logs.order_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.inspection_orders o
      WHERE o.id = defect_logs.order_id
        AND (o.created_by = auth.uid() OR public.is_been_compliance_admin())
    )
  );

DROP POLICY IF EXISTS defect_logs_admin ON public.defect_logs;
CREATE POLICY defect_logs_admin ON public.defect_logs
  FOR ALL TO authenticated
  USING (public.is_been_compliance_admin())
  WITH CHECK (public.is_been_compliance_admin());

DROP POLICY IF EXISTS defect_logs_order_select ON public.defect_logs;
CREATE POLICY defect_logs_order_select ON public.defect_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspection_orders o WHERE o.id = defect_logs.order_id));

REVOKE ALL ON public.product_categories, public.inspection_templates,
  public.inspection_orders, public.defect_logs FROM anon;
GRANT SELECT ON public.product_categories, public.inspection_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_categories, public.inspection_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_orders, public.defect_logs TO authenticated;

-- ------------------------------------------------------------------------------
-- Seed: categories and a starter checklist for each
-- ------------------------------------------------------------------------------

INSERT INTO public.product_categories (name, sort_order) VALUES
  ('Apparel, footwear, bags, and home textiles', 1),
  ('Furniture, homeware, gifts, and sports equipment', 2),
  ('Electrical and electronic products', 3),
  ('Toys and juvenile products', 4),
  ('Packaging and promotional merchandise', 5)
ON CONFLICT (name) DO NOTHING;

WITH t (category, checklist) AS (
  VALUES
  ('Apparel, footwear, bags, and home textiles', $json${"sections": [
    {"key": "specifications", "title": "Specifications", "items": ["Style, colour and size breakdown match the PO", "Fabric, trims and accessories match the approved sample", "Labels: care, fibre content, size and country of origin"]},
    {"key": "dimensions", "title": "Dimensions", "items": ["Garment / product measurements within tolerance of the size spec", "Shoe sizes and bag dimensions checked against spec"]},
    {"key": "function", "title": "Function", "items": ["Zips, buttons, snaps, buckles and velcro work", "Seam strength / pull test on attachments"]},
    {"key": "appearance", "title": "Appearance", "items": ["Colour shade consistent with the approved sample", "No stains, marks, holes or shading"]},
    {"key": "performance", "title": "Performance", "items": ["Colour fastness (rub test)", "Moisture content where required"]},
    {"key": "workmanship", "title": "Workmanship", "items": ["Stitching even, no skipped or broken stitches", "No loose threads, puckering or open seams", "Sole bonding / bag handles secure"]},
    {"key": "packaging", "title": "Packaging", "items": ["Folding, polybag and hangtag per instructions", "Carton marks, quantities and assortment correct", "Carton drop test"]}
  ]}$json$::jsonb),
  ('Furniture, homeware, gifts, and sports equipment', $json${"sections": [
    {"key": "specifications", "title": "Specifications", "items": ["Model, material and finish match the PO and approved sample", "Assembly instructions, hardware pack and warning labels present"]},
    {"key": "dimensions", "title": "Dimensions", "items": ["Overall dimensions and weight within tolerance"]},
    {"key": "function", "title": "Function", "items": ["Trial assembly completed without issues", "Moving parts (drawers, hinges, folding mechanisms) operate smoothly"]},
    {"key": "appearance", "title": "Appearance", "items": ["Finish, colour and coating even; no scratches, dents or chips"]},
    {"key": "performance", "title": "Performance", "items": ["Stability / tip-over check", "Load or static weight test where applicable"]},
    {"key": "workmanship", "title": "Workmanship", "items": ["Joints, welds and fixings secure", "No sharp edges or points"]},
    {"key": "packaging", "title": "Packaging", "items": ["Protective packing adequate (corners, foam)", "Carton marks and quantities correct", "Carton drop test"]}
  ]}$json$::jsonb),
  ('Electrical and electronic products', $json${"sections": [
    {"key": "specifications", "title": "Specifications", "items": ["Model, rating plate and voltage/frequency match the market", "Plug type and cable length correct", "UKCA/CE marks, WEEE symbol, manual and warnings present"]},
    {"key": "dimensions", "title": "Dimensions", "items": ["Product dimensions and weight within tolerance"]},
    {"key": "function", "title": "Function", "items": ["Full function test of all modes and controls", "Battery / charging function where applicable"]},
    {"key": "appearance", "title": "Appearance", "items": ["Housing free from cracks, scratches and gaps"]},
    {"key": "performance", "title": "Performance", "items": ["Hi-pot (dielectric strength) test", "Earth continuity test (Class I)", "Power consumption / input current check"]},
    {"key": "workmanship", "title": "Workmanship", "items": ["Internal check: wiring, soldering, strain relief", "Screws and fixings complete and tight"]},
    {"key": "packaging", "title": "Packaging", "items": ["Accessories and manual included", "Retail box print and barcode scan", "Carton drop test"]}
  ]}$json$::jsonb),
  ('Toys and juvenile products', $json${"sections": [
    {"key": "specifications", "title": "Specifications", "items": ["Item, colours and age grading match the PO", "UKCA/CE mark, age warning and traceability markings present"]},
    {"key": "dimensions", "title": "Dimensions", "items": ["Product dimensions within tolerance"]},
    {"key": "function", "title": "Function", "items": ["All functions, sounds and lights work", "Battery compartment secured by screw where required"]},
    {"key": "appearance", "title": "Appearance", "items": ["Paint and print clean, no flaking or smudges"]},
    {"key": "performance", "title": "Performance", "items": ["Small parts cylinder check (under 36 months)", "Torque and tension test on attached parts", "Sharp edge and sharp point check"]},
    {"key": "workmanship", "title": "Workmanship", "items": ["Seams on soft toys secure, no stuffing leaks", "No burrs or loose parts"]},
    {"key": "packaging", "title": "Packaging", "items": ["Suffocation warning on polybags", "Retail packaging and barcode correct", "Carton marks and quantities correct"]}
  ]}$json$::jsonb),
  ('Packaging and promotional merchandise', $json${"sections": [
    {"key": "specifications", "title": "Specifications", "items": ["Material, colour and branding match the approved artwork", "Pantone / logo position and size correct"]},
    {"key": "dimensions", "title": "Dimensions", "items": ["Dimensions and board/material thickness within tolerance"]},
    {"key": "function", "title": "Function", "items": ["Closures, folds and assembly work as intended"]},
    {"key": "appearance", "title": "Appearance", "items": ["Print sharp and registered; no smears, scuffs or colour variation"]},
    {"key": "performance", "title": "Performance", "items": ["Print adhesion (tape) test", "Barcode scan grade"]},
    {"key": "workmanship", "title": "Workmanship", "items": ["Gluing, cutting and edges clean"]},
    {"key": "packaging", "title": "Packaging", "items": ["Inner packs and carton quantities correct", "Carton marks correct"]}
  ]}$json$::jsonb)
)
INSERT INTO public.inspection_templates (category_id, name, version, checklist)
SELECT c.id, 'Standard checklist', 1, t.checklist
FROM t JOIN public.product_categories c ON c.name = t.category
ON CONFLICT (category_id, name, version) DO NOTHING;
