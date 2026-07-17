import { CalendarCheck2, Clock3, PlaneTakeoff } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import {
  buildDailySummaries,
  employees,
  employeeName,
  formatDate,
  formatTime,
  minutesToHours,
  remainingVacationDays,
  vacationRequests
} from "@/lib/mock-data";

export default function EmployeePage() {
  const employee = employees[0];
  const summaries = buildDailySummaries().filter((summary) => summary.employeeId === employee.id);
  const vacations = vacationRequests.filter((request) => request.employeeId === employee.id);

  return (
    <PageShell
      title="Area do funcionario"
      subtitle="Primeira versao para consulta de marcacoes, horas do dia e pedidos de ferias."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Clock3} label="Horas hoje" value={minutesToHours(summaries[0]?.workedMinutes ?? 0)} />
        <StatCard icon={CalendarCheck2} label="Ferias disponiveis" value={`${remainingVacationDays(employee)} dias`} />
        <StatCard icon={PlaneTakeoff} label="Pedidos em aberto" value={String(vacations.filter((item) => item.status === "pendente").length)} tone="warning" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Marcacoes de {employeeName(employee.id)}</h2>
          <div className="mt-4 space-y-3">
            {summaries.map((summary) => (
              <div key={summary.date} className="rounded-md border border-black/10 bg-oat p-4">
                <div className="font-semibold">{formatDate(summary.date)}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <span>Entrada: {formatTime(summary.entrada)}</span>
                  <span>Pausa: {formatTime(summary.inicioPausa)}</span>
                  <span>Retorno: {formatTime(summary.fimPausa)}</span>
                  <span>Saida: {formatTime(summary.saida)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Ferias</h2>
          <div className="mt-4 space-y-3">
            {vacations.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-4">
                <div>
                  <div className="font-semibold">
                    {formatDate(request.startDate)} a {formatDate(request.endDate)}
                  </div>
                  <div className="text-sm text-black/60">{request.businessDays} dias uteis</div>
                </div>
                <span className="rounded-md bg-[#fff2d8] px-2 py-1 text-xs font-semibold uppercase text-[#725018]">
                  {request.status}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="focus-ring mt-5 inline-flex h-11 items-center rounded-md bg-moss px-4 font-semibold text-white"
          >
            Novo pedido
          </button>
        </div>
      </section>
    </PageShell>
  );
}
