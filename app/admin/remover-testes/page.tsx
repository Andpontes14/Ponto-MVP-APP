import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

const fictitiousCodes = ["001", "002", "003"];
const fictitiousNames = ["Maria Silva", "Joao Costa", "Ana Martins"];
const fictitiousIds = [
  "10000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000002",
  "10000000-0000-0000-0000-000000000003"
];
const fictitiousHourBankNotes = [
  "Pagamento de horas extras",
  "Folga excepcional",
  "Pagar 2h no fechamento mensal",
  "Saiu 1h mais cedo por folga excepcional",
  "Extras acumuladas da semana anterior",
  "Horas extra mantidas em banco"
];
const fictitiousVacationRanges = [
  { start: "2026-08-10", end: "2026-08-14" },
  { start: "2026-09-07", end: "2026-09-11" }
];

export default async function RemoveTestEmployeesPage() {
  const result = await removeFictitiousEmployees();

  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-items-center px-6 py-12">
      <section className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-moss">Limpeza administrativa</p>
        <h1 className="text-3xl font-bold">Funcionarios ficticios removidos</h1>
        <p className="mt-3 text-black/65">
          Esta pagina remove apenas os dados ficticios de teste. Funcionarios reais nao sao apagados por aqui.
        </p>

        <div className="mt-6 rounded-lg border border-black/10 bg-oat p-4">
          {result.error ? (
            <p className="font-semibold text-[#8b2f25]">{result.error}</p>
          ) : result.removed.length ? (
            <ul className="grid gap-2">
              {result.removed.map((employee) => (
                <li key={employee.id} className="font-semibold">
                  {employee.code} - {employee.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-semibold">Nenhum funcionario ficticio encontrado.</p>
          )}
        </div>

        <Link
          href="/admin"
          className="focus-ring mt-6 inline-flex h-11 items-center rounded-md bg-moss px-4 font-semibold text-white"
        >
          Voltar ao admin
        </Link>
      </section>
    </main>
  );
}

async function removeFictitiousEmployees() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: employees, error: findError } = await supabase
      .from("employees")
      .select("id, code, name")
      .order("code", { ascending: true });

    if (findError) {
      return { removed: [], error: findError.message };
    }

    const matchedEmployees = (employees ?? []).filter(
      (employee) =>
        fictitiousCodes.includes(employee.code) ||
        fictitiousNames.includes(employee.name) ||
        fictitiousIds.includes(employee.id)
    );
    const ids = matchedEmployees.map((employee) => employee.id);

    await supabase.from("hour_bank_transactions").delete().in("note", fictitiousHourBankNotes);
    for (const range of fictitiousVacationRanges) {
      await supabase
        .from("vacation_requests")
        .delete()
        .eq("start_date", range.start)
        .eq("end_date", range.end);
    }

    if (!ids.length) {
      return { removed: [], error: "" };
    }

    const tables = ["hour_bank_transactions", "vacation_requests", "time_adjustments", "time_entries"];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().in("employee_id", ids);
      if (error && table !== "time_adjustments") {
        return { removed: [], error: error.message };
      }
    }

    const { error: deleteError } = await supabase.from("employees").delete().in("id", ids);

    if (deleteError) {
      return { removed: [], error: deleteError.message };
    }

    return { removed: matchedEmployees, error: "" };
  } catch (error) {
    return { removed: [], error: error instanceof Error ? error.message : "Erro inesperado." };
  }
}
