import { AlertTriangle, CalendarClock, Download, Pencil, TimerReset, UserRoundCheck, UserRoundX } from "lucide-react";
import { EmployeeActions } from "@/components/admin/employee-actions";
import { EmployeeForm } from "@/components/admin/employee-form";
import { HourBankActions } from "@/components/admin/hour-bank-actions";
import { VacationActions } from "@/components/admin/vacation-actions";
import { PageShell } from "@/components/page-shell";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  role: string;
  admission_date: string;
  weekly_hours: number;
  vacation_allowance: number;
  vacation_used: number;
  active: boolean;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  type: "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
  occurred_at: string;
  verification_status: "pendente" | "confirmado" | "rever";
  verification_flags: string[] | null;
};

type HourBankRow = {
  id: string;
  employee_id: string;
  type: "credito_extra" | "pagamento" | "folga" | "ajuste";
  minutes: number;
  transaction_date: string;
  status: "pendente" | "aprovado" | "recusado";
  note: string;
};

type VacationRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  business_days: number;
  status: "pendente" | "aprovado" | "recusado";
  note: string | null;
  created_at: string;
};

type DailySummary = {
  employeeId: string;
  workedMinutes: number;
  overtimeMinutes: number;
  verificationStatus: "pendente" | "confirmado" | "rever";
  verificationFlags: string[];
};

export const dynamic = "force-dynamic";

const fictitiousCodes = ["001", "002", "003"];
const fictitiousNames = ["Maria Silva", "Joao Costa", "Ana Martins"];
const fictitiousIds = [
  "10000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000002",
  "10000000-0000-0000-0000-000000000003"
];
const fictitiousHourBankNotes = [
  "Pagamento de horas extras",
  "Folga excepcional",
  "Pagar 2h no fechamento mensal",
  "Saiu 1h mais cedo por folga excepcional",
  "Extras acumuladas da semana anterior",
  "Horas extra mantidas em banco"
];

