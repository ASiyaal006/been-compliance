"use server";

import { revalidatePath } from "next/cache";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { todayUk } from "@/lib/expiry";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";
import {
  isAqlInspectionLevel,
  isAqlValue,
  isInspectionStage,
  type AqlInspectionLevel,
  type InspectionStage,
} from "@/lib/types/product-inspection";

export type CreateProductOrderInput = {
  clientId: string;
  categoryId: string;
  stage: InspectionStage;
  targetDate: string;
  productName: string;
  reference: string;
  poNumber: string;
  orderQuantity: string;
  factoryName: string;
  factoryAddress: string;
  factoryCity: string;
  factoryCountry: string;
  factoryContact: string;
  aqlLevel: AqlInspectionLevel;
  aqlCritical: number;
  aqlMajor: number;
  aqlMinor: number;
  notes: string;
};

export type CreateProductOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

export async function createProductOrder(raw: CreateProductOrderInput): Promise<CreateProductOrderResult> {
  const productName = raw.productName.trim();
  const factoryName = raw.factoryName.trim();
  const targetDate = raw.targetDate.trim();
  const qtyText = raw.orderQuantity.trim();

  if (!looksLikeUuid(raw.categoryId)) return { ok: false, error: "Choose a product category." };
  if (!isInspectionStage(raw.stage)) return { ok: false, error: "Choose the inspection stage." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { ok: false, error: "Enter the target inspection date." };
  if (targetDate < todayUk()) return { ok: false, error: "The target date can't be in the past." };
  if (!productName) return { ok: false, error: "Enter the product name." };
  if (!factoryName) return { ok: false, error: "Enter the factory name." };
  if (!isAqlInspectionLevel(raw.aqlLevel)) return { ok: false, error: "Choose a valid AQL inspection level." };
  if (![raw.aqlCritical, raw.aqlMajor, raw.aqlMinor].every(isAqlValue)) {
    return { ok: false, error: "Choose valid AQL values." };
  }

  let orderQuantity: number | null = null;
  if (qtyText) {
    orderQuantity = Number(qtyText);
    if (!Number.isInteger(orderQuantity) || orderQuantity <= 0) {
      return { ok: false, error: "Order quantity must be a whole number above zero." };
    }
  }

  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to book inspections." };
  }
  const accessErr = profileAccessError(ctx.profile);
  if (accessErr) return { ok: false, error: accessErr };

  // Admins choose any client (or none); customers always book for their own client.
  let clientId: string | null;
  if (ctx.profile.isBeenAdmin) {
    clientId = raw.clientId ? raw.clientId : null;
    if (clientId && !looksLikeUuid(clientId)) return { ok: false, error: "Choose a valid client." };
  } else {
    clientId = ctx.profile.clientId;
  }

  // Use the newest active checklist for the category, if there is one.
  const { data: template } = await ctx.supabase
    .from("inspection_templates")
    .select("id")
    .eq("category_id", raw.categoryId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await ctx.supabase
    .from("inspection_orders")
    .insert({
      client_id: clientId,
      category_id: raw.categoryId,
      template_id: template?.id ?? null,
      stage: raw.stage,
      target_date: targetDate,
      product_name: productName,
      reference: raw.reference.trim() || null,
      po_number: raw.poNumber.trim() || null,
      order_quantity: orderQuantity,
      factory_name: factoryName,
      factory_address: raw.factoryAddress.trim() || null,
      factory_city: raw.factoryCity.trim() || null,
      factory_country: raw.factoryCountry.trim() || null,
      factory_contact: raw.factoryContact.trim() || null,
      aql_inspection_level: raw.aqlLevel,
      aql_critical: raw.aqlCritical,
      aql_major: raw.aqlMajor,
      aql_minor: raw.aqlMinor,
      notes: raw.notes.trim() || null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/product-inspections");
  return { ok: true, orderId: data.id };
}
