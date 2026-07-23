import { VacationRequestForm } from "@/components/employee/vacation-request-form";
import { PageShell } from "@/components/page-shell";

export default function EmployeePage() {
  return (
    <PageShell
      title="Area do funcionario"
      subtitle="Pedidos, ferias, folgas e banco de horas com validacao por codigo e PIN."
    >
      <VacationRequestForm />
    </PageShell>
  );
}
