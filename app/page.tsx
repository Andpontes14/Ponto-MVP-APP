import Link from "next/link";
import { AlertTriangle, CalendarClock, Camera, CheckCircle2, Clock, TimerReset, UsersRound } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type TimeEntryRow = {
  employee_id: string;
  type: "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
  occurred_at: string;
  verification_status: "pendente" | "confirmado" | "rever";
  verification_flags: string[] | null;
  photo_path: string | null;
};

type HourBankRow = {
  employee_id: string;
  minutes: number;
  status: "pendente" | "aprovado" | "recusado";
};

type VacationRow = {
  status: "pendente" | "aprovado" | "recusado";
};

type DailySummary = {
  employeeId: string;
  employeeName: string;
  entrada?: string;
  pausa1Inicio?: string;
  pausa1Fim?: string;
  pausa2Inicio?: string;
  pausa2Fim?: string;
  saida?: string;
  hasPhoto: boolean;
  workedMinutes: number;
  overtimeMinutes: number;
  verificationStatus: "confirmado" | "rever";
  issue?: string;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadDashboardData();

  if ("error" in data) {
    return (
      <PageShell
        title="Painel diario"
        subtitle="Resumo operacional para acompanhar quem entrou, quem saiu, horas apuradas e pedidos de ferias."
      >
        <section className="rounded-lg border border-gold/35 bg-[#fff7e7] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-[#725018]">
            <AlertTriangle size={20} />
            Nao foi possivel carregar o painel
          </div>
          <p className="text-sm text-black/65">{data.error}</p>
        </section>
      </PageShell>
    );
  }

  const { employees, summaries, pendingVacations, totalHourBankBalance, todayLabel } = data;
  const present = summaries.filter((summary) => summary.entrada && !summary.saida).length;
  const completed = summaries.filter((summary) => summary.entrada && summary.saida).length;
  const issues = summaries.filter((summary) => summary.issue || summary.verificationStatus === "rever").length;
  const totalOvertimeMinutes = summaries.reduce((total, summary) => total + summary.overtimeMinutes, 0);

  return (
    <PageShell
      title="Painel diario"
      subtitle="Resumo real do Supabase para acompanhar equipa, ponto, anomalias e banco de horas."
    >
      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={UsersRound} label="Funcionarios ativos" value={String(employees.length)} />
        <StatCard icon={Clock} label="Presentes agora" value={String(present)} tone="success" />
        <StatCard icon={CheckCircle2} label="Jornadas fechadas" value={String(completed)} />
        <StatCard icon={CalendarClock} label="Ferias pendentes" value={String(pendingVacations)} tone="warning" />
        <StatCard icon={TimerReset} label="Extras hoje" value={minutesToHours(totalOvertimeMinutes)} tone="warning" />
        <StatCard icon={TimerReset} label="Banco acumulado" value={minutesToHours(totalHourBankBalance)} tone="success" />
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Ponto de {todayLabel}</h2>
          {issues > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-md bg-[#fff2d8] px-3 py-1 text-sm font-semibold text-[#725018]">
              <AlertTriangle size={16} />
              {issues} anomalia
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Funcionario</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Pausa 1</th>
                <th className="px-4 py-3">Pausa 2</th>
                <th className="px-4 py-3">Saida</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3">Validacao</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fotos</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.employeeId} className="border-t border-black/10">
                  <td className="px-4 py-3 font-semibold">{summary.employeeName}</td>
                  <td className="px-4 py-3">{formatTime(summary.entrada)}</td>
                  <td className="px-4 py-3">
                    {formatTimeRange(summary.pausa1Inicio, summary.pausa1Fim)}
                  </td>
                  <td className="px-4 py-3">
                    {formatTimeRange(summary.pausa2Inicio, summary.pausa2Fim)}
                  </td>
                  <td className="px-4 py-3">{formatTime(summary.saida)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(summary.workedMinutes)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(summary.overtimeMinutes)}</td>
                  <td className="px-4 py-3">
                    {summary.verificationStatus === "rever" ? (
                      <span className="rounded-md bg-[#fff2d8] px-2 py-1 text-xs font-semibold text-[#725018]">
                        Rever foto
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#e8f3e6] px-2 py-1 text-xs font-semibold text-moss">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summary.issue ? (
                      <span className="rounded-md bg-[#fde8e8] px-2 py-1 text-xs font-semibold text-[#9b1c1c]">
                        {summary.issue}
                      </span>
                    ) : summary.entrada && summary.saida ? (
                      <span className="rounded-md bg-[#e8f3e6] px-2 py-1 text-xs font-semibold text-moss">
                        Completo
                      </span>
                    ) : summary.entrada ? (
                      <span className="rounded-md bg-[#e8f3e6] px-2 py-1 text-xs font-semibold text-moss">
                        Em curso
                      </span>
                    ) : (
                      <span className="rounded-md bg-oat px-2 py-1 text-xs font-semibold text-black/60">
                        Sem marcacao
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summary.hasPhoto ? (
                      <Link
                        href={`/admin/fotos?employeeId=${summary.employeeId}`}
                        className="focus-ring inline-flex items-center gap-1 rounded-md border border-black/15 px-2 py-1 text-xs font-semibold hover:bg-oat"
                      >
                        <Camera size={14} />
                        Ver
                      </Link>
                    ) : (
                      <span className="text-black/40">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}

async function loadDashboardData() {
  try {
    const supabase = getSupabaseAdmin();
    const today = getLisbonDateString();
    const { dayStart, dayEnd } = getLisbonDayRange(today);

    const [employeesResult, entriesResult, hourBankResult, vacationResult] = await Promise.all([
      supabase.from("employees").select("id, code, name, active").eq("active", true).order("code", { ascending: true }),
      supabase
        .from("time_entries")
        .select("employee_id, type, occurred_at, verification_status, verification_flags, photo_path")
        .gte("occurred_at", dayStart)
        .lte("occurred_at", dayEnd)
        .order("occurred_at", { ascending: true }),
      supabase.from("hour_bank_transactions").select("employee_id, minutes, status").eq("status", "aprovado"),
      supabase.from("vacation_requests").select("status").eq("status", "pendente")
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (entriesResult.error) throw entriesResult.error;
    if (hourBankResult.error) throw hourBankResult.error;
    if (vacationResult.error) throw vacationResult.error;

    const employees = (employeesResult.data ?? []) as EmployeeRow[];
    const entries = (entriesResult.data ?? []) as TimeEntryRow[];
    const hourBank = (hourBankResult.data ?? []) as HourBankRow[];
    const vacations = (vacationResult.data ?? []) as VacationRow[];
    const summaries = buildSummaries(employees, entries);
    const totalHourBankBalance = hourBank.reduce((total, transaction) => total + Number(transaction.minutes), 0);

    return {
      employees,
      summaries,
      pendingVacations: vacations.length,
      totalHourBankBalance,
      todayLabel: formatDate(today)
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro inesperado ao carregar dados."
    };
  }
}

function buildSummaries(employees: EmployeeRow[], entries: TimeEntryRow[]): DailySummary[] {
  return employees.map((employee) => {
    const employeeEntries = entries.filter((entry) => entry.employee_id === employee.id);
    const byType = getDayMarks(employeeEntries);
    const hasReview = employeeEntries.some((entry) => entry.verification_status === "rever");
    const workedMinutes = calculateWorkedMinutes(employeeEntries);
    let issue: string | undefined;

    if (employeeEntries.length > 0 && !byType.entrada) {
      issue = "Sem entrada";
    } else if (byType.entrada && hasOpenPause(employeeEntries)) {
      issue = "Pausa aberta";
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      entrada: byType.entrada,
      pausa1Inicio: byType.pauses[0]?.inicio,
      pausa1Fim: byType.pauses[0]?.fim,
      pausa2Inicio: byType.pauses[1]?.inicio,
      pausa2Fim: byType.pauses[1]?.fim,
      saida: byType.saida,
      hasPhoto: employeeEntries.some((entry) => Boolean(entry.photo_path)),
      workedMinutes,
      overtimeMinutes: Math.max(0, workedMinutes - 480),
      verificationStatus: hasReview ? "rever" : "confirmado",
      issue
    };
  });
}

function getDayMarks(entries: TimeEntryRow[]) {
  const ordered = [...entries].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
  );

  const starts = ordered.filter((entry) => entry.type === "inicio_pausa");
  const ends = ordered.filter((entry) => entry.type === "fim_pausa");

  return {
    entrada: ordered.find((entry) => entry.type === "entrada")?.occurred_at,
    pauses: [0, 1].map((index) => ({
      inicio: starts[index]?.occurred_at,
      fim: ends[index]?.occurred_at
    })),
    saida: [...ordered].reverse().find((entry) => entry.type === "saida")?.occurred_at
  };
}

function hasOpenPause(entries: TimeEntryRow[]) {
  const starts = entries.filter((entry) => entry.type === "inicio_pausa").length;
  const ends = entries.filter((entry) => entry.type === "fim_pausa").length;
  return starts > ends;
}

function calculateWorkedMinutes(entries: TimeEntryRow[]) {
  const ordered = [...entries].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
  );
  const entrada = ordered.find((entry) => entry.type === "entrada")?.occurred_at;
  const saida = [...ordered].reverse().find((entry) => entry.type === "saida")?.occurred_at;
  if (!entrada || !saida) return 0;

  let workedMinutes = diffMinutes(entrada, saida);
  let pauseStart: string | null = null;

  for (const entry of ordered) {
    if (entry.type === "inicio_pausa" && !pauseStart) {
      pauseStart = entry.occurred_at;
    } else if (entry.type === "fim_pausa" && pauseStart) {
      workedMinutes -= diffMinutes(pauseStart, entry.occurred_at);
      pauseStart = null;
    }
  }

  return Math.max(0, workedMinutes);
}

function getLisbonDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getLisbonDayRange(date: string) {
  return {
    dayStart: zonedDateTimeToUtcIso(date, "00:00:00", "Europe/Lisbon"),
    dayEnd: zonedDateTimeToUtcIso(date, "23:59:59", "Europe/Lisbon")
  };
}

function zonedDateTimeToUtcIso(date: string, time: string, timeZone: string) {
  const utcGuess = new Date(`${date}T${time}.000Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000).toISOString();
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset"
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(dateTime?: string) {
  if (!dateTime) return "-";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon"
  }).format(new Date(dateTime));
}

function formatTimeRange(start?: string, end?: string) {
  if (!start && !end) return "-";
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function minutesToHours(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return `${hours}h${String(mins).padStart(2, "0")}`;
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
