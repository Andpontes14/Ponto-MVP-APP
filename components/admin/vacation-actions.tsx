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

  async function updateVacation(action: "aprovar" | "recusar") {
    const label = action === "aprovar" ? "aprovar" : "recusar";
    if (!window.confirm(`Confirmar ${label} este pedido de ferias de ${employeeName}?`)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/vacations/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json();

      if (!response.ok) {
        window.alert(result.error ?? "Nao foi possivel atualizar o pedido.");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Erro de comunicacao ao atualizar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status !== "pendente") {
    return (
      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-oat px-3 text-sm font-semibold text-black/55">
        <Clock size={15} />
        Sem acao
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => updateVacation("aprovar")}
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Check size={15} />
        Aprovar
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => updateVacation("recusar")}
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X size={15} />
        Recusar
      </button>
    </div>
  );
}
