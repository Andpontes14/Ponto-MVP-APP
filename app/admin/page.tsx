import { AlertTriangle, Download, Pencil, Plus, TimerReset, UserRoundCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  buildDailySummaries,
  employees,
  employeeName,
  formatDate,
  hourBankBalance,
  hourBankTransactions,
  minutesToHours,
  remainingVacationDays,
  totalHourBankBalance,
  totalOvertimeMinutes,
  vacationRequests
} from "@/lib/mock-data";

export default function AdminPage() {
  const summaries = buildDailySummaries();
  const reviews = summaries.filter((summary) => summary.verificationStatus === "rever");

  return (
    <PageShell
      title="Administracao"
      subtitle="Gestao minima para funcionarios, ferias e preparacao de relatorios mensais."
    >
      <section className="mb-6 flex flex-wrap gap-3">
        <button className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-white">
          <Plus size={18} />
          Funcionario
        </button>
        <button className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-black/15 bg-white px-4 font-semibold">
          <Download size={18} />
          Exportar CSV
        </button>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gold/35 bg-[#fff7e7] p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-[#725018]">
            <TimerReset size={20} />
            Banco de horas
          </div>
          <div className="text-3xl font-bold">{minutesToHours(totalHourBankBalance())}</div>
          <p className="mt-2 text-sm text-black/65">
            Saldo acumulado. Extras podem ser pagas, mantidas em banco ou abatidas com folga.
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
      </section>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Funcionarios de teste</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-oat text-xs uppercase text-black/60">
              <tr>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Funcao</th>
                <th className="px-4 py-3">Admissao</th>
                <th className="px-4 py-3">Horas semanais</th>
                <th className="px-4 py-3">Ferias disponiveis</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Editar</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-black/10">
                  <td className="px-4 py-3 font-semibold">{employee.code}</td>
                  <td className="px-4 py-3">{employee.name}</td>
                  <td className="px-4 py-3">{employee.role}</td>
                  <td className="px-4 py-3">{formatDate(employee.admissionDate)}</td>
                  <td className="px-4 py-3">{employee.weeklyHours}h</td>
                  <td className="px-4 py-3">{remainingVacationDays(employee)} dias</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f3e6] px-2 py-1 text-xs font-semibold text-moss">
                      <UserRoundCheck size={14} />
                      Ativo
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/15">
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-bold">Revisao de seguranca e horas extras</h2>
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
                  <td className="px-4 py-3 font-semibold">{employeeName(summary.employeeId)}</td>
                  <td className="px-4 py-3">{minutesToHours(summary.workedMinutes)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(summary.overtimeMinutes)}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(hourBankBalance(summary.employeeId))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${
                      summary.verificationStatus === "rever"
                        ? "bg-[#fff2d8] text-[#725018]"
                        : "bg-[#e8f3e6] text-moss"
                    }`}>
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
                  <td className="px-4 py-3">{formatDate(transaction.date)}</td>
                  <td className="px-4 py-3 font-semibold">{employeeName(transaction.employeeId)}</td>
                  <td className="px-4 py-3">{transaction.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-semibold">{minutesToHours(Math.abs(transaction.minutes))}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-oat px-2 py-1 text-xs font-semibold uppercase">
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{transaction.note}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="focus-ring h-9 rounded-md bg-moss px-3 text-sm font-semibold text-white">
                        Pagar
                      </button>
                      <button className="focus-ring h-9 rounded-md border border-black/15 px-3 text-sm font-semibold">
                        Abater folga
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-black/10 bg-[#fff7e7]">
                <td className="px-4 py-3">Hoje</td>
                <td className="px-4 py-3 font-semibold">Equipa</td>
                <td className="px-4 py-3">credito extra</td>
                <td className="px-4 py-3 font-semibold">{minutesToHours(totalOvertimeMinutes())}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[#fff2d8] px-2 py-1 text-xs font-semibold uppercase text-[#725018]">
                    pendente
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
          {vacationRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
              <div>
                <div className="font-semibold">{employeeName(request.employeeId)}</div>
                <div className="text-sm text-black/60">
                  {formatDate(request.startDate)} a {formatDate(request.endDate)} - {request.businessDays} dias uteis
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-oat px-2 py-1 text-xs font-semibold uppercase">{request.status}</span>
                <button className="focus-ring h-9 rounded-md bg-moss px-3 text-sm font-semibold text-white">
                  Aprovar
                </button>
                <button className="focus-ring h-9 rounded-md border border-black/15 px-3 text-sm font-semibold">
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