type AdminPageProps = {
  searchParams?: {
    ok?: string;
    erro?: string;
  };
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const data = await loadAdminData();

  if ("error" in data) {
    return (
      <PageShell
        title="Administracao"
        subtitle="Gestao minima para funcionarios, ferias e preparacao de relatorios mensais."
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

  const {
    employees,
    employeeNames,
    summaries,
    hourBankTransactions,
    vacationRequests,
    hourBankBalances,
    totalHourBankBalance
  } = data;
  const reviews = summaries.filter((summary) => summary.verificationStatus === "rever");
  const totalOvertimeMinutes = summaries.reduce((total, summary) => total + summary.overtimeMinutes, 0);
  const pendingVacationCount = vacationRequests.filter((request) => request.status === "pendente").length;

  return (
    <PageShell
      title="Administracao"
      subtitle="Painel com dados reais do Supabase para acompanhar ponto, ferias e banco de horas."
    >
      {searchParams?.erro ? (
        <section className="rounded-lg border border-[#b42318]/30 bg-[#fde8e8] p-4 font-semibold text-[#9b1c1c] shadow-sm">
          {searchParams.erro}
        </section>
      ) : null}
      {searchParams?.ok ? (
        <section className="rounded-lg border border-moss/25 bg-[#e8f3e6] p-4 font-semibold text-moss shadow-sm">
          Operacao concluida com sucesso.
        </section>
      ) : null}

      <EmployeeForm />

      <section className="mb-6 flex flex-wrap gap-3">
        <a
          href="/api/reports/monthly"
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-black/15 bg-white px-4 font-semibold"
        >
          <Download size={18} />
          Exportar CSV
        </a>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gold/35 bg-[#fff7e7] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-[#725018]">
            <TimerReset size={20} />
            Banco de horas
          </div>
          <div className="text-3xl font-bold">{minutesToHours(totalHourBankBalance)}</div>
          <p className="mt-2 text-sm text-black/65">
            Saldo aprovado acumulado. Extras pendentes ainda precisam de revisao.
          </p>
        </div>
        <div className="rounded-lg border border-gold/35 bg-[#fff7e7] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-[#725018]">
            <AlertTriangle size={20} />
            Marcacoes para rever
          </div>
          <div className="text-3xl font-bold">{reviews.length}</div>
          <p className="mt-2 text-sm text-black/65">
            Conferir foto e horario antes de fechar o espelho mensal.
          </p>
        </div>
        <div className="rounded-lg border border-gold/35 bg-[#fff7e7] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-[#725018]">
            <CalendarClock size={20} />
            Ferias pendentes
          </div>
          <div className="text-3xl font-bold">{pendingVacationCount}</div>
          <p className="mt-2 text-sm text-black/65">
            Pedidos aguardando aprovacao no fim do painel.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Funcionarios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Funcao</th>
                <th className="px-4 py-3">Admissao</th>
                <th className="px-4 py-3">Horas semanais</th>
                <th className="px-4 py-3">Ferias disponiveis</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-black/10">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{employee.code}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{employee.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">{employee.role}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(employee.admission_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{employee.weekly_hours}h</td>
                  <td className="whitespace-nowrap px-4 py-3">{remainingVacationDays(employee, vacationRequests)} dias</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                        employee.active ? "bg-[#e8f3e6] text-moss" : "bg-[#fde8e8] text-[#9b1c1c]"
                      }`}
                    >
                      {employee.active ? <UserRoundCheck size={14} /> : <UserRoundX size={14} />}
                      {employee.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap gap-2">
                      <button className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/15">
                        <Pencil size={16} />
                      </button>
                      <EmployeeActions employeeId={employee.id} active={employee.active} employeeName={employee.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Revisao de ponto e horas extras hoje</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Funcionario</th>
                <th className="px-4 py-3">Horas liquidas</th>
                <th className="px-4 py-3">Horas extras</th>
                <th className="px-4 py-3">Saldo banco</th>
                <th className="px-4 py-3">Validacao</th>
                <th className="px-4 py-3">Observacao</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.employeeId} className="border-t border-black/10">
                  <td className="px-4 py-3 font-semibold">{employeeNames.get(summary.employeeId) ?? "Funcionario"}</td>
                  <td className="px-4 py-3">{minutesToHours(summary.workedMinutes)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(summary.overtimeMinutes)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(hourBankBalances.get(summary.employeeId) ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${statusBadgeClass(summary.verificationStatus)}`}>
                      {summary.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">{summary.verificationFlags.join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Movimentos do banco de horas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Funcionario</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Observacao</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {hourBankTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-black/10">
                  <td className="px-4 py-3">{formatDate(transaction.transaction_date)}</td>
                  <td className="px-4 py-3 font-semibold">{employeeNames.get(transaction.employee_id) ?? "Funcionario"}</td>
                  <td className="px-4 py-3">{transaction.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-semibold">{signedMinutesToHours(transaction.minutes)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${statusBadgeClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{transaction.note}</td>
                  <td className="px-4 py-3">
                    <HourBankActions
                      transactionId={transaction.id}
                      employeeId={transaction.employee_id}
                      employeeName={employeeNames.get(transaction.employee_id) ?? "Funcionario"}
                      type={transaction.type}
                      status={transaction.status}
                      minutes={transaction.minutes}
                      balanceMinutes={hourBankBalances.get(transaction.employee_id) ?? 0}
                    />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-black/10 bg-[#fff7e7]">
                <td className="px-4 py-3">Hoje</td>
                <td className="px-4 py-3 font-semibold">Equipa</td>
                <td className="px-4 py-3">credito extra</td>
                <td className="px-4 py-3 font-semibold">{minutesToHours(totalOvertimeMinutes)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[#fff2d8] px-2 py-1 text-xs font-semibold uppercase text-[#725018]">
                    apuracao
                  </span>
                </td>
                <td className="px-4 py-3">Extras de hoje entram no banco apos revisao.</td>
                <td className="px-4 py-3">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="ferias" className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Pedidos de ferias</h2>
        </div>
        <div className="divide-y divide-black/10">
          {vacationRequests.length ? (
            vacationRequests.map((request) => {
              const employeeName = employeeNames.get(request.employee_id) ?? "Funcionario";
              return (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <div className="font-semibold">{employeeName}</div>
                    <div className="text-sm text-black/60">
                      {formatDate(request.start_date)} a {formatDate(request.end_date)} - {request.business_days} dias uteis
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase text-black/45">
                      Pedido em {formatDate(request.created_at.slice(0, 10))}
                    </div>
                    {request.note ? <div className="mt-1 text-sm text-black/55">{request.note}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${statusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                    <VacationActions requestId={request.id} employeeName={employeeName} status={request.status} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-5 text-sm font-semibold text-black/55">
              Nenhum pedido de ferias registado.
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

async function loadAdminData() {
  try {
    const supabase = getSupabaseAdmin();
    const today = getLisbonDateString();
    const { dayStart, dayEnd } = getLisbonDayRange(today);

    const [employeesResult, entriesResult, hourBankResult, vacationResult] = await Promise.all([
      supabase.from("employees").select("*").order("code", { ascending: true }),
      supabase
        .from("time_entries")
        .select("id, employee_id, type, occurred_at, verification_status, verification_flags")
        .gte("occurred_at", dayStart)
        .lte("occurred_at", dayEnd)
        .order("occurred_at", { ascending: true }),
      supabase
        .from("hour_bank_transactions")
        .select("id, employee_id, type, minutes, transaction_date, status, note")
        .order("transaction_date", { ascending: false })
        .limit(50),
      supabase
        .from("vacation_requests")
        .select("id, employee_id, start_date, end_date, business_days, status, note, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (entriesResult.error) throw entriesResult.error;
    if (hourBankResult.error) throw hourBankResult.error;
    if (vacationResult.error) throw vacationResult.error;

    const allEmployees = (employeesResult.data ?? []) as EmployeeRow[];
    const fictitiousEmployeeIds = new Set(
      allEmployees.filter((employee) => isFictitiousEmployee(employee)).map((employee) => employee.id)
    );
    const employees = allEmployees
      .filter((employee) => !fictitiousEmployeeIds.has(employee.id))
      .sort(sortEmployeesForAdmin);
    const entries = ((entriesResult.data ?? []) as TimeEntryRow[]).filter(
      (entry) => !fictitiousEmployeeIds.has(entry.employee_id)
    );
    const hourBankTransactions = ((hourBankResult.data ?? []) as HourBankRow[]).filter(
      (transaction) =>
        !fictitiousEmployeeIds.has(transaction.employee_id) && !isKnownFictitiousHourBank(transaction)
    );
    const vacationRequests = sortVacationRequests(
      ((vacationResult.data ?? []) as VacationRow[]).filter(
        (request) => !fictitiousEmployeeIds.has(request.employee_id) && !isKnownFictitiousVacation(request)
      )
    );
    const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));
    const summaries = buildSummaries(employees.filter((employee) => employee.active), entries);
    const hourBankBalances = buildHourBankBalances(employees, hourBankTransactions);
    const totalHourBankBalance = Array.from(hourBankBalances.values()).reduce((total, minutes) => total + minutes, 0);

    return {
      employees,
      entries,
      employeeNames,
      summaries,
      hourBankTransactions,
      vacationRequests,
      hourBankBalances,
      totalHourBankBalance
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro inesperado ao carregar dados."
    };
  }
}

function isFictitiousEmployee(employee: EmployeeRow) {
  return (
    fictitiousCodes.includes(employee.code) ||
    fictitiousNames.includes(employee.name) ||
    fictitiousIds.includes(employee.id)
  );
}

function isKnownFictitiousHourBank(transaction: HourBankRow) {
  return (
    fictitiousIds.includes(transaction.employee_id) ||
    fictitiousHourBankNotes.includes(transaction.note)
  );
}

function isKnownFictitiousVacation(request: VacationRow) {
  return (
    fictitiousIds.includes(request.employee_id) ||
    (request.start_date === "2026-08-10" && request.end_date === "2026-08-14") ||
    (request.start_date === "2026-09-07" && request.end_date === "2026-09-11")
  );
}

function sortVacationRequests(requests: VacationRow[]) {
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

function sortEmployeesForAdmin(first: EmployeeRow, second: EmployeeRow) {
  if (first.active !== second.active) {
    return first.active ? -1 : 1;
  }

  return first.code.localeCompare(second.code, "pt-PT", { numeric: true, sensitivity: "base" });
}

function statusBadgeClass(status: "pendente" | "aprovado" | "recusado" | "confirmado" | "rever") {
  if (status === "aprovado" || status === "confirmado") {
    return "bg-[#e8f3e6] text-moss";
  }

  if (status === "recusado" || status === "rever") {
    return "bg-[#fde8e8] text-[#9b1c1c]";
  }

  return "bg-[#fff2d8] text-[#725018]";
}

function buildSummaries(employees: EmployeeRow[], entries: TimeEntryRow[]): DailySummary[] {
  return employees.map((employee) => {
    const employeeEntries = entries.filter((entry) => entry.employee_id === employee.id);
    const flags = employeeEntries.flatMap((entry) => entry.verification_flags ?? []);
    const hasReview = employeeEntries.some((entry) => entry.verification_status === "rever");
    const workedMinutes = calculateWorkedMinutes(employeeEntries);

    return {
      employeeId: employee.id,
      workedMinutes,
      overtimeMinutes: Math.max(0, workedMinutes - 480),
      verificationStatus: hasReview ? "rever" : "confirmado",
      verificationFlags: flags
    };
  });
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

function buildHourBankBalances(employees: EmployeeRow[], transactions: HourBankRow[]) {
  return new Map(
    employees.map((employee) => [
      employee.id,
      transactions
        .filter((transaction) => transaction.employee_id === employee.id && transaction.status === "aprovado")
        .reduce((total, transaction) => total + transaction.minutes, 0)
    ])
  );
}

function remainingVacationDays(employee: EmployeeRow, vacations: VacationRow[]) {
  const approved = vacations
    .filter((request) => request.employee_id === employee.id && request.status === "aprovado")
    .reduce((total, request) => total + request.business_days, 0);
  return employee.vacation_allowance - employee.vacation_used - approved;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
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

function minutesToHours(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return `${hours}h${String(mins).padStart(2, "0")}`;
}

function signedMinutesToHours(minutes: number) {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${sign}${minutesToHours(minutes)}`;
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
