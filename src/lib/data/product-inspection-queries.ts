import "server-only";

import { isMissingTableError } from "@/lib/data/pre-use-check-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";
import type { InspectionStage, OrderStatus } from "@/lib/types/product-inspection";

export type ProductOrderRow = {
  id: string;
  reference: string | null;
  productName: string;
  categoryName: string;
  clientName: string | null;
  stage: InspectionStage;
  status: OrderStatus;
  targetDate: string;
  targetDateUk: string;
  factory: string;
};

export type BookingFormOptions = {
  categories: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  isAdmin: boolean;
  /** The customer's own client, when the user is not an admin. */
  ownClientId: string | null;
  notSetUp: boolean;
};

function formatUk(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  );
}

type OrderListRow = {
  id: string;
  reference: string | null;
  product_name: string;
  stage: InspectionStage;
  status: OrderStatus;
  target_date: string;
  factory_name: string;
  factory_city: string | null;
  factory_country: string | null;
  product_categories: { name: string } | null;
  clients: { name: string } | null;
};

export async function fetchProductOrders(): Promise<{ orders: ProductOrderRow[]; notSetUp: boolean }> {
  const { supabase } = await requireAuthenticatedContext();

  const { data, error } = await supabase
    .from("inspection_orders")
    .select(
      "id, reference, product_name, stage, status, target_date, factory_name, factory_city, factory_country, product_categories ( name ), clients ( name )",
    )
    .order("target_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return { orders: [], notSetUp: true };
    throw new Error(`Could not load inspection bookings: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as OrderListRow[];
  return {
    notSetUp: false,
    orders: rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      productName: r.product_name,
      categoryName: r.product_categories?.name ?? "",
      clientName: r.clients?.name ?? null,
      stage: r.stage,
      status: r.status,
      targetDate: r.target_date,
      targetDateUk: formatUk(r.target_date),
      factory: [r.factory_name, r.factory_city, r.factory_country].filter(Boolean).join(", "),
    })),
  };
}

export async function fetchBookingFormOptions(): Promise<BookingFormOptions> {
  const { supabase, profile } = await requireAuthenticatedContext();

  const [cats, clients] = await Promise.all([
    supabase.from("product_categories").select("id, name").order("sort_order").order("name"),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  if (cats.error) {
    if (isMissingTableError(cats.error)) {
      return { categories: [], clients: [], isAdmin: profile.isBeenAdmin, ownClientId: profile.clientId, notSetUp: true };
    }
    throw new Error(`Could not load product categories: ${cats.error.message}`);
  }
  if (clients.error) {
    throw new Error(`Could not load clients: ${clients.error.message}`);
  }

  return {
    categories: cats.data ?? [],
    clients: clients.data ?? [],
    isAdmin: profile.isBeenAdmin,
    ownClientId: profile.clientId,
    notSetUp: false,
  };
}
