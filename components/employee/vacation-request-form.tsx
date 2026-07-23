"use client";

import { CalendarCheck2, CalendarDays, CheckCircle2, PlaneTakeoff, Search, Send, TimerReset } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type EmployeeOption = {
  id: string;
  code: string;
  name: string;
  role: string;
};

type EmployeeStatus = {
  employee: {
    id: string;
    code: string;
    name: string;
    role: string;
    vacationBalance: number;
    hourBankBalanceMinutes: number;
  };
  vacations: VacationRequest[];
  hourBank: HourBankTransaction[];
};

type VacationRequest = {
  id: string;
  start_date: string;
  end_date: string;
  business_days: number;
  status: "pendente" | "aprovado" | "recusado";
  note: string | null;
  created_at: string;
};

type HourBankTransaction = {
  id: string;
  type: "credito_extra" | "pagamento" | "folga" | "ajuste";
  minutes: number;
  transaction_date: string;
  status: "pendente" | "aprovado" | "recusado";
  note: string;
  created_at: string;
};

export function VacationRequestForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("A carregar funcionarios...");
  const [statusData, setStatusData] = useState<EmployeeStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const response = await fetch("/api/employees", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error ?? "Nao foi possivel carregar funcionarios.");
          return;
        }

        const loadedEmployees = result.employees ?? [];
        setEmployees(loadedEmployees);
        setCode((currentCode) => currentCode || loadedEmployees[0]?.code || "");
        setMessage("Selecione o funcionario, informe o PIN e consulte seus pedidos.");
      } catch {
        setMessage("Nao foi possivel carregar funcionarios. Pode digitar o codigo manualmente.");
      }
    }

    loadEmployees();
  }, []);

  async function loadStatus() {
    if (!code || pin.length < 4) {
      setMessage("Informe codigo e PIN para consultar.");
      return null;
    }

    setIsLoadingStatus(true);
    setMessage("A consultar pedidos...");

    try {
      const response = await fetch("/api/employee-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin })
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Nao foi possivel consultar.");
        return null;
      }

      setStatusData(result);
      setMessage(`Consulta atualizada para ${result.employee.name}.`);
      return result as EmployeeStatus;
    } catch {
      setMessage("Erro de comunicacao ao consultar pedidos.");
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code || pin.length < 4 || !startDate || !endDate) {
      setMessage("Preencha funcionario, PIN, inicio e fim das ferias.");
      return;
    }

    setIsSubmitting(true);
    setMessage("A enviar pedido de ferias...");

    try {
      const response = await fetch("/api/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          pin,
          startDate,
          endDate,
          note
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Nao foi possivel enviar o pedido.");
        return;
      }

      setStartDate("");
      setEndDate("");
      setNote("");
      setMessage(`Pedido enviado: ${result.businessDays} dias uteis aguardando aprovacao.`);
      await loadStatus();
    } catch {
      setMessage("Erro de comunicacao ao enviar pedido de ferias.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 font-bold text-moss">
            <PlaneTakeoff size={21} />
            Pedido de ferias
          </div>

          <form onSubmit={submitRequest} className="grid gap-4">
            <label className="block text-sm font-semibold text-black/65" htmlFor="employee-code">
              Funcionario
            </label>
            {employees.length ? (
              <select
                id="employee-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setStatusData(null);
                }}
                className="focus-ring h-12 w-full rounded-md border border-black/15 bg-white px-3"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.code}>
                    {employee.code} - {employee.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="employee-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setStatusData(null);
                }}
                inputMode="numeric"
                placeholder="Codigo"
                className="focus-ring h-12 w-full rounded-md border border-black/15 bg-white px-3"
              />
            )}

            <label className="block text-sm font-semibold text-black/65" htmlFor="employee-pin">
              PIN
            </label>
            <input
              id="employee-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                setStatusData(null);
              }}
              placeholder="PIN"
              className="focus-ring h-12 w-full rounded-md border border-black/15 bg-white px-3 text-xl tracking-[0.25em]"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadStatus}
                disabled={isLoadingStatus}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search size={17} />
                {isLoadingStatus ? "A consultar" : "Consultar status"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-black/65" htmlFor="start-date">
                  Inicio
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black/65" htmlFor="end-date">
                  Fim
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3"
                />
              </div>
            </div>

            <label className="block text-sm font-semibold text-black/65" htmlFor="vacation-note">
              Observacao
            </label>
            <textarea
              id="vacation-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Opcional"
              className="focus-ring w-full rounded-md border border-black/15 bg-white px-3 py-3"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={18} />
              {isSubmitting ? "A enviar" : "Enviar pedido"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 font-bold text-moss">
            <CalendarDays size={21} />
            Estado
          </div>
          <div className="flex min-h-[180px] items-center gap-3 rounded-lg border border-moss/25 bg-[#eef6ed] p-4 font-semibold text-moss">
            <CheckCircle2 size={24} />
            {message}
          </div>

          {statusData ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatusCard
                icon={CalendarCheck2}
                label="Ferias disponiveis"
                value={`${statusData.employee.vacationBalance} dias`}
              />
              <StatusCard
                icon={TimerReset}
                label="Banco de horas"
                value={minutesToHours(statusData.employee.hourBankBalanceMinutes)}
              />
            </div>
          ) : null}
        </div>
      </section>

      {statusData ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 px-4 py-3">
              <h2 className="text-lg font-bold">Meus pedidos de ferias</h2>
            </div>
            <div className="divide-y divide-black/10">
              {statusData.vacations.length ? (
                statusData.vacations.map((request) => (
                  <div key={request.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {formatDate(request.start_date)} a {formatDate(request.end_date)}
                        </div>
                        <div className="text-sm text-black/60">{request.business_days} dias uteis</div>
                      </div>
                      <StatusPill status={request.status} />
                    </div>
                    {request.note ? <div className="mt-2 text-sm text-black/55">{request.note}</div> : null}
                  </div>
                ))
              ) : (
                <div className="px-4 py-5 text-sm font-semibold text-black/55">Nenhum pedido de ferias.</div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 px-4 py-3">
              <h2 className="text-lg font-bold">Meu banco de horas e folgas</h2>
            </div>
            <div className="divide-y divide-black/10">
              {statusData.hourBank.length ? (
                statusData.hourBank.map((transaction) => (
                  <div key={transaction.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{formatHourBankType(transaction.type)}</div>
                        <div className="text-sm text-black/60">
                          {formatDate(transaction.transaction_date)} - {signedMinutesToHours(transaction.minutes)}
                        </div>
                      </div>
                      <StatusPill status={transaction.status} />
                    </div>
                    <div className="mt-2 text-sm text-black/55">{transaction.note}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-5 text-sm font-semibold text-black/55">
                  Nenhum movimento de banco de horas.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarCheck2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-oat p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-moss">
        <Icon size={17} />
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "pendente" | "aprovado" | "recusado" }) {
  const className =
    status === "pendente"
      ? "bg-[#fff2d8] text-[#725018]"
      : status === "aprovado"
        ? "bg-[#e8f3e6] text-moss"
        : "bg-[#f6e6e3] text-[#8b2f25]";

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${className}`}>
      {status}
    </span>
  );
}

function formatHourBankType(type: HourBankTransaction["type"]) {
  const labels = {
    credito_extra: "Credito de horas extra",
    pagamento: "Pagamento de horas",
    folga: "Folga por banco de horas",
    ajuste: "Ajuste manual"
  };
  return labels[type];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function minutesToHours(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `${sign}${hours}h${String(mins).padStart(2, "0")}`;
}

function signedMinutesToHours(minutes: number) {
  const sign = minutes > 0 ? "+" : "";
  return `${sign}${minutesToHours(minutes)}`;
}
