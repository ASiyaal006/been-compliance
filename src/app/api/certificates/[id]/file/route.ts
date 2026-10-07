import { NextResponse } from "next/server";
import { CERTIFICATE_FILES_BUCKET } from "@/lib/certificate-files";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Opens the original certificate file through a short-lived signed link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid certificate." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view this file." }, { status: 401 });
  }

  // RLS limits this to certificates the user can see.
  const { data: row } = await supabase.from("certificates").select("file_path").eq("id", id).maybeSingle();
  if (!row?.file_path) {
    return NextResponse.json({ error: "No file is stored for this certificate." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from(CERTIFICATE_FILES_BUCKET)
    .createSignedUrl(row.file_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not open the file." }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
