"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function setEmployeeActive(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";

  if (!employeeId) {
    redirectWithError("Funcionario invalido.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("employees").update({ active }).eq("id", employeeId);

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=funcionario");
}

export async function decideHourBankTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!transactionId || !["aprovar", "recusar"].includes(action)) {
    redirectWithError("Movimento ou acao invalida.");
  }

  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase
    .from("hour_bank_transactions")
    .select("id, employee_id, minutes, status")
    .eq("id", transactionId)
    .single();

  if (currentError || !current) {
    redirectWithError(currentError?.message ?? "Movimento nao encontrado.");
  }

  if (current.status !== "pendente") {
    redirectWithError("Apenas movimentos pendentes podem ser alterados.");
  }

  if (action === "aprovar" && Number(current.minutes) < 0) {
    const balance = await getApprovedBalance(supabase, current.employee_id);
    if (Math.abs(Number(current.minutes)) > balance) {
      redirectWithError("Saldo insuficiente para aprovar esta baixa.");
    }
  }

  const status = action === "aprovar" ? "aprovado" : "recusado";
  const { error } = await supabase
    .from("hour_bank_transactions")
    .update({
      status,
      approved_by: "admin",
      decided_at: new Date().toISOString()
    })
    .eq("id", transactionId);

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=banco-horas");
}

export async function createHourBankDebit(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const hours = Number(String(formData.get("hours") ?? "").replace(",", "."));
  const note = String(formData.get("note") ?? "").trim();

  if (!employeeId || !["pagamento", "folga"].includes(type)) {
    redirectWithError("Funcionario e tipo de baixa sao obrigatorios.");
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    redirectWithError("Informe uma quantidade valida de horas.");
  }

  if (!note) {
    redirectWithError("Informe uma observacao para o movimento.");
  }

  const minutes = Math.round(hours * 60);
  const supabase = getSupabaseAdmin();
  const balance = await getApprovedBalance(supabase, employeeId);

  if (minutes > balance) {
    redirectWithError("Saldo insuficiente no banco de horas.");
  }

  const { error } = await supabase.from("hour_bank_transactions").insert({
    employee_id: employeeId,
    type,
    minutes: -minutes,
    transaction_date: new Date().toISOString().slice(0, 10),
    status: "pendente",
    note
  });

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=banco-horas");
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

function redirectWithError(message: string): never {
  redirect(`/admin?erro=${encodeURIComponent(message)}`);
}
