"use client";

import { UserMinus, UserRoundCheck } from "lucide-react";
import type { FormEvent } from "react";

export function EmployeeActions({
  employeeId,
  active,
  employeeName
}: {
  employeeId: string;
  active: boolean;
  employeeName: string;
}) {
  const nextActive = !active;
  const action = active ? "desativar" : "reativar";

  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`Confirmar ${action} ${employeeName}?`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={`/api/employees/${employeeId}`} method="post" onSubmit={confirmSubmit}>
      <input type="hidden" name="active" value={String(nextActive)} />
      <button
        type="submit"
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-black/15 px-3 text-sm font-semibold"
      >
        {active ? <UserMinus size={16} /> : <UserRoundCheck size={16} />}
        {active ? "Desativar" : "Reativar"}
      </button>
    </form>
  );
}
