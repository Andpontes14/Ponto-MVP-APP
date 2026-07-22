import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const action = String(payload.action ?? "").trim();

    if (!["aprovar", "recusar"].includes(action)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: currentError } = await supabase
      .from("vacation_requests")
      .select("id, status")
      .eq("id", params.id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: currentError?.message ?? "Pedido nao encontrado." }, { status: 404 });
    }

    if (current.status !== "pendente") {
      return NextResponse.json({
        ok: true,
        alreadyDecided: true,
        request: current
      });
    }

    const status = action === "aprovar" ? "aprovado" : "recusado";
    const { data, error } = await supabase
      .from("vacation_requests")
      .update({
        status,
        approved_by: "admin",
        decided_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("id, employee_id, start_date, end_date, business_days, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, request: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
