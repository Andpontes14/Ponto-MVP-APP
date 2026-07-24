import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const fictitiousCodes = ["001", "002", "003"];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: employees, error: findError } = await supabase
      .from("employees")
      .select("id, code, name")
      .in("code", fictitiousCodes);

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    const ids = (employees ?? []).map((employee) => employee.id);
    if (!ids.length) {
      return NextResponse.json({ ok: true, removed: [], message: "Nenhum funcionario ficticio encontrado." });
    }

    const { error: deleteError } = await supabase.from("employees").delete().in("id", ids);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, removed: employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
