import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const snapshot = body?.snapshot;

    if (!snapshot || typeof snapshot !== "object") {
      return NextResponse.json({ error: "Brak snapshot" }, { status: 400 });
    }

    const token = crypto.randomBytes(16).toString("hex"); // 32 znaki
    const supa = admin();

    const { error } = await supa.from("trip_shares").insert({ token, snapshot });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
