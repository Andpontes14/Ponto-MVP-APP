"use client";

import { CalendarDays, CheckCircle2, PlaneTakeoff, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type EmployeeOption = {
  id: string;
  code: string;
  name: string;
  role: string;
};

export function VacationRequestForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("A carregar funcionarios...");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setMessage("Selecione o funcionario e envie o pedido para aprovacao.");
      } catch {
        setMessage("Nao foi possivel carregar funcionarios. Pode digitar o codigo manualmente.");
      }
    }

    loadEmployees();
  }, []);

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

      setPin("");
      setStartDate("");
      setEndDate("");
      setNote("");
      setMessage(`Pedido enviado: ${result.businessDays} dias uteis aguardando aprovacao.`);
    } catch {
      setMessage("Erro de comunicacao ao enviar pedido de ferias.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
              onChange={(event) => setCode(event.target.value)}
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
              onChange={(event) => setCode(event.target.value)}
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
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN"
            className="focus-ring h-12 w-full rounded-md border border-black/15 bg-white px-3 text-xl tracking-[0.25em]"
          />

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
            Enviar pedido
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2 font-bold text-moss">
          <CalendarDays size={21} />
          Estado
        </div>
        <div className="flex min-h-[220px] items-center gap-3 rounded-lg border border-moss/25 bg-[#eef6ed] p-4 font-semibold text-moss">
          <CheckCircle2 size={24} />
          {message}
        </div>
      </div>
    </section>
  );
}
