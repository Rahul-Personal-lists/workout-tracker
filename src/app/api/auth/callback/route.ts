import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  // Only honor a same-origin absolute path (single leading slash, not "//"),
  // so a crafted ?next can't point the post-login redirect somewhere unexpected.
  const rawNext = url.searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/program";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failUrl = request.nextUrl.clone();
      failUrl.pathname = "/login";
      failUrl.searchParams.delete("code");
      failUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(failUrl);
    }
  }

  const dest = request.nextUrl.clone();
  dest.pathname = next;
  dest.search = "";
  return NextResponse.redirect(dest);
}
