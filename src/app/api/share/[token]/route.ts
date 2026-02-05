import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const t = String(token || "");
    if (!t) return NextResponse.json({ error: "Brak token" }, { status: 400 });

    const supa = admin();
    const { data, error } = await supa
      .from("trip_shares")
      .select("snapshot")
      .eq("token", t)
      .single();

    if (error || !data) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

    return NextResponse.json(data.snapshot);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
