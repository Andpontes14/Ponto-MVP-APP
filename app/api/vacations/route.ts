import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const code = String(payload.code ?? "").trim();
    const pin = String(payload.pin ?? "").trim();
    const startDate = String(payload.startDate ?? "").trim();
    const endDate = String(payload.endDate ?? "").trim();
    const note = String(payload.note ?? "").trim();

    if (!code || !pin || !startDate || !endDate) {
      return NextResponse.json({ error: "Preencha funcionario, PIN, inicio e fim das ferias." }, { status: 400 });
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json({ error: "Datas invalidas." }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "A data final nao pode ser anterior ao inicio." }, { status: 400 });
    }

    const businessDays = countBusinessDays(startDate, endDate);
    if (businessDays <= 0) {
      return NextResponse.json({ error: "O pedido precisa incluir pelo menos um dia util." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: employees, error: pinError } = await supabase.rpc("verify_employee_pin", {
      employee_code: code,
      employee_pin: pin
    });

    if (pinError) {
      return NextResponse.json({ error: pinError.message }, { status: 500 });
    }

    const employee = employees?.[0];
    if (!employee) {
      return NextResponse.json({ error: "Codigo ou PIN invalido." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("vacation_requests")
      .insert({
        employee_id: employee.employee_id,
        start_date: startDate,
        end_date: endDate,
        business_days: businessDays,
        status: "pendente",
        note: note || null
      })
      .select("id, start_date, end_date, business_days, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      request: data,
      employeeName: employee.employee_name,
      businessDays
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function countBusinessDays(startDate: string, endDate: string) {
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let total = 0;

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) total += 1;
    current.setDate(current.getDate() + 1);
  }

  return total;
}
