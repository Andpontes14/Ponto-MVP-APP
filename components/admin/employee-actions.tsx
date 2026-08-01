import { UserMinus, UserRoundCheck } from "lucide-react";
import { setEmployeeActive } from "@/app/admin/actions";

export function EmployeeActions({
  employeeId,
  active
}: {
  employeeId: string;
  active: boolean;
  employeeName: string;
}) {
  const nextActive = !active;

  return (
    <form action={setEmployeeActive}>
      <input type="hidden" name="employeeId" value={employeeId} />
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
