import { NextResponse } from "next/server";
import type { TimeEntryType } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const allowedTypes: TimeEntryType[] = ["entrada", "inicio_pausa", "fim_pausa", "saida"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const code = String(formData.get("code") ?? "").trim();
    const pin = String(formData.get("pin") ?? "").trim();
    const type = String(formData.get("type") ?? "") as TimeEntryType;
    const photo = formData.get("photo");
    const clientIp = getClientIp(request);

    if (!code || !pin || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Dados da marcacao incompletos." }, { status: 400 });
    }

    if (!isAllowedClockIp(clientIp)) {
      return NextResponse.json(
        { error: "Marcacao bloqueada fora da rede autorizada da loja." },
        { status: 403 }
      );
    }

    const requiresPhoto = type === "entrada";
    if (requiresPhoto && (!(photo instanceof File) || photo.size === 0)) {
      return NextResponse.json({ error: "A foto e obrigatoria apenas na entrada." }, { status: 400 });
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

    const now = new Date();
    let photoPath: string | null = null;
    const verificationFlags: string[] = [];

    if (photo instanceof File && photo.size > 0) {
      const dateKey = now.toISOString().slice(0, 10);
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      photoPath = `${employee.employee_id}/${dateKey}/${Date.now()}-${safeName}`;

      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("time-photos")
        .upload(photoPath, photoBuffer, {
          contentType: photo.type || "image/jpeg",
          upsert: false
        });

      if (uploadError) {
        return NextResponse.json({ error: `Erro ao enviar foto: ${uploadError.message}` }, { status: 500 });
      }

      if (photo.size < 15_000) {
        verificationFlags.push("Foto muito pequena, rever nitidez");
      }
    }

    const { data: entry, error: insertError } = await supabase
      .from("time_entries")
      .insert({
        employee_id: employee.employee_id,
        type,
        occurred_at: now.toISOString(),
        source: "tablet",
        device_label: clientIp ? `Rede loja (${clientIp})` : "Rede loja",
        photo_path: photoPath,
        verification_status: verificationFlags.length ? "rever" : "pendente",
        verification_flags: verificationFlags
      })
      .select("id, occurred_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    let overtimeCreditMinutes = 0;
    if (type === "saida") {
      overtimeCreditMinutes = await createPendingOvertimeCredit(supabase, employee.employee_id, now);
    }

    return NextResponse.json({
      ok: true,
      employeeName: employee.employee_name,
      entry,
      overtimeCreditMinutes
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createPendingOvertimeCredit(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  employeeId: string,
  now: Date
) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("type, occurred_at")
    .eq("employee_id", employeeId)
    .gte("occurred_at", dayStart.toISOString())
    .lte("occurred_at", dayEnd.toISOString())
    .order("occurred_at", { ascending: true });

  if (error || !entries?.length) return 0;

  const byType = Object.fromEntries(entries.map((entry) => [entry.type, entry.occurred_at]));
  if (!byType.entrada || !byType.saida) return 0;

  let workedMinutes = diffMinutes(byType.entrada, byType.saida);
  if (byType.inicio_pausa && byType.fim_pausa) {
    workedMinutes -= diffMinutes(byType.inicio_pausa, byType.fim_pausa);
  }

  const overtimeMinutes = Math.max(0, workedMinutes - 480);
  if (overtimeMinutes <= 0) return 0;

  const transactionDate = now.toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("hour_bank_transactions")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("type", "credito_extra")
    .eq("transaction_date", transactionDate)
    .limit(1);

  if (existing?.length) return overtimeMinutes;

  await supabase.from("hour_bank_transactions").insert({
    employee_id: employeeId,
    type: "credito_extra",
    minutes: overtimeMinutes,
    transaction_date: transactionDate,
    status: "pendente",
    note: "Credito automatico gerado na saida. Rever antes de aprovar."
  });

  return overtimeMinutes;
}

function diffMinutes(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();
  return request.headers.get("x-real-ip")?.trim() ?? "";
}

function isAllowedClockIp(clientIp: string) {
  const allowedIps = process.env.ALLOWED_CLOCK_IPS?.split(",").map((ip) => ip.trim()).filter(Boolean) ?? [];
  if (!allowedIps.length) return true;
  return allowedIps.includes(clientIp);
}
