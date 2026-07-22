"use client";

import { Check, Clock, CreditCard, Umbrella, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TransactionType = "credito_extra" | "pagamento" | "folga" | "ajuste";
type TransactionStatus = "pendente" | "aprovado" | "recusado";

export function HourBankActions({
  transactionId,
  employeeId,
  employeeName,
  type,
  status,
  minutes,
  balanceMinutes
}: {
  transactionId: string;
  employeeId: string;
  employeeName: string;
  type: TransactionType;
  status: TransactionStatus;
  minutes: number;
  balanceMinutes: number;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateTransaction(action: "aprovar" | "recusar") {
    const label = action === "aprovar" ? "aprovar" : "recusar";
    if (!window.confirm(`Confirmar ${label} este movimento de ${employeeName}?`)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/hour-bank/${transactionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error ?? "Nao foi possivel atualizar o movimento.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Erro de comunicacao ao atualizar movimento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createDebit(debitType: "pagamento" | "folga") {
    const label = debitType === "pagamento" ? "pagamento" : "folga";
    const hoursText = window.prompt(`Quantas horas deseja abater por ${label}? Exemplo: 1.5`);
    if (!hoursText) return;

    const hours = Number(hoursText.replace(",", "."));
    if (!Number.isFinite(hours) || hours <= 0) {
      window.alert("Informe um numero de horas valido.");
      return;
    }

    const minutesToDebit = Math.round(hours * 60);
    if (minutesToDebit > balanceMinutes) {
      window.alert("Saldo insuficiente no banco de horas.");
      return;
    }

    const note =
      window.prompt(
        debitType === "pagamento" ? "Observacao do pagamento:" : "Observacao da folga/compensacao:",
        debitType === "pagamento" ? "Pagamento de horas extras" : "Folga excepcional"
      ) ?? "";

    if (!note.trim()) {
      window.alert("A observacao e obrigatoria.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hour-bank", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          type: debitType,
          minutes: minutesToDebit,
          note
        })
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error ?? "Nao foi possivel criar a baixa.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Erro de comunicacao ao criar baixa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "pendente") {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={isSubmitting} onClick={() => updateTransaction("aprovar")} icon={Check} label="Aprovar" tone="primary" />
        <ActionButton disabled={isSubmitting} onClick={() => updateTransaction("recusar")} icon={X} label="Recusar" />
      </div>
    );
  }

  if (status === "aprovado" && type === "credito_extra" && minutes > 0 && balanceMinutes > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={isSubmitting} onClick={() => createDebit("pagamento")} icon={CreditCard} label="Pagar" tone="primary" />
        <ActionButton disabled={isSubmitting} onClick={() => createDebit("folga")} icon={Umbrella} label="Folga" />
      </div>
    );
  }

  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-md bg-oat px-3 text-sm font-semibold text-black/55">
      <Clock size={15} />
      Sem acao
    </span>
  );
}

function ActionButton({
  disabled,
  onClick,
  icon: Icon,
  label,
  tone = "neutral"
}: {
  disabled: boolean;
  onClick: () => void;
  icon: typeof Check;
  label: string;
  tone?: "primary" | "neutral";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "primary" ? "bg-moss text-white" : "border border-black/15 bg-white text-ink"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
