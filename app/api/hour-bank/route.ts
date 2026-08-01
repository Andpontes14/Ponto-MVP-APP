import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type DebitType = "pagamento" | "folga";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
    const employeeId = String(payload.employeeId ?? "").trim();
    const type = String(payload.type ?? "").trim() as DebitType;
    const minutes = Number(payload.minutes ?? 0);
    const note = String(payload.note ?? "").trim();

    if (!employeeId || !["pagamento", "folga"].includes(type)) {
      return respondWithError(request, "Funcionario e tipo de baixa sao obrigatorios.", 400, contentType);
    }

    if (!Number.isInteger(minutes) || minutes <= 0) {
      return respondWithError(request, "Informe uma quantidade valida de minutos.", 400, contentType);
    }

    if (!note) {
      return respondWithError(request, "Informe uma observacao para o movimento.", 400, contentType);
    }

    const supabase = getSupabaseAdmin();
    const balance = await getApprovedBalance(supabase, employeeId);
    if (minutes > balance) {
      return respondWithError(request, "Saldo insuficiente no banco de horas.", 400, contentType);
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
      return respondWithError(request, error.message, 500, contentType);
    }

    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/admin?ok=banco-horas", request.url));
    }

    return NextResponse.json({ ok: true, transaction: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function respondWithError(request: Request, message: string, status: number, contentType: string) {
  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL(`/admin?erro=${encodeURIComponent(message)}`, request.url));
  }

  return NextResponse.json({ error: message }, { status });
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
