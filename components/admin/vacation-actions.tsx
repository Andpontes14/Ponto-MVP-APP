"use client";

import { Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type VacationStatus = "pendente" | "aprovado" | "recusado";

export function VacationActions({
  requestId,
  employeeName,
  status
}: {
  requestId: string;
  employeeName: string;
  status: VacationStatus;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [message, setMessage] = useState("");

  async function updateVacation(action: "aprovar" | "recusar") {
    setIsSubmitting(true);
    setMessage(action === "aprovar" ? "A aprovar..." : "A recusar...");

    try {
      const response = await fetch(`/api/vacations/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const rawResult = await response.text();
      const result = parseJson(rawResult);

      if (!response.ok) {
        setMessage(result.error ?? rawResult ?? "Nao foi possivel atualizar.");
        return;
      }

      const nextStatus = result.request?.status ?? (action === "aprovar" ? "aprovado" : "recusado");
      setCurrentStatus(nextStatus);
      setMessage(nextStatus === "aprovado" ? "Aprovado" : nextStatus === "recusado" ? "Recusado" : "Atualizado");
      router.refresh();
      window.location.href = `/admin?atualizado=${Date.now()}#ferias`;
    } catch {
      setMessage("Erro de comunicacao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (currentStatus !== "pendente") {
    return (
      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-oat px-3 text-sm font-semibold text-black/55">
        <Clock size={15} />
        Sem acao
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => updateVacation("aprovar")}
        data-request-id={requestId}
        data-action="aprovar"
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Check size={15} />
        {isSubmitting ? "A processar" : "Aprovar"}
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => updateVacation("recusar")}
        data-request-id={requestId}
        data-action="recusar"
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X size={15} />
        {isSubmitting ? "A processar" : "Recusar"}
      </button>
      {message ? <span className="text-xs font-semibold text-black/55">{message}</span> : null}
    </div>
  );
}

function parseJson(value: string) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}
