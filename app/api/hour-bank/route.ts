import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type DebitType = "pagamento" | "folga";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const employeeId = String(payload.employeeId ?? "").trim();
    const type = String(payload.type ?? "").trim() as DebitType;
    const minutes = Number(payload.minutes ?? 0);
    const note = String(payload.note ?? "").trim();

    if (!employeeId || !["pagamento", "folga"].includes(type)) {
      return NextResponse.json({ error: "Funcionario e tipo de baixa sao obrigatorios." }, { status: 400 });
    }

    if (!Number.isInteger(minutes) || minutes <= 0) {
      return NextResponse.json({ error: "Informe uma quantidade valida de minutos." }, { status: 400 });
    }

    if (!note) {
      return NextResponse.json({ error: "Informe uma observacao para o movimento." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const balance = await getApprovedBalance(supabase, employeeId);
    if (minutes > balance) {
      return NextResponse.json({ error: "Saldo insuficiente no banco de horas." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hour_bank_transactions")
      .insert({
        employee_id: employeeId,
        type,
        minutes: -minutes,
        transaction_date: new Date().toISOString().slice(0, 10),
        status: "pendente",
        note
      })
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
