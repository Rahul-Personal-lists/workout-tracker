import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/today";

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
