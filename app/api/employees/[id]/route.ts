import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const active = Boolean(payload.active);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("employees")
      .update({ active })
      .eq("id", params.id)
      .select("id, code, name, active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, employee: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
