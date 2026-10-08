"use server";

import { revalidatePath } from "next/cache";
import { approvedFor, parseRegions } from "@/lib/contractors";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { requireAuthenticatedContext, type AuthenticatedContext } from "@/lib/supabase/auth";

type Fail = { ok: false; error: string };

const NOT_SET_UP = "Contractors aren't set up in the database yet. Run the contractors SQL in Supabase first.";

async function adminContext(): Promise<{ ok: true; ctx: AuthenticatedContext } | Fail> {
  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to do this." };
  }
  if (!ctx.profile.isBeenAdmin) return { ok: false, error: "Only Been Compliance admins can do this." };
  return { ok: true, ctx };
}

function dbError(error: { code?: string; message: string }): string {
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST202" || error.code === "42703") {
    return NOT_SET_UP;
  }
  return error.message;
}

export type AddContractorInput = {
  email: string;
  name: string;
  regions: string;
  categoryIds: string[];
};

export async function addContractor(raw: AddContractorInput): Promise<{ ok: true } | Fail> {
  const email = raw.email.trim();
  const name = raw.name.trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter the contractor's login email." };
  if (!name) return { ok: false, error: "Enter the contractor's name." };
  const categoryIds = [...new Set(raw.categoryIds.filter(looksLikeUuid))];

  const auth = await adminContext();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  const { data: users, error: lookupError } = await supabase.rpc("find_user_by_email", { p_email: email });
  if (lookupError) return { ok: false, error: dbError(lookupError) };
  const found = users?.[0];
  if (!found) {
    return {
      ok: false,
      error: "No login uses that email yet. Create one in Supabase (Authentication, then Add user), then add them here.",
    };
  }

  const { error } = await supabase.from("contractors").insert({
    user_id: found.id,
    name,
    regions: parseRegions(raw.regions),
    approved_categories: categoryIds,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That person is already a contractor." };
    return { ok: false, error: dbError(error) };
  }

  revalidatePath("/admin/contractors");
  revalidatePath("/admin/dispatch");
  return { ok: true };
}

export async function removeContractor(contractorId: string): Promise<{ ok: true } | Fail> {
  if (!looksLikeUuid(contractorId)) return { ok: false, error: "Invalid contractor." };
  const auth = await adminContext();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  // Jobs they haven't started go back on the board.
  const { error: releaseError } = await supabase
    .from("inspection_orders")
    .update({ contractor_id: null, status: "Requested" })
    .eq("contractor_id", contractorId)
    .eq("status", "Confirmed");
  if (releaseError) return { ok: false, error: dbError(releaseError) };

  const { error } = await supabase.from("contractors").delete().eq("id", contractorId);
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/admin/contractors");
  revalidatePath("/admin/dispatch");
  return { ok: true };
}

/** Assigns a contractor to a requested or confirmed booking (Confirmed), or unassigns it (back to Requested). */
export async function assignContractor(orderId: string, contractorId: string | null): Promise<{ ok: true } | Fail> {
  if (!looksLikeUuid(orderId)) return { ok: false, error: "Invalid booking." };
  if (contractorId !== null && !looksLikeUuid(contractorId)) return { ok: false, error: "Choose a contractor." };

  const auth = await adminContext();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  const { data: order, error: orderError } = await supabase
    .from("inspection_orders")
    .select("status, category_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: dbError(orderError) };
  if (!order) return { ok: false, error: "Booking not found." };
  if (order.status !== "Requested" && order.status !== "Confirmed") {
    return { ok: false, error: "This inspection has already started, so it can't be reassigned here." };
  }

  if (contractorId) {
    const { data: contractor, error: cError } = await supabase
      .from("contractors")
      .select("approved_categories")
      .eq("id", contractorId)
      .maybeSingle();
    if (cError) return { ok: false, error: dbError(cError) };
    if (!contractor) return { ok: false, error: "Contractor not found." };
    if (!approvedFor(contractor.approved_categories ?? [], order.category_id)) {
      return { ok: false, error: "That contractor isn't approved for this product category." };
    }
  }

  const { error } = await supabase
    .from("inspection_orders")
    .update({ contractor_id: contractorId, status: contractorId ? "Confirmed" : "Requested" })
    .eq("id", orderId)
    .in("status", ["Requested", "Confirmed"]);
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/admin/dispatch");
  revalidatePath("/inspector/queue");
  revalidatePath("/product-inspections");
  revalidatePath(`/product-inspections/${orderId}`);
  return { ok: true };
}
