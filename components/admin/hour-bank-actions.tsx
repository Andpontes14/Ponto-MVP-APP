"use client";

import { Check, Clock, CreditCard, Umbrella, X } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debitFormRef = useRef<HTMLFormElement>(null);
  const debitTypeRef = useRef<HTMLInputElement>(null);
  const debitMinutesRef = useRef<HTMLInputElement>(null);
  const debitNoteRef = useRef<HTMLInputElement>(null);

  function confirmDecision(event: FormEvent<HTMLFormElement>, action: "aprovar" | "recusar") {
    const label = action === "aprovar" ? "aprovar" : "recusar";
    if (!window.confirm(`Confirmar ${label} este movimento de ${employeeName}?`)) {
      event.preventDefault();
      return;
    }

    setIsSubmitting(true);
  }

  function createDebit(debitType: "pagamento" | "folga") {
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

    if (!debitFormRef.current || !debitTypeRef.current || !debitMinutesRef.current || !debitNoteRef.current) {
      window.alert("Formulario de baixa indisponivel. Recarregue a pagina e tente novamente.");
      return;
    }

    debitTypeRef.current.value = debitType;
    debitMinutesRef.current.value = String(minutesToDebit);
    debitNoteRef.current.value = note.trim();
    setIsSubmitting(true);
    debitFormRef.current.requestSubmit();
  }

  const debitForm = (
    <form ref={debitFormRef} action="/api/hour-bank" method="post" className="hidden">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input ref={debitTypeRef} type="hidden" name="type" />
      <input ref={debitMinutesRef} type="hidden" name="minutes" />
      <input ref={debitNoteRef} type="hidden" name="note" />
    </form>
  );

  if (status === "pendente") {
    return (
      <>
        {debitForm}
        <div className="flex flex-wrap gap-2">
          <DecisionForm
            action="aprovar"
            disabled={isSubmitting}
            icon={Check}
            label="Aprovar"
            onSubmit={(event) => confirmDecision(event, "aprovar")}
            tone="primary"
            transactionId={transactionId}
          />
          <DecisionForm
            action="recusar"
            disabled={isSubmitting}
            icon={X}
            label="Recusar"
            onSubmit={(event) => confirmDecision(event, "recusar")}
            transactionId={transactionId}
          />
        </div>
      </>
    );
  }

  if (status === "aprovado" && type === "credito_extra" && minutes > 0 && balanceMinutes > 0) {
    return (
      <>
        {debitForm}
        <div className="flex flex-wrap gap-2">
          <ActionButton disabled={isSubmitting} onClick={() => createDebit("pagamento")} icon={CreditCard} label="Pagar" tone="primary" />
          <ActionButton disabled={isSubmitting} onClick={() => createDebit("folga")} icon={Umbrella} label="Folga" />
        </div>
      </>
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

function DecisionForm({
  action,
  disabled,
  icon: Icon,
  label,
  onSubmit,
  tone = "neutral",
  transactionId
}: {
  action: "aprovar" | "recusar";
  disabled: boolean;
  icon: typeof Check;
  label: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  tone?: "primary" | "neutral";
  transactionId: string;
}) {
  return (
    <form action={`/api/hour-bank/${transactionId}`} method="post" onSubmit={onSubmit}>
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        disabled={disabled}
        className={`focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
          tone === "primary" ? "bg-moss text-white" : "border border-black/15 bg-white text-ink"
        }`}
      >
        <Icon size={15} />
        {label}
      </button>
    </form>
  );
}
