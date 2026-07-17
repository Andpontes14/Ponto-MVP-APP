import type { DailySummary, Employee, HourBankTransaction, TimeEntry, VacationRequest } from "./types";

export const employees: Employee[] = [
  {
    id: "emp-001",
    code: "001",
    name: "Maria Silva",
    role: "Sala",
    admissionDate: "2024-03-15",
    weeklyHours: 40,
    vacationAllowance: 22,
    vacationUsed: 8,
    pinHint: "1234",
    active: true
  },
  {
    id: "emp-002",
    code: "002",
    name: "Joao Costa",
    role: "Cozinha",
    admissionDate: "2023-11-02",
    weeklyHours: 40,
    vacationAllowance: 22,
    vacationUsed: 12,
    pinHint: "2468",
    active: true
  },
  {
    id: "emp-003",
    code: "003",
    name: "Ana Martins",
    role: "Gerencia",
    admissionDate: "2022-06-01",
    weeklyHours: 40,
    vacationAllowance: 22,
    vacationUsed: 5,
    pinHint: "1357",
    active: true
  }
];

export const timeEntries: TimeEntry[] = [
  { id: "te-001", employeeId: "emp-001", type: "entrada", dateTime: "2026-07-17T08:58:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-001-entrada.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-002", employeeId: "emp-001", type: "inicio_pausa", dateTime: "2026-07-17T13:02:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-001-pausa.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-003", employeeId: "emp-001", type: "fim_pausa", dateTime: "2026-07-17T14:00:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-001-retorno.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-004", employeeId: "emp-001", type: "saida", dateTime: "2026-07-17T18:05:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-001-saida.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-005", employeeId: "emp-002", type: "entrada", dateTime: "2026-07-17T09:12:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-002-entrada.jpg", verificationStatus: "rever", verificationFlags: ["PIN usado sem foto nitida"] },
  { id: "te-006", employeeId: "emp-002", type: "inicio_pausa", dateTime: "2026-07-17T13:30:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-002-pausa.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-007", employeeId: "emp-002", type: "fim_pausa", dateTime: "2026-07-17T14:15:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-002-retorno.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-008", employeeId: "emp-002", type: "saida", dateTime: "2026-07-17T18:05:00", deviceLabel: "Tablet loja", photoUrl: "/photos/emp-002-saida.jpg", verificationStatus: "confirmado", verificationFlags: [] },
  { id: "te-009", employeeId: "emp-003", type: "entrada", dateTime: "2026-07-17T08:45:00", deviceLabel: "Tablet loja", verificationStatus: "rever", verificationFlags: ["Sem foto na marcacao"] }
];

export const vacationRequests: VacationRequest[] = [
  {
    id: "vac-001",
    employeeId: "emp-001",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    businessDays: 5,
    status: "pendente",
    note: "Semana de descanso"
  },
  {
    id: "vac-002",
    employeeId: "emp-002",
    startDate: "2026-09-07",
    endDate: "2026-09-11",
    businessDays: 5,
    status: "aprovado"
  }
];

export const hourBankTransactions: HourBankTransaction[] = [
  {
    id: "hb-001",
    employeeId: "emp-001",
    type: "credito_extra",
    minutes: 129,
    date: "2026-07-12",
    status: "aprovado",
    note: "Extras acumuladas da semana anterior"
  },
  {
    id: "hb-002",
    employeeId: "emp-001",
    type: "folga",
    minutes: -60,
    date: "2026-07-15",
    status: "aprovado",
    note: "Saiu 1h mais cedo por folga excepcional"
  },
  {
    id: "hb-003",
    employeeId: "emp-002",
    type: "credito_extra",
    minutes: 188,
    date: "2026-07-10",
    status: "aprovado",
    note: "Horas extra mantidas em banco"
  },
  {
    id: "hb-004",
    employeeId: "emp-002",
    type: "pagamento",
    minutes: -120,
    date: "2026-07-16",
    status: "pendente",
    note: "Pagar 2h no fechamento mensal"
  }
];

export function formatTime(dateTime?: string) {
  if (!dateTime) return "-";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateTime));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function minutesToHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, "0")}`;
}

export function buildDailySummaries(): DailySummary[] {
  return employees.map((employee) => {
    const entries = timeEntries.filter((entry) => entry.employeeId === employee.id);
    const byType = Object.fromEntries(entries.map((entry) => [entry.type, entry.dateTime]));
    const flags = entries.flatMap((entry) => entry.verificationFlags);
    const hasReview = entries.some((entry) => entry.verificationStatus === "rever");
    const entrada = byType.entrada;
    const inicioPausa = byType.inicio_pausa;
    const fimPausa = byType.fim_pausa;
    const saida = byType.saida;
    let workedMinutes = 0;
    let issue: string | undefined;

    if (entrada && saida) {
      workedMinutes = diffMinutes(entrada, saida);
      if (inicioPausa && fimPausa) {
        workedMinutes -= diffMinutes(inicioPausa, fimPausa);
      }
    } else {
      issue = "Marcacao incompleta";
    }

    return {
      employeeId: employee.id,
      date: "2026-07-17",
      entrada,
      inicioPausa,
      fimPausa,
      saida,
      workedMinutes,
      expectedMinutes: 480,
      overtimeMinutes: Math.max(0, workedMinutes - 480),
      verificationStatus: hasReview ? "rever" : "confirmado",
      verificationFlags: flags,
      issue
    };
  });
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function employeeName(employeeId: string) {
  return employees.find((employee) => employee.id === employeeId)?.name ?? "Funcionario";
}

export function remainingVacationDays(employee: Employee) {
  const approved = vacationRequests
    .filter((request) => request.employeeId === employee.id && request.status === "aprovado")
    .reduce((total, request) => total + request.businessDays, 0);
  return employee.vacationAllowance - employee.vacationUsed - approved;
}

export function totalOvertimeMinutes() {
  return buildDailySummaries().reduce((total, summary) => total + summary.overtimeMinutes, 0);
}

export function hourBankBalance(employeeId: string) {
  const approvedBalance = hourBankTransactions
    .filter((transaction) => transaction.employeeId === employeeId && transaction.status === "aprovado")
    .reduce((total, transaction) => total + transaction.minutes, 0);
  const todayCredit = buildDailySummaries().find((summary) => summary.employeeId === employeeId)?.overtimeMinutes ?? 0;
  return approvedBalance + todayCredit;
}

export function totalHourBankBalance() {
  return employees.reduce((total, employee) => total + hourBankBalance(employee.id), 0);
}
