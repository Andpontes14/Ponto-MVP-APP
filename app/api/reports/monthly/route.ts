import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  role: string;
};

type TimeEntryRow = {
  employee_id: string;
  type: "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
  occurred_at: string;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const month = getLisbonMonthString();
    const { monthStart, monthEnd } = getLisbonMonthRange(month);

    const [employeesResult, entriesResult] = await Promise.all([
      supabase.from("employees").select("id, code, name, role").order("code", { ascending: true }),
      supabase
        .from("time_entries")
        .select("employee_id, type, occurred_at")
        .gte("occurred_at", monthStart)
        .lte("occurred_at", monthEnd)
        .order("occurred_at", { ascending: true })
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (entriesResult.error) throw entriesResult.error;

    const employees = (employeesResult.data ?? []) as EmployeeRow[];
    const entries = (entriesResult.data ?? []) as TimeEntryRow[];
    const csv = buildCsv(month, employees, entries);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ponto-${month}.csv"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildCsv(month: string, employees: EmployeeRow[], entries: TimeEntryRow[]) {
  const rows = [
    [
      "Mes",
      "Data",
      "Codigo",
      "Funcionario",
      "Funcao",
      "Entrada",
      "Inicio pausa 1",
      "Fim pausa 1",
      "Inicio pausa 2",
      "Fim pausa 2",
      "Saida",
      "Horas liquidas",
      "Horas extra",
      "Estado"
    ]
  ];

  for (const employee of employees) {
    const employeeEntries = entries.filter((entry) => entry.employee_id === employee.id);
    const dates = Array.from(new Set(employeeEntries.map((entry) => getLisbonDateString(new Date(entry.occurred_at))))).sort();

    for (const date of dates) {
      const dateEntries = employeeEntries.filter((entry) => getLisbonDateString(new Date(entry.occurred_at)) === date);
      const marks = getDayMarks(dateEntries);
      const workedMinutes = marks.entrada && marks.saida ? calculateWorkedMinutes(dateEntries) : 0;
      const status = marks.entrada && marks.saida ? "Completo" : marks.entrada ? "Em curso" : "Incompleto";

      rows.push([
        month,
        formatDate(date),
        employee.code,
        employee.name,
        employee.role,
        formatTime(marks.entrada),
        formatTime(marks.pauseStarts[0]),
        formatTime(marks.pauseEnds[0]),
        formatTime(marks.pauseStarts[1]),
        formatTime(marks.pauseEnds[1]),
        formatTime(marks.saida),
        minutesToHours(workedMinutes),
        minutesToHours(Math.max(0, workedMinutes - 480)),
        status
      ]);
    }
  }

  return rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
}

function getDayMarks(entries: TimeEntryRow[]) {
  const ordered = [...entries].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
  );

  return {
    entrada: ordered.find((entry) => entry.type === "entrada")?.occurred_at,
    pauseStarts: ordered.filter((entry) => entry.type === "inicio_pausa").map((entry) => entry.occurred_at),
    pauseEnds: ordered.filter((entry) => entry.type === "fim_pausa").map((entry) => entry.occurred_at),
    saida: [...ordered].reverse().find((entry) => entry.type === "saida")?.occurred_at
  };
}

function calculateWorkedMinutes(entries: TimeEntryRow[]) {
  const marks = getDayMarks(entries);
  if (!marks.entrada || !marks.saida) return 0;

  let workedMinutes = diffMinutes(marks.entrada, marks.saida);
  let pauseStart: string | null = null;

  for (const entry of [...entries].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
  )) {
    if (entry.type === "inicio_pausa" && !pauseStart) {
      pauseStart = entry.occurred_at;
    } else if (entry.type === "fim_pausa" && pauseStart) {
      workedMinutes -= diffMinutes(pauseStart, entry.occurred_at);
      pauseStart = null;
    }
  }

  return Math.max(0, workedMinutes);
}

function getLisbonMonthString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit"
  }).format(new Date());
}

function getLisbonDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getLisbonMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    monthStart: zonedDateTimeToUtcIso(`${month}-01`, "00:00:00", "Europe/Lisbon"),
    monthEnd: zonedDateTimeToUtcIso(`${month}-${String(lastDay).padStart(2, "0")}`, "23:59:59", "Europe/Lisbon")
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
  if (!dateTime) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon"
  }).format(new Date(dateTime));
}

function minutesToHours(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return `${hours}h${String(mins).padStart(2, "0")}`;
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
