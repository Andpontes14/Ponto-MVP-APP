import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const active = String(formData.get("active") ?? "") === "true";
    const result = await updateEmployeeActive(params.id, active);

    if (!result.ok) {
      return NextResponse.redirect(new URL(`/admin?erro=${encodeURIComponent(result.error)}`, request.url));
    }

    return NextResponse.redirect(new URL("/admin?ok=funcionario", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.redirect(new URL(`/admin?erro=${encodeURIComponent(message)}`, request.url));
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const active = Boolean(payload.active);
    const result = await updateEmployeeActive(params.id, active);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, employee: result.employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function updateEmployeeActive(employeeId: string, active: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .update({ active })
    .eq("id", employeeId)
    .select("id, code, name, active")
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, employee: data };
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: employee, error: findError } = await supabase
      .from("employees")
      .select("id, code, name")
      .eq("id", params.id)
      .single();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: "Funcionario nao encontrado." }, { status: 404 });
    }

    if (!["001", "002", "003"].includes(employee.code)) {
      return NextResponse.json(
        { error: "Remocao direta bloqueada para funcionarios reais. Use desativar." },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase.from("employees").delete().eq("id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
