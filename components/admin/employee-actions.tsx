"use client";

import { UserMinus, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmployeeActions({
  employeeId,
  active,
  employeeName
}: {
  employeeId: string;
  active: boolean;
  employeeName: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextActive = !active;

  async function toggleActive() {
    const action = active ? "desativar" : "reativar";
    const confirmed = window.confirm(`Confirmar ${action} ${employeeName}?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active: nextActive })
      });
      const result = await response.json();

      if (!response.ok) {
        window.alert(result.error ?? "Nao foi possivel atualizar funcionario.");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Erro de comunicacao ao atualizar funcionario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleActive}
      disabled={isSubmitting}
      className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-black/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      {active ? <UserMinus size={16} /> : <UserRoundCheck size={16} />}
      {active ? "Desativar" : "Reativar"}
    </button>
  );
}
