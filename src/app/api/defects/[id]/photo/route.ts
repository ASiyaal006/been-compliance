import { NextResponse } from "next/server";
import { DEFECT_PHOTOS_BUCKET } from "@/lib/defect-photos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Opens a defect photo through a short-lived signed link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid defect." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view this photo." }, { status: 401 });
  }

  // RLS limits this to defects the user can see.
  const { data: row } = await supabase.from("defect_logs").select("photo_url").eq("id", id).maybeSingle();
  if (!row?.photo_url) {
    return NextResponse.json({ error: "No photo is stored for this defect." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage.from(DEFECT_PHOTOS_BUCKET).createSignedUrl(row.photo_url, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not open the photo." }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
