import "server-only";

import { isPreUseAnswer, type PreUseItemAnswer, type PreUseResult } from "@/lib/pre-use-checks";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export type PreUseCheckRow = {
  id: string;
  checkedOn: string;
  checkedOnUk: string;
  checkedBy: string;
  result: PreUseResult;
  faultItems: string[];
  faultNotes: string | null;
};

export type PreUseCheckList = {
  checks: PreUseCheckRow[];
  /** True until the pre-use checks migration has been run in Supabase. */
  notSetUp: boolean;
};

/** Postgres "undefined table", or PostgREST "table not in schema cache". */
export function isMissingTableError(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

function formatUk(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  );
}

function faultItemsFrom(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return (items as Partial<PreUseItemAnswer>[])
    .filter((i) => isPreUseAnswer(i?.answer) && i.answer === "Fault" && typeof i.item === "string")
    .map((i) => i.item as string);
}

export async function fetchPreUseChecks(assetId: string, limit = 20): Promise<PreUseCheckList> {
  const { supabase } = await requireAuthenticatedContext();

  const { data, error } = await supabase
    .from("pre_use_checks")
    .select("id, checked_on, checked_by, result, items, fault_notes")
    .eq("asset_id", assetId)
    .order("checked_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return { checks: [], notSetUp: true };
    throw new Error(`Could not load pre-use checks: ${error.message}`);
  }

  return {
    notSetUp: false,
    checks: (data ?? []).map((r) => ({
      id: r.id,
      checkedOn: r.checked_on,
      checkedOnUk: formatUk(r.checked_on),
      checkedBy: r.checked_by,
      result: r.result === "Fault" ? "Fault" : "OK",
      faultItems: faultItemsFrom(r.items),
      faultNotes: r.fault_notes,
    })),
  };
}
