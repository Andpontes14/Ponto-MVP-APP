import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("employees")
      .select("id, code, name, role")
      .eq("active", true)
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ employees: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const code = String(payload.code ?? "").trim();
    const name = String(payload.name ?? "").trim();
    const role = String(payload.role ?? "").trim();
    const admissionDate = String(payload.admissionDate ?? "").trim();
    const weeklyHours = Number(payload.weeklyHours ?? 40);
    const vacationAllowance = Number(payload.vacationAllowance ?? 22);
    const vacationUsed = Number(payload.vacationUsed ?? 0);
    const pin = String(payload.pin ?? "").trim();

    if (!code || !name || !role || !admissionDate || !pin) {
      return NextResponse.json({ error: "Preencha codigo, nome, funcao, admissao e PIN." }, { status: 400 });
    }

    if (!/^\d{3,6}$/.test(code)) {
      return NextResponse.json({ error: "O codigo deve ter entre 3 e 6 digitos." }, { status: 400 });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "O PIN deve ter entre 4 e 6 digitos." }, { status: 400 });
    }

    if (weeklyHours <= 0 || weeklyHours > 60) {
      return NextResponse.json({ error: "Horas semanais invalidas." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: establishment, error: establishmentError } = await supabase
      .from("establishments")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (establishmentError || !establishment) {
      return NextResponse.json({ error: "Estabelecimento nao encontrado." }, { status: 500 });
    }

    const { data: pinHashData, error: hashError } = await supabase.rpc("hash_employee_pin", {
      employee_pin: pin
    });

    if (hashError || !pinHashData) {
      return NextResponse.json({ error: hashError?.message ?? "Erro ao gerar PIN seguro." }, { status: 500 });
    }

    const { data: employee, error: insertError } = await supabase
      .from("employees")
      .insert({
        establishment_id: establishment.id,
        code,
        name,
        role,
        admission_date: admissionDate,
        weekly_hours: weeklyHours,
        vacation_allowance: vacationAllowance,
        vacation_used: vacationUsed,
        pin_hash: pinHashData,
        active: true
      })
      .select("id, code, name")
      .single();

    if (insertError) {
      const duplicate = insertError.code === "23505";
      return NextResponse.json(
        { error: duplicate ? "Ja existe funcionario com esse codigo." : insertError.message },
        { status: duplicate ? 409 : 500 }
      );
    }

    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
