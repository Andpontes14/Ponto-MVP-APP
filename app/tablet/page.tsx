"use client";

import { Camera, CheckCircle2, Coffee, LogIn, LogOut, Pause, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { TimeEntryType } from "@/lib/types";

type TabletEmployee = {
  id: string;
  code: string;
  name: string;
  role: string;
};

const actions: { type: TimeEntryType; label: string; icon: typeof LogIn }[] = [
  { type: "entrada", label: "Entrada", icon: LogIn },
  { type: "inicio_pausa", label: "Inicio de pausa", icon: Coffee },
  { type: "fim_pausa", label: "Fim de pausa", icon: Pause },
  { type: "saida", label: "Saida", icon: LogOut }
];

export default function TabletPage() {
  const [employees, setEmployees] = useState<TabletEmployee[]>([]);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("A carregar funcionarios...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  const employee = useMemo(() => employees.find((item) => item.code === code), [employees, code]);

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
        setMessage("Escolha o funcionario, tire a foto na entrada e confirme a marcacao.");
      } catch {
        setMessage("Nao foi possivel carregar funcionarios. Pode digitar o codigo manualmente.");
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, []);

  async function register(type: TimeEntryType) {
    if (!code) {
      setMessage("Informe o codigo do funcionario.");
      return;
    }

    if (pin.length < 4) {
      setMessage("Informe o PIN de 4 digitos para confirmar.");
      return;
    }

    if (type === "entrada" && !photoFile) {
      setMessage("Tire ou anexe uma foto para confirmar a entrada.");
      return;
    }

    const action = actions.find((item) => item.type === type)?.label ?? "Marcacao";
    const payload = new FormData();
    payload.append("code", code);
    payload.append("pin", pin);
    payload.append("type", type);
    if (photoFile) {
      payload.append("photo", photoFile);
    }

    setIsSubmitting(true);
    setMessage(`A registar ${action.toLowerCase()}...`);

    try {
      const response = await fetch("/api/time-entry", {
        method: "POST",
        body: payload
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Nao foi possivel registar a marcacao.");
        return;
      }

      const now = new Intl.DateTimeFormat("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date());
      const extraText =
        result.overtimeCreditMinutes > 0
          ? ` Credito pendente no banco: ${Math.floor(result.overtimeCreditMinutes / 60)}h${String(
              result.overtimeCreditMinutes % 60
            ).padStart(2, "0")}.`
          : "";

      setMessage(`${action} registada para ${result.employeeName ?? employee?.name ?? code} as ${now}.${extraText}`);
      setPin("");
      if (type === "entrada") {
        setPhotoFile(null);
        setPhotoName("");
      }
    } catch {
      setMessage("Nao foi possivel comunicar com o servidor. Confirme a configuracao do Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Tablet de marcacao"
      subtitle="Ecran pensado para ficar aberto no tablet da loja. A marcacao grava no Supabase quando as variaveis estiverem configuradas."
    >
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-black/65" htmlFor="employee-code">
            Codigo do funcionario
          </label>
          {employees.length ? (
            <select
              id="employee-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isLoadingEmployees}
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3"
            >
              {employees.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} - {item.name}
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
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3"
            />
          )}

          <label className="mt-5 block text-sm font-semibold text-black/65" htmlFor="pin">
            PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN"
            className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3 text-xl tracking-[0.25em]"
          />

          <div className="mt-5 flex items-center gap-2 rounded-md bg-oat p-3 text-sm text-black/70">
            <ShieldCheck size={18} />
            O PIN sera validado no Supabase. A foto e obrigatoria so na entrada; as outras marcacoes usam PIN e rede autorizada.
          </div>

          <label className="mt-5 block text-sm font-semibold text-black/65" htmlFor="photo">
            Foto da entrada
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setPhotoFile(file);
              setPhotoName(file?.name ?? "");
            }}
            className="focus-ring mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3 py-2"
          />
          <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-moss">
            <Camera size={17} />
            {photoName || "Obrigatoria apenas para Entrada"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => register(type)}
              disabled={isSubmitting || isLoadingEmployees}
              className="focus-ring flex min-h-[132px] flex-col items-start justify-between rounded-lg border border-black/10 bg-ink p-5 text-left text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon size={30} />
              <span className="text-2xl font-bold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 flex items-center gap-3 rounded-lg border border-moss/25 bg-[#eef6ed] p-4 font-semibold text-moss">
        <CheckCircle2 size={22} />
        {message}
      </section>
    </PageShell>
  );
}
