create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

create type public.time_entry_type as enum ('entrada', 'inicio_pausa', 'fim_pausa', 'saida');
create type public.vacation_status as enum ('pendente', 'aprovado', 'recusado');
create type public.verification_status as enum ('pendente', 'confirmado', 'rever');
create type public.hour_bank_transaction_type as enum ('credito_extra', 'pagamento', 'folga', 'ajuste');
create type public.approval_status as enum ('pendente', 'aprovado', 'recusado');

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  code text not null,
  name text not null,
  role text not null,
  admission_date date not null,
  weekly_hours numeric(5,2) not null default 40,
  vacation_allowance integer not null default 22,
  vacation_used integer not null default 0,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (establishment_id, code)
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type public.time_entry_type not null,
  occurred_at timestamptz not null default now(),
  source text not null default 'tablet',
  device_label text not null default 'Tablet loja',
  photo_path text,
  verification_status public.verification_status not null default 'pendente',
  verification_flags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

create table public.time_adjustments (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  original_occurred_at timestamptz not null,
  corrected_occurred_at timestamptz not null,
  reason text not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

create table public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  business_days integer not null,
  status public.vacation_status not null default 'pendente',
  note text,
  approved_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.overtime_rules (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  daily_regular_minutes integer not null default 480,
  monthly_approval_required boolean not null default true,
  allow_payment boolean not null default true,
  allow_time_off boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.hour_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type public.hour_bank_transaction_type not null,
  minutes integer not null,
  transaction_date date not null default current_date,
  status public.approval_status not null default 'pendente',
  note text not null,
  approved_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (minutes <> 0)
);

insert into storage.buckets (id, name, public)
values ('time-photos', 'time-photos', false)
on conflict (id) do nothing;

create view public.daily_time_summary as
select
  e.id as employee_id,
  e.name as employee_name,
  date(te.occurred_at) as work_date,
  min(te.occurred_at) filter (where te.type = 'entrada') as entrada,
  min(te.occurred_at) filter (where te.type = 'inicio_pausa') as inicio_pausa,
  max(te.occurred_at) filter (where te.type = 'fim_pausa') as fim_pausa,
  max(te.occurred_at) filter (where te.type = 'saida') as saida,
  bool_or(te.verification_status = 'rever') as needs_review
from public.employees e
join public.time_entries te on te.employee_id = e.id
group by e.id, e.name, date(te.occurred_at);

create or replace function public.verify_employee_pin(employee_code text, employee_pin text)
returns table(employee_id uuid, employee_name text)
language sql
security definer
set search_path = public
as $$
  select e.id, e.name
  from public.employees e
  where e.code = employee_code
    and e.active = true
    and e.pin_hash = extensions.crypt(employee_pin, e.pin_hash)
  limit 1;
$$;

alter table public.establishments enable row level security;
alter table public.employees enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_adjustments enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.overtime_rules enable row level security;
alter table public.hour_bank_transactions enable row level security;

-- MVP inicial: permissivo para teste local autenticado anon.
-- Antes de usar em producao, trocar por politicas com auth.uid() e perfis.
create policy "mvp_read_establishments" on public.establishments for select using (true);
create policy "mvp_read_employees" on public.employees for select using (true);
create policy "mvp_insert_time_entries" on public.time_entries for insert with check (true);
create policy "mvp_read_time_entries" on public.time_entries for select using (true);
create policy "mvp_manage_vacations" on public.vacation_requests for all using (true) with check (true);
create policy "mvp_read_adjustments" on public.time_adjustments for select using (true);
create policy "mvp_read_overtime_rules" on public.overtime_rules for select using (true);
create policy "mvp_manage_hour_bank" on public.hour_bank_transactions for all using (true) with check (true);

grant execute on function public.verify_employee_pin(text, text) to anon, authenticated, service_role;
