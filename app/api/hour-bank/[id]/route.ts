import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "").trim();
    const result = await decideTransaction(params.id, action);

    if (!result.ok) {
      return NextResponse.redirect(new URL(`/admin?erro=${encodeURIComponent(result.error)}`, request.url));
    }

    return NextResponse.redirect(new URL("/admin?ok=banco-horas", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.redirect(new URL(`/admin?erro=${encodeURIComponent(message)}`, request.url));
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const action = String(payload.action ?? "").trim();
    const result = await decideTransaction(params.id, action);

    if (!result.ok) {
      const status = result.error === "Acao invalida." ? 400 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, transaction: result.transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function decideTransaction(transactionId: string, action: string) {
  if (!["aprovar", "recusar"].includes(action)) {
    return { ok: false as const, error: "Acao invalida." };
  }

  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase
    .from("hour_bank_transactions")
    .select("id, employee_id, minutes, status")
    .eq("id", transactionId)
    .single();

  if (currentError || !current) {
    return { ok: false as const, error: currentError?.message ?? "Movimento nao encontrado." };
  }

  if (current.status !== "pendente") {
    return { ok: false as const, error: "Apenas movimentos pendentes podem ser alterados." };
  }

  if (action === "aprovar" && Number(current.minutes) < 0) {
    const balance = await getApprovedBalance(supabase, current.employee_id);
    if (Math.abs(Number(current.minutes)) > balance) {
      return { ok: false as const, error: "Saldo insuficiente para aprovar esta baixa." };
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
    .eq("id", transactionId)
    .select("id, employee_id, type, minutes, status")
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, transaction: data };
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
