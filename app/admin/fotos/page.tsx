import Link from "next/link";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type PhotosPageProps = {
  searchParams?: {
    employeeId?: string;
    date?: string;
  };
};

type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  type: "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
  occurred_at: string;
  photo_path: string | null;
  verification_status: "pendente" | "confirmado" | "rever";
};

type PhotoAuditItem = TimeEntryRow & {
  employeeName: string;
  photoUrl: string | null;
};

export const dynamic = "force-dynamic";

export default async function PhotoAuditPage({ searchParams }: PhotosPageProps) {
  const selectedDate = sanitizeDate(searchParams?.date) ?? getLisbonDateString();
  const data = await loadPhotoAuditData(searchParams?.employeeId, selectedDate);

  return (
    <PageShell
      title="Auditoria de fotos"
      subtitle="Fotografias das marcacoes por data para conferencia rapida do gestor."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Link
          href={`/?date=${selectedDate}`}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold hover:bg-oat"
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <form className="flex flex-wrap items-end gap-3" action="/admin/fotos" method="get">
          {searchParams?.employeeId ? <input type="hidden" name="employeeId" value={searchParams.employeeId} /> : null}
          <label className="grid gap-1 text-sm font-semibold text-black/65">
            Data
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="focus-ring h-11 rounded-md border border-black/15 bg-white px-3 text-black"
            />
          </label>
          <button className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-white hover:bg-moss">
            <Search size={18} />
            Ver fotos
          </button>
        </form>
      </div>

      {"error" in data ? (
        <section className="mt-5 rounded-lg border border-[#b42318]/30 bg-[#fde8e8] p-4 font-semibold text-[#9b1c1c]">
          {data.error}
        </section>
      ) : (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.length ? (
            data.items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                  <div>
                    <div className="font-bold">{item.employeeName}</div>
                    <div className="text-sm text-black/60">
                      {entryTypeLabel(item.type)} - {formatTime(item.occurred_at)}
                    </div>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${statusClass(item.verification_status)}`}>
                    {item.verification_status}
                  </span>
                </div>
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={`Foto de ${item.employeeName}`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center gap-2 bg-oat text-sm font-semibold text-black/55">
                    <Camera size={18} />
                    Sem foto nesta marcacao
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-black/10 bg-white p-5 text-sm font-semibold text-black/60 shadow-sm">
              Nenhuma foto encontrada nesta data para este filtro.
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}

async function loadPhotoAuditData(employeeId: string | undefined, selectedDate: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { dayStart, dayEnd } = getLisbonDayRange(selectedDate);

    const employeesQuery = supabase.from("employees").select("id, code, name, active").order("code", { ascending: true });
    const entriesQuery = supabase
      .from("time_entries")
      .select("id, employee_id, type, occurred_at, photo_path, verification_status")
      .gte("occurred_at", dayStart)
      .lte("occurred_at", dayEnd)
      .order("occurred_at", { ascending: true });

    if (employeeId) {
      entriesQuery.eq("employee_id", employeeId);
    }

    const [employeesResult, entriesResult] = await Promise.all([employeesQuery, entriesQuery]);
    if (employeesResult.error) throw employeesResult.error;
    if (entriesResult.error) throw entriesResult.error;

    const employees = (employeesResult.data ?? []) as EmployeeRow[];
    const employeeNames = new Map(employees.map((employee) => [employee.id, `${employee.code} - ${employee.name}`]));
    const entries = (entriesResult.data ?? []) as TimeEntryRow[];

    const items: PhotoAuditItem[] = await Promise.all(
      entries.map(async (entry) => {
        let photoUrl: string | null = null;

        if (entry.photo_path) {
          const { data } = await supabase.storage.from("time-photos").createSignedUrl(entry.photo_path, 60 * 60);
          photoUrl = data?.signedUrl ?? null;
        }

        return {
          ...entry,
          employeeName: employeeNames.get(entry.employee_id) ?? "Funcionario",
          photoUrl
        };
      })
    );

    return { items };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro inesperado ao carregar fotos."
    };
  }
}

function entryTypeLabel(type: TimeEntryRow["type"]) {
  const labels = {
    entrada: "Entrada",
    inicio_pausa: "Inicio pausa",
    fim_pausa: "Fim pausa",
    saida: "Saida"
  };
  return labels[type];
}

function statusClass(status: TimeEntryRow["verification_status"]) {
  if (status === "rever") return "bg-[#fde8e8] text-[#9b1c1c]";
  return "bg-[#e8f3e6] text-moss";
}

function getLisbonDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function sanitizeDate(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
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

function formatTime(dateTime: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon"
  }).format(new Date(dateTime));
}
