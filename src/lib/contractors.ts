import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The signed-in user's contractor record, or null (also null before the contractors SQL is run). */
export async function findContractorForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase.from("contractors").select("id, name").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** "China, Vietnam" → ["China", "Vietnam"] (trimmed, no blanks or repeats). */
export function parseRegions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const region = part.trim().slice(0, 80);
    if (region && !seen.has(region.toLowerCase())) {
      seen.add(region.toLowerCase());
      out.push(region);
    }
  }
  return out.slice(0, 30);
}

/** True when one of the contractor's regions names the factory's country or city. */
export function coversFactory(regions: string[], place: { city: string | null; country: string | null }): boolean {
  const targets = [place.city, place.country].filter(Boolean).map((t) => (t as string).trim().toLowerCase());
  return regions.some((r) => targets.includes(r.trim().toLowerCase()));
}

/** Empty approved list means the contractor may inspect every category. */
export function approvedFor(approvedCategories: string[], categoryId: string): boolean {
  return approvedCategories.length === 0 || approvedCategories.includes(categoryId);
}
