"use server";

import { revalidatePath } from "next/cache";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { isMissingTableError } from "@/lib/data/pre-use-check-queries";
import { todayUk } from "@/lib/expiry";
import {
  PRE_USE_CHECK_ITEMS,
  isPreUseAnswer,
  preUseResult,
  type PreUseItemAnswer,
  type PreUseResult,
} from "@/lib/pre-use-checks";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";

export type CreatePreUseCheckInput = {
  assetId: string;
  checkedOn: string;
  checkedBy: string;
  items: PreUseItemAnswer[];
  faultNotes: string;
};

export type CreatePreUseCheckResult =
  | { ok: true; result: PreUseResult }
  | { ok: false; error: string };

/**
 * Records a routine pre-use check. Deliberately leaves assets.next_inspection_due
 * alone: only a thorough examination resets the 6/12-month clock.
 */
export async function createPreUseCheck(raw: CreatePreUseCheckInput): Promise<CreatePreUseCheckResult> {
  const assetId = raw.assetId.trim();
  const checkedOn = raw.checkedOn.trim();
  const checkedBy = raw.checkedBy.trim();
  const faultNotes = raw.faultNotes.trim();

  if (!looksLikeUuid(assetId)) {
    return { ok: false, error: "Invalid asset identifier." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) {
    return { ok: false, error: "Enter the date of the check." };
  }
  if (checkedOn > todayUk()) {
    return { ok: false, error: "The check date can't be in the future." };
  }
  if (!checkedBy) {
    return { ok: false, error: "Enter the name of the person who did the check." };
  }

  const answers = new Map(raw.items.map((i) => [i.item, i.answer]));
  const items: PreUseItemAnswer[] = [];
  for (const item of PRE_USE_CHECK_ITEMS) {
    const answer = answers.get(item);
    if (!isPreUseAnswer(answer)) {
      return { ok: false, error: `Answer every item (missing: "${item}").` };
    }
    items.push({ item, answer });
  }

  const result = preUseResult(items);
  if (result === "Fault" && !faultNotes) {
    return { ok: false, error: "Describe the fault found." };
  }

  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to record pre-use checks." };
  }

  const accessErr = profileAccessError(ctx.profile);
  if (accessErr) {
    return { ok: false, error: accessErr };
  }

  const { error } = await ctx.supabase.from("pre_use_checks").insert({
    asset_id: assetId,
    checked_on: checkedOn,
    checked_by: checkedBy,
    result,
    items,
    fault_notes: result === "Fault" ? faultNotes : null,
    created_by: ctx.user.id,
  });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        ok: false,
        error: "Pre-use checks aren't set up in the database yet. Run the pre-use checks SQL in Supabase first.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/dashboard");

  return { ok: true, result };
}
