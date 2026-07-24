import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const code = String(payload.code ?? "").trim();
    const pin = String(payload.pin ?? "").trim();
    const date = String(payload.date ?? "").trim();
    const hours = Number(payload.hours ?? 0);
    const note = String(payload.note ?? "").trim();

    if (!code || pin.length < 4) {
      return NextResponse.json({ error: "Informe codigo e PIN." }, { status: 400 });
    }

    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Informe a data da folga." }, { status: 400 });
    }

    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) {
      return NextResponse.json({ error: "Informe uma quantidade de horas entre 0,25 e 12." }, { status: 400 });
    }

    const minutes = Math.round(hours * 60);
    if (minutes < 15) {
      return NextResponse.json({ error: "A folga minima deve ter 15 minutos." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: verifiedEmployees, error: pinError } = await supabase.rpc("verify_employee_pin", {
      employee_code: code,
      employee_pin: pin
    });

    if (pinError) {
      return NextResponse.json({ error: pinError.message }, { status: 500 });
    }

    const verifiedEmployee = verifiedEmployees?.[0];
    if (!verifiedEmployee) {
      return NextResponse.json({ error: "Codigo ou PIN invalido." }, { status: 401 });
    }

    const balance = await getApprovedBalance(supabase, verifiedEmployee.employee_id);
    if (minutes > balance) {
      return NextResponse.json({ error: "Saldo insuficiente no banco de horas." }, { status: 400 });
    }

    const fullNote = note
      ? `Pedido do funcionario: ${note}`
      : "Pedido de folga do banco de horas feito pelo funcionario.";

    const { data, error } = await supabase
      .from("hour_bank_transactions")
      .insert({
        employee_id: verifiedEmployee.employee_id,
        type: "folga",
        minutes: -minutes,
        transaction_date: date,
        status: "pendente",
        note: fullNote
      })
      .select("id, type, minutes, transaction_date, status, note")
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

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
}
