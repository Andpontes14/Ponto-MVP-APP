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
    const today = getLisbonDateString(now);
    const { dayStart, dayEnd } = getLisbonDayRange(today);
    const { data: existingEntries, error: existingError } = await supabase
      .from("time_entries")
      .select("type, occurred_at")
      .eq("employee_id", employee.employee_id)
      .gte("occurred_at", dayStart)
      .lte("occurred_at", dayEnd)
      .order("occurred_at", { ascending: true });

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const sequenceError = validateSequence(type, existingEntries ?? []);
    if (sequenceError) {
      return NextResponse.json({ error: sequenceError }, { status: 409 });
    }

    let photoPath: string | null = null;
    const verificationFlags: string[] = [];
    const hasOpenPauseBeforeEntry = hasOpenPause(existingEntries ?? []);

    if (photo instanceof File && photo.size > 0) {
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      photoPath = `${employee.employee_id}/${today}/${Date.now()}-${safeName}`;

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

    if (type === "saida" && hasOpenPauseBeforeEntry) {
      verificationFlags.push("Saida registada com pausa aberta");
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
  const transactionDate = getLisbonDateString(now);
  const { dayStart, dayEnd } = getLisbonDayRange(transactionDate);

  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("type, occurred_at")
    .eq("employee_id", employeeId)
    .gte("occurred_at", dayStart)
    .lte("occurred_at", dayEnd)
    .order("occurred_at", { ascending: true });

  if (error || !entries?.length) return 0;

  const workedMinutes = calculateWorkedMinutes(entries);
  if (workedMinutes <= 0) return 0;

  const overtimeMinutes = Math.max(0, workedMinutes - 480);
  if (overtimeMinutes <= 0) return 0;

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

function validateSequence(type: TimeEntryType, entries: { type: TimeEntryType; occurred_at: string }[]) {
  const counts = entries.reduce(
    (totals, entry) => {
      totals[entry.type] += 1;
      return totals;
    },
    { entrada: 0, inicio_pausa: 0, fim_pausa: 0, saida: 0 } satisfies Record<TimeEntryType, number>
  );
  const hasOpenPause = counts.inicio_pausa > counts.fim_pausa;

  if (type === "entrada" && counts.entrada >= 1) {
    return "A entrada ja foi registada hoje.";
  }

  if (type === "saida" && counts.saida >= 1) {
    return "A saida ja foi registada hoje.";
  }

  if (type !== "entrada" && counts.entrada === 0) {
    return "Registe a entrada antes das outras marcacoes.";
  }

  if (type === "inicio_pausa" && counts.inicio_pausa >= 2) {
    return "O limite de duas pausas no dia ja foi atingido.";
  }

  if (type === "fim_pausa" && counts.fim_pausa >= 2) {
    return "O limite de duas pausas no dia ja foi atingido.";
  }

  if (type === "inicio_pausa" && hasOpenPause) {
    return "Feche a pausa atual antes de iniciar outra pausa.";
  }

  if (type === "fim_pausa" && !hasOpenPause) {
    return "Registe o inicio da pausa antes do fim da pausa.";
  }

  if ((type === "inicio_pausa" || type === "fim_pausa") && counts.saida > 0) {
    return "A jornada ja foi fechada com saida.";
  }

  return "";
}

function calculateWorkedMinutes(entries: { type: TimeEntryType; occurred_at: string }[]) {
  const ordered = [...entries].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()
  );
  const entrada = ordered.find((entry) => entry.type === "entrada")?.occurred_at;
  const saida = [...ordered].reverse().find((entry) => entry.type === "saida")?.occurred_at;
  if (!entrada || !saida) return 0;

  let workedMinutes = diffMinutes(entrada, saida);
  let pauseStart: string | null = null;

  for (const entry of ordered) {
    if (entry.type === "inicio_pausa" && !pauseStart) {
      pauseStart = entry.occurred_at;
    } else if (entry.type === "fim_pausa" && pauseStart) {
      workedMinutes -= diffMinutes(pauseStart, entry.occurred_at);
      pauseStart = null;
    }
  }

  if (pauseStart) {
    workedMinutes -= diffMinutes(pauseStart, saida);
  }

  return Math.max(0, workedMinutes);
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

function getLisbonDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getLisbonDayRange(date: string) {
  return {
    dayStart: zonedDateTimeToUtcIso(date, "00:00:00", "Europe/Lisbon"),
    dayEnd: zonedDateTimeToUtcIso(date, "23:59:59", "Europe/Lisbon")
  };
}

function zonedDateTimeToUtcIso(date: string, time: string, timeZone: string) {
  const utcGuess = new Date(`${date}T${time}.000Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000).toISOString();
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset"
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}
