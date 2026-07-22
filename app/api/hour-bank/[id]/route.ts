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
      .from("hour_bank_transactions")
      .select("id, employee_id, minutes, status")
      .eq("id", params.id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: currentError?.message ?? "Movimento nao encontrado." }, { status: 404 });
    }

    if (current.status !== "pendente") {
      return NextResponse.json({ error: "Apenas movimentos pendentes podem ser alterados." }, { status: 400 });
    }

    if (action === "aprovar" && Number(current.minutes) < 0) {
      const balance = await getApprovedBalance(supabase, current.employee_id);
      if (Math.abs(Number(current.minutes)) > balance) {
        return NextResponse.json({ error: "Saldo insuficiente para aprovar esta baixa." }, { status: 400 });
      }
    }

    const status = action === "aprovar" ? "aprovado" : "recusado";
    const { data, error } = await supabase
      .from("hour_bank_transactions")
      .update({
        status,
        approved_by: "admin",
        decided_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("id, employee_id, type, minutes, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, transaction: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getApprovedBalance(supabase: ReturnType<typeof getSupabaseAdmin>, employeeId: string) {
  const { data, error } = await supabase
    .from("hour_bank_transactions")
    .select("minutes")
    .eq("employee_id", employeeId)
    .eq("status", "aprovado");

  if (error) throw error;
  return (data ?? []).reduce((total, transaction) => total + Number(transaction.minutes), 0);
}
