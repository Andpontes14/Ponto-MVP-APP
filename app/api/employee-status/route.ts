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

type TimeEntryRow = {
  type: "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
  occurred_at: string;
  verification_status: "pendente" | "confirmado" | "rever";
  verification_flags: string[] | null;
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

    const since = new Date();
    since.setDate(since.getDate() - 21);

    const [employeeResult, vacationResult, hourBankResult, timeEntriesResult] = await Promise.all([
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
        .limit(30),
      supabase
        .from("time_entries")
        .select("type, occurred_at, verification_status, verification_flags")
        .eq("employee_id", verifiedEmployee.employee_id)
        .gte("occurred_at", since.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(120)
    ]);

    if (employeeResult.error) throw employeeResult.error;
    if (vacationResult.error) throw vacationResult.error;
    if (hourBankResult.error) throw hourBankResult.error;
    if (timeEntriesResult.error) throw timeEntriesResult.error;

    const employee = employeeResult.data;
    const vacations = sortVacations((vacationResult.data ?? []) as VacationRow[]);
    const hourBank = (hourBankResult.data ?? []) as HourBankRow[];
    const timeDays = buildTimeDays((timeEntriesResult.data ?? []) as TimeEntryRow[]);
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
      hourBank,
      timeDays
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildTimeDays(entries: TimeEntryRow[]) {
  const byDate = new Map<string, TimeEntryRow[]>();
  for (const entry of entries) {
    const date = getLisbonDateString(new Date(entry.occurred_at));
    byDate.set(date, [...(byDate.get(date) ?? []), entry]);
  }

  return Array.from(byDate.entries())
    .sort(([first], [second]) => second.localeCompare(first))
    .slice(0, 14)
    .map(([date, dateEntries]) => {
      const ordered = [...dateEntries].sort(
        (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
      );
      const byType = getDayMarks(ordered);
      const hasReview = ordered.some((entry) => entry.verification_status === "rever");
      const flags = ordered.flatMap((entry) => entry.verification_flags ?? []);
      const workedMinutes = calculateWorkedMinutes(ordered);
      let issue = "";

      if (ordered.length > 0 && !byType.entrada) {
        issue = "Sem entrada";
      } else if (byType.entrada && byType.saida && hasOpenPause(ordered)) {
        issue = "Saida com pausa aberta";
      } else if (byType.entrada && hasOpenPause(ordered)) {
        issue = "Pausa aberta";
      } else if (byType.entrada && !byType.saida) {
        issue = "Em curso";
      }

      return {
        date,
        entrada: byType.entrada ?? null,
        inicio_pausa: byType.inicio_pausa ?? null,
        fim_pausa: byType.fim_pausa ?? null,
        saida: byType.saida ?? null,
        workedMinutes,
        verificationStatus: hasReview ? "rever" : "ok",
        flags,
        issue
      };
    });
}

function getDayMarks(entries: TimeEntryRow[]) {
  return {
    entrada: entries.find((entry) => entry.type === "entrada")?.occurred_at ?? null,
    inicio_pausa: entries.filter((entry) => entry.type === "inicio_pausa")[0]?.occurred_at ?? null,
    fim_pausa: entries.filter((entry) => entry.type === "fim_pausa")[0]?.occurred_at ?? null,
    saida: [...entries].reverse().find((entry) => entry.type === "saida")?.occurred_at ?? null
  };
}

function hasOpenPause(entries: TimeEntryRow[]) {
  const starts = entries.filter((entry) => entry.type === "inicio_pausa").length;
  const ends = entries.filter((entry) => entry.type === "fim_pausa").length;
  return starts > ends;
}

function calculateWorkedMinutes(entries: TimeEntryRow[]) {
  const entrada = entries.find((entry) => entry.type === "entrada")?.occurred_at;
  const saida = [...entries].reverse().find((entry) => entry.type === "saida")?.occurred_at;
  if (!entrada || !saida) return 0;

  let workedMinutes = diffMinutes(entrada, saida);
  let pauseStart: string | null = null;

  for (const entry of entries) {
    if (entry.type === "inicio_pausa" && !pauseStart) {
      pauseStart = entry.occurred_at;
    } else if (entry.type === "fim_pausa" && pauseStart) {
      workedMinutes -= diffMinutes(pauseStart, entry.occurred_at);
      pauseStart = null;
    }
  }

  if (pauseStart) {
    workedMinutes -= diffMinutes(pauseStart, saida);
  }

  return Math.max(0, workedMinutes);
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

function getLisbonDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
