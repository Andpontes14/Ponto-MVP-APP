"use client";

import { AlertTriangle, Camera, CheckCircle2, Coffee, LogIn, LogOut, Pause, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { TimeEntryType } from "@/lib/types";

type TabletEmployee = {
  id: string;
  code: string;
  name: string;
  role: string;
};

type MessageTone = "info" | "success" | "error" | "warning";

type OfflineEntry = {
  id: string;
  code: string;
  employeeName: string;
  type: TimeEntryType;
  attemptedAt: string;
  photoPending: boolean;
};

const offlineStorageKey = "ponto-offline-entries";

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
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [offlineEntries, setOfflineEntries] = useState<OfflineEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  const employee = useMemo(() => employees.find((item) => item.code === code), [employees, code]);

  useEffect(() => {
    setOfflineEntries(loadOfflineEntries());

    async function loadEmployees() {
      try {
        const response = await fetch("/api/employees", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          showMessage(result.error ?? "Nao foi possivel carregar funcionarios.", "error");
          return;
        }

        const loadedEmployees = result.employees ?? [];
        setEmployees(loadedEmployees);
        setCode((currentCode) => currentCode || loadedEmployees[0]?.code || "");
        showMessage("Escolha o funcionario, tire a foto na entrada e confirme a marcacao.", "info");
      } catch {
        showMessage("Nao foi possivel carregar funcionarios. Pode digitar o codigo manualmente.", "error");
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, []);

  function showMessage(text: string, tone: MessageTone) {
    setMessage(text);
    setMessageTone(tone);
  }

  async function register(type: TimeEntryType) {
    if (!code) {
      showMessage("Informe o codigo do funcionario.", "error");
      return;
    }

    if (pin.length < 4) {
      showMessage("Informe o PIN de 4 digitos para confirmar.", "error");
      return;
    }

    if (type === "entrada" && !photoFile) {
      showMessage("Tire ou anexe uma foto para confirmar a entrada.", "error");
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
    showMessage(`A registar ${action.toLowerCase()}...`, "info");

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        saveOfflineAttempt(type);
        return;
      }

      const response = await fetch("/api/time-entry", {
        method: "POST",
        body: payload
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error ?? "Nao foi possivel registar a marcacao.", "error");
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

      showMessage(`${action} registada para ${result.employeeName ?? employee?.name ?? code} as ${now}.${extraText}`, "success");
      setPin("");
      if (type === "entrada") {
        setPhotoFile(null);
        setPhotoName("");
      }
    } catch {
      saveOfflineAttempt(type);
    } finally {
      setIsSubmitting(false);
    }
  }

  function saveOfflineAttempt(type: TimeEntryType) {
    const savedEntry: OfflineEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      code,
      employeeName: employee?.name ?? code,
      type,
      attemptedAt: new Date().toISOString(),
      photoPending: type === "entrada"
    };
    const nextEntries = [savedEntry, ...loadOfflineEntries()].slice(0, 20);
    saveOfflineEntries(nextEntries);
    setOfflineEntries(nextEntries);
    setPin("");
    showMessage(
      "Sem ligacao ao servidor. Guardei um registo local pendente para conferencia do gestor; ainda nao e ponto confirmado.",
      "warning"
    );
  }

  function clearOfflineEntries() {
    saveOfflineEntries([]);
    setOfflineEntries([]);
    showMessage("Registos locais pendentes foram limpos neste aparelho.", "info");
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
          <label
            htmlFor="photo"
            className="focus-ring mt-2 inline-flex h-12 cursor-pointer items-center gap-2 rounded-md border border-black/15 bg-white px-4 font-semibold hover:bg-oat"
          >
            <Camera size={18} />
            Clique para foto
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
            className="sr-only"
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

      <section className={`mt-6 flex items-center gap-3 rounded-lg border p-4 font-semibold ${messageToneClasses[messageTone]}`}>
        {messageTone === "error" || messageTone === "warning" ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        {message}
      </section>

      {offlineEntries.length ? (
        <section className="mt-4 rounded-lg border border-[#f6c85f]/40 bg-[#fff7e7] p-4 text-sm text-[#725018]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold">{offlineEntries.length} registo local pendente neste aparelho</div>
            <button
              type="button"
              onClick={clearOfflineEntries}
              className="focus-ring rounded-md border border-[#725018]/25 px-3 py-2 font-semibold hover:bg-white"
            >
              Limpar pendentes
            </button>
          </div>
          <div className="grid gap-2">
            {offlineEntries.map((entry) => (
              <div key={entry.id} className="rounded-md bg-white/70 px-3 py-2">
                <span className="font-semibold">{entry.employeeName}</span> - {entry.type.replace("_", " ")} -{" "}
                {formatLocalDateTime(entry.attemptedAt)}
                {entry.photoPending ? " - foto deve ser validada pelo gestor" : ""}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

const messageToneClasses: Record<MessageTone, string> = {
  info: "border-moss/25 bg-[#eef6ed] text-moss",
  success: "border-moss/30 bg-[#e8f3e6] text-moss",
  error: "border-[#b42318]/30 bg-[#fde8e8] text-[#9b1c1c]",
  warning: "border-[#f6c85f]/45 bg-[#fff7e7] text-[#725018]"
};

function loadOfflineEntries() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(offlineStorageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as OfflineEntry[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineEntries(entries: OfflineEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(offlineStorageKey, JSON.stringify(entries));
}

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
