import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type VacationRow = {
  id: string;
  start_date: string;
  end_date: string;
  business_days: number;
  status: "pendente" | "aprovado" | "recusado";
  note: string | null;
  created_at: string;
};

type HourBankRow = {
  id: string;
  type: "credito_extra" | "pagamento" | "folga" | "ajuste";
  minutes: number;
  transaction_date: string;
  status: "pendente" | "aprovado" | "recusado";
  note: string;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const code = String(payload.code ?? "").trim();
    const pin = String(payload.pin ?? "").trim();

    if (!code || pin.length < 4) {
      return NextResponse.json({ error: "Informe codigo e PIN." }, { status: 400 });
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

    const [employeeResult, vacationResult, hourBankResult] = await Promise.all([
      supabase
        .from("employees")
        .select("id, code, name, role, vacation_allowance, vacation_used")
        .eq("id", verifiedEmployee.employee_id)
        .single(),
      supabase
        .from("vacation_requests")
        .select("id, start_date, end_date, business_days, status, note, created_at")
        .eq("employee_id", verifiedEmployee.employee_id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("hour_bank_transactions")
        .select("id, type, minutes, transaction_date, status, note, created_at")
        .eq("employee_id", verifiedEmployee.employee_id)
        .order("transaction_date", { ascending: false })
        .limit(30)
    ]);

    if (employeeResult.error) throw employeeResult.error;
    if (vacationResult.error) throw vacationResult.error;
    if (hourBankResult.error) throw hourBankResult.error;

    const employee = employeeResult.data;
    const vacations = sortVacations((vacationResult.data ?? []) as VacationRow[]);
    const hourBank = (hourBankResult.data ?? []) as HourBankRow[];
    const approvedVacationDays = vacations
      .filter((request) => request.status === "aprovado")
      .reduce((total, request) => total + Number(request.business_days), 0);
    const approvedHourBankMinutes = hourBank
      .filter((transaction) => transaction.status === "aprovado")
      .reduce((total, transaction) => total + Number(transaction.minutes), 0);

    return NextResponse.json({
      ok: true,
      employee: {
        id: employee.id,
        code: employee.code,
        name: employee.name,
        role: employee.role,
        vacationBalance:
          Number(employee.vacation_allowance) - Number(employee.vacation_used) - approvedVacationDays,
        hourBankBalanceMinutes: approvedHourBankMinutes
      },
      vacations,
      hourBank
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sortVacations(requests: VacationRow[]) {
  const statusPriority = {
    pendente: 0,
    aprovado: 1,
    recusado: 2
  };

  return [...requests].sort((first, second) => {
    const statusDiff = statusPriority[first.status] - statusPriority[second.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}
