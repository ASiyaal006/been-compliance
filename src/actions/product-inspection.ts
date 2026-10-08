"use server";

import { revalidatePath } from "next/cache";
import { assessAql } from "@/lib/aql";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { findContractorForUser } from "@/lib/contractors";
import { DEFECT_PHOTOS_BUCKET, isOwnDefectPhotoPath } from "@/lib/defect-photos";
import { todayUk } from "@/lib/expiry";
import { profileAccessError, requireAuthenticatedContext, type AuthenticatedContext } from "@/lib/supabase/auth";
import {
  checklistItemKey,
  isAqlInspectionLevel,
  isChecklistAnswer,
  isDefectSeverity,
  parseChecklist,
  type ChecklistResults,
  type DefectSeverity,
  type OrderStatus,
} from "@/lib/types/product-inspection";

type Fail = { ok: false; error: string };

const NOT_SET_UP =
  "Inspection results aren't set up in the database yet. Run the product inspection results SQL in Supabase first.";

const START_NOT_SET_UP =
  "Inspections aren't fully set up in the database yet. Run the latest product inspection SQL in Supabase first.";

const NOT_STARTED = "Press Start inspection first.";

async function signedInContext(): Promise<{ ok: true; ctx: AuthenticatedContext } | Fail> {
  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to do this." };
  }
  const accessErr = profileAccessError(ctx.profile);
  // Contractors aren't linked to a client but can work on the jobs assigned to them.
  if (accessErr && !(await findContractorForUser(ctx.supabase, ctx.user.id))) return { ok: false, error: accessErr };
  return { ok: true, ctx };
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/product-inspections/${orderId}`);
  revalidatePath("/product-inspections");
}

type OrderForEdit = {
  status: OrderStatus;
  created_by: string;
  contractor_id: string | null;
  order_quantity: number | null;
  started_at: string | null;
  aql_inspection_level: string;
  aql_critical: number | string;
  aql_major: number | string;
  aql_minor: number | string;
  inspection_templates: { checklist: unknown } | null;
};

/**
 * Loads a booking the user may work on: its creator, an admin, or the contractor assigned to it.
 * canManage is false for that contractor, who can carry out the inspection but not change the booking.
 */
async function loadEditableOrder(
  ctx: AuthenticatedContext,
  orderId: string,
): Promise<{ ok: true; order: OrderForEdit; canManage: boolean } | Fail> {
  if (!looksLikeUuid(orderId)) return { ok: false, error: "Invalid booking." };
  const { data, error } = await ctx.supabase
    .from("inspection_orders")
    .select(
      "status, created_by, contractor_id, order_quantity, started_at, aql_inspection_level, aql_critical, aql_major, aql_minor, inspection_templates ( checklist )",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: error.code === "42703" ? START_NOT_SET_UP : error.message };
  const order = data as unknown as OrderForEdit | null;
  if (!order) return { ok: false, error: "Booking not found." };
  const canManage = ctx.profile.isBeenAdmin || order.created_by === ctx.user.id;
  if (!canManage) {
    const contractor = order.contractor_id ? await findContractorForUser(ctx.supabase, ctx.user.id) : null;
    if (!contractor || contractor.id !== order.contractor_id) {
      return { ok: false, error: "Only the person who booked this inspection or its assigned inspector can change it." };
    }
  }
  return { ok: true, order, canManage };
}

// ------------------------------------------------------------------------------
// Start (time and place)
// ------------------------------------------------------------------------------

export type StartInspectionInput = {
  orderId: string;
  latitude: number;
  longitude: number;
  /** Accuracy reported by the device, in metres. */
  accuracy: number | null;
};

/** Records where the inspector is when they start; the database stamps the time and locks both. */
export async function startInspection(raw: StartInspectionInput): Promise<{ ok: true } | Fail> {
  const { latitude, longitude } = raw;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, error: "Your location couldn't be read. Try again." };
  }
  const accuracy =
    typeof raw.accuracy === "number" && Number.isFinite(raw.accuracy) && raw.accuracy >= 0 ? raw.accuracy : null;

  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const { ctx } = auth;

  const loaded = await loadEditableOrder(ctx, raw.orderId);
  if (!loaded.ok) return loaded;
  const { order } = loaded;
  if (order.status === "Report issued") return { ok: false, error: "This inspection is finished." };
  if (order.status === "Cancelled") return { ok: false, error: "This booking is cancelled." };
  if (order.started_at) return { ok: false, error: "This inspection has already started." };

  const { data: updated, error } = await ctx.supabase
    .from("inspection_orders")
    .update({
      // The database replaces this with its own clock.
      started_at: new Date().toISOString(),
      start_latitude: latitude,
      start_longitude: longitude,
      start_accuracy_m: accuracy,
      status: order.status === "Requested" || order.status === "Confirmed" ? "In progress" : order.status,
    })
    .eq("id", raw.orderId)
    .is("started_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.code === "42703" ? START_NOT_SET_UP : error.message };
  if (!updated) return { ok: false, error: "This inspection has already started." };

  revalidateOrder(raw.orderId);
  return { ok: true };
}

// ------------------------------------------------------------------------------
// Checklist and result
// ------------------------------------------------------------------------------

export type SaveInspectionInput = {
  orderId: string;
  inspectionDate: string;
  inspectorName: string;
  orderQuantity: string;
  results: ChecklistResults;
  /** True to finish the inspection and record the result. */
  complete: boolean;
};

export type SaveInspectionResult = { ok: true; result: "Pass" | "Fail" | null } | Fail;

export async function saveInspection(raw: SaveInspectionInput): Promise<SaveInspectionResult> {
  const inspectionDate = raw.inspectionDate.trim();
  const inspectorName = raw.inspectorName.trim();
  const qtyText = raw.orderQuantity.trim();

  if (inspectionDate && !/^\d{4}-\d{2}-\d{2}$/.test(inspectionDate)) {
    return { ok: false, error: "Enter a valid inspection date." };
  }
  if (inspectionDate > todayUk()) return { ok: false, error: "The inspection date can't be in the future." };

  let orderQuantity: number | null = null;
  if (qtyText) {
    orderQuantity = Number(qtyText);
    if (!Number.isInteger(orderQuantity) || orderQuantity <= 0) {
      return { ok: false, error: "Order quantity must be a whole number above zero." };
    }
  }

  if (raw.complete) {
    if (!inspectionDate) return { ok: false, error: "Enter the inspection date." };
    if (!inspectorName) return { ok: false, error: "Enter the inspector's name." };
    if (!orderQuantity) return { ok: false, error: "Enter the order quantity so the sample size can be worked out." };
  }

  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const { ctx } = auth;

  const loaded = await loadEditableOrder(ctx, raw.orderId);
  if (!loaded.ok) return loaded;
  const { order } = loaded;

  if (order.status === "Report issued") return { ok: false, error: "This inspection is finished. Reopen it to make changes." };
  if (order.status === "Cancelled") return { ok: false, error: "This booking is cancelled." };
  if (!order.started_at) return { ok: false, error: NOT_STARTED };

  // Keep only answers for items on this booking's checklist.
  const checklist = parseChecklist(order.inspection_templates?.checklist);
  const results: ChecklistResults = {};
  let unanswered = 0;
  let failedItems = 0;
  for (const section of checklist) {
    section.items.forEach((_, i) => {
      const key = checklistItemKey(section.key, i);
      const entry = raw.results[key];
      if (!entry || !isChecklistAnswer(entry.answer)) {
        unanswered += 1;
        return;
      }
      const note = typeof entry.note === "string" ? entry.note.trim().slice(0, 1000) : "";
      results[key] = note ? { answer: entry.answer, note } : { answer: entry.answer };
      if (entry.answer === "Fail") failedItems += 1;
    });
  }

  let result: "Pass" | "Fail" | null = null;
  if (raw.complete) {
    if (unanswered > 0) {
      return { ok: false, error: `Answer every checklist item first (${unanswered} left).` };
    }
    const { data: defects, error: defectsError } = await ctx.supabase
      .from("defect_logs")
      .select("severity, quantity")
      .eq("order_id", raw.orderId);
    if (defectsError) return { ok: false, error: defectsError.message };

    const found: Record<DefectSeverity, number> = { Critical: 0, Major: 0, Minor: 0 };
    for (const d of defects ?? []) found[d.severity] += d.quantity;

    const aql = assessAql(
      orderQuantity as number,
      {
        level: isAqlInspectionLevel(order.aql_inspection_level) ? order.aql_inspection_level : "II",
        critical: Number(order.aql_critical),
        major: Number(order.aql_major),
        minor: Number(order.aql_minor),
      },
      found,
    );
    result = aql.passed && failedItems === 0 ? "Pass" : "Fail";
  }

  const status: OrderStatus = raw.complete
    ? "Report issued"
    : order.status === "Requested" || order.status === "Confirmed"
      ? "In progress"
      : order.status;

  const { data: updated, error } = await ctx.supabase
    .from("inspection_orders")
    .update({
      inspection_date: inspectionDate || null,
      inspector_name: inspectorName || null,
      order_quantity: orderQuantity ?? order.order_quantity,
      checklist_results: results,
      status,
      inspection_result: result,
      completed_at: raw.complete ? new Date().toISOString() : null,
    })
    .eq("id", raw.orderId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.code === "42703" ? NOT_SET_UP : error.message };
  if (!updated) return { ok: false, error: "You don't have permission to change this booking." };

  revalidateOrder(raw.orderId);
  return { ok: true, result };
}

/** Sends a finished inspection back to "In progress" so it can be changed. */
export async function reopenInspection(orderId: string): Promise<{ ok: true } | Fail> {
  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const loaded = await loadEditableOrder(auth.ctx, orderId);
  if (!loaded.ok) return loaded;
  if (loaded.order.status !== "Report issued") return { ok: false, error: "This inspection isn't finished." };

  const { error } = await auth.ctx.supabase
    .from("inspection_orders")
    .update({ status: "In progress", inspection_result: null, completed_at: null })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidateOrder(orderId);
  return { ok: true };
}

/** Confirm, cancel or restore a booking that hasn't been inspected yet. */
export async function setBookingStatus(
  orderId: string,
  status: "Requested" | "Confirmed" | "Cancelled",
): Promise<{ ok: true } | Fail> {
  if (!["Requested", "Confirmed", "Cancelled"].includes(status)) return { ok: false, error: "Invalid status." };
  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const loaded = await loadEditableOrder(auth.ctx, orderId);
  if (!loaded.ok) return loaded;
  if (!loaded.canManage) return { ok: false, error: "Only the person who booked this inspection can change its status." };
  if (loaded.order.status === "In progress" || loaded.order.status === "Report issued") {
    return { ok: false, error: "This inspection has already started." };
  }

  const { error } = await auth.ctx.supabase.from("inspection_orders").update({ status }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidateOrder(orderId);
  return { ok: true };
}

// ------------------------------------------------------------------------------
// Defects
// ------------------------------------------------------------------------------

export type CreateDefectInput = {
  orderId: string;
  severity: DefectSeverity;
  description: string;
  checklistSection: string;
  quantity: string;
  photoPath: string;
};

export async function createDefectLog(raw: CreateDefectInput): Promise<{ ok: true } | Fail> {
  const description = raw.description.trim();
  const quantity = Number(raw.quantity.trim() || "1");

  if (!isDefectSeverity(raw.severity)) return { ok: false, error: "Choose Critical, Major or Minor." };
  if (!description) return { ok: false, error: "Describe the defect." };
  if (!raw.photoPath) return { ok: false, error: "Take a photo of the defect." };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: "Number of units must be a whole number above zero." };
  }

  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const { ctx } = auth;

  const loaded = await loadEditableOrder(ctx, raw.orderId);
  if (!loaded.ok) return loaded;
  if (loaded.order.status === "Report issued") return { ok: false, error: "This inspection is finished. Reopen it to add defects." };
  if (loaded.order.status === "Cancelled") return { ok: false, error: "This booking is cancelled." };
  if (!loaded.order.started_at) return { ok: false, error: NOT_STARTED };

  const sections = parseChecklist(loaded.order.inspection_templates?.checklist);
  const checklistSection = sections.some((s) => s.key === raw.checklistSection) ? raw.checklistSection : null;

  if (!isOwnDefectPhotoPath(raw.photoPath, ctx.user.id, raw.orderId)) {
    return { ok: false, error: "The photo could not be attached." };
  }

  const { error } = await ctx.supabase.from("defect_logs").insert({
    order_id: raw.orderId,
    severity: raw.severity,
    description: description.slice(0, 2000),
    checklist_section: checklistSection,
    quantity,
    photo_url: raw.photoPath,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidateOrder(raw.orderId);
  return { ok: true };
}

export async function deleteDefectLog(defectId: string): Promise<{ ok: true } | Fail> {
  if (!looksLikeUuid(defectId)) return { ok: false, error: "Invalid defect." };
  const auth = await signedInContext();
  if (!auth.ok) return auth;
  const { ctx } = auth;

  const { data: defect } = await ctx.supabase
    .from("defect_logs")
    .select("order_id, photo_url, inspection_orders ( status )")
    .eq("id", defectId)
    .maybeSingle();
  if (!defect) return { ok: false, error: "Defect not found." };
  const orderStatus = (defect as unknown as { inspection_orders: { status: OrderStatus } | null }).inspection_orders?.status;
  if (orderStatus === "Report issued") return { ok: false, error: "This inspection is finished. Reopen it to remove defects." };

  const { data: deleted, error } = await ctx.supabase
    .from("defect_logs")
    .delete()
    .eq("id", defectId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!deleted) return { ok: false, error: "You can only remove defects you logged." };

  if (defect.photo_url) {
    await ctx.supabase.storage.from(DEFECT_PHOTOS_BUCKET).remove([defect.photo_url]);
  }

  revalidateOrder(defect.order_id);
  return { ok: true };
}
