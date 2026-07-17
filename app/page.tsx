import { AlertTriangle, CalendarClock, CheckCircle2, Clock, TimerReset, UsersRound } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import {
  buildDailySummaries,
  employees,
  employeeName,
  formatDate,
  formatTime,
  minutesToHours,
  totalHourBankBalance,
  totalOvertimeMinutes,
  vacationRequests
} from "@/lib/mock-data";

export default function DashboardPage() {
  const summaries = buildDailySummaries();
  const present = summaries.filter((summary) => summary.entrada && !summary.saida).length;
  const completed = summaries.filter((summary) => summary.entrada && summary.saida).length;
  const issues = summaries.filter((summary) => summary.issue || summary.verificationStatus === "rever").length;
  const pendingVacations = vacationRequests.filter((request) => request.status === "pendente").length;

  return (
    <PageShell
      title="Painel diario"
      subtitle="Resumo operacional para acompanhar quem entrou, quem saiu, horas apuradas e pedidos de ferias."
    >
      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={UsersRound} label="Funcionarios ativos" value={String(employees.length)} />
        <StatCard icon={Clock} label="Presentes agora" value={String(present)} tone="success" />
        <StatCard icon={CheckCircle2} label="Jornadas fechadas" value={String(completed)} />
        <StatCard icon={CalendarClock} label="Ferias pendentes" value={String(pendingVacations)} tone="warning" />
        <StatCard icon={TimerReset} label="Extras hoje" value={minutesToHours(totalOvertimeMinutes())} tone="warning" />
        <StatCard icon={TimerReset} label="Banco acumulado" value={minutesToHours(totalHourBankBalance())} tone="success" />
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Ponto de {formatDate("2026-07-17")}</h2>
          {issues > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-md bg-[#fff2d8] px-3 py-1 text-sm font-semibold text-[#725018]">
              <AlertTriangle size={16} />
              {issues} anomalia
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Funcionario</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Inicio pausa</th>
                <th className="px-4 py-3">Fim pausa</th>
                <th className="px-4 py-3">Saida</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3">Validacao</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.employeeId} className="border-t border-black/10">
                  <td className="px-4 py-3 font-semibold">{employeeName(summary.employeeId)}</td>
                  <td className="px-4 py-3">{formatTime(summary.entrada)}</td>
                  <td className="px-4 py-3">{formatTime(summary.inicioPausa)}</td>
                  <td className="px-4 py-3">{formatTime(summary.fimPausa)}</td>
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
                      <span className="rounded-md bg-[#fff2d8] px-2 py-1 text-xs font-semibold text-[#725018]">
                        {summary.issue}
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#e8f3e6] px-2 py-1 text-xs font-semibold text-moss">
                        Completo
                      </span>
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
