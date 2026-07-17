insert into public.establishments (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Seventh Brunch')
on conflict do nothing;

insert into public.employees (
  id,
  establishment_id,
  code,
  name,
  role,
  admission_date,
  weekly_hours,
  vacation_allowance,
  vacation_used,
  pin_hash
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '001',
    'Maria Silva',
    'Sala',
    '2024-03-15',
    40,
    22,
    8,
    extensions.crypt('1234', extensions.gen_salt('bf'))
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '002',
    'Joao Costa',
    'Cozinha',
    '2023-11-02',
    40,
    22,
    12,
    extensions.crypt('2468', extensions.gen_salt('bf'))
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '003',
    'Ana Martins',
    'Gerencia',
    '2022-06-01',
    40,
    22,
    5,
    extensions.crypt('1357', extensions.gen_salt('bf'))
  )
on conflict do nothing;

insert into public.time_entries (employee_id, type, occurred_at) values
  ('10000000-0000-0000-0000-000000000001', 'entrada', '2026-07-17 08:58:00+01'),
  ('10000000-0000-0000-0000-000000000001', 'inicio_pausa', '2026-07-17 13:02:00+01'),
  ('10000000-0000-0000-0000-000000000001', 'fim_pausa', '2026-07-17 14:00:00+01'),
  ('10000000-0000-0000-0000-000000000001', 'saida', '2026-07-17 18:05:00+01'),
  ('10000000-0000-0000-0000-000000000002', 'entrada', '2026-07-17 09:12:00+01'),
  ('10000000-0000-0000-0000-000000000002', 'inicio_pausa', '2026-07-17 13:30:00+01'),
  ('10000000-0000-0000-0000-000000000002', 'fim_pausa', '2026-07-17 14:15:00+01'),
  ('10000000-0000-0000-0000-000000000002', 'saida', '2026-07-17 18:05:00+01'),
  ('10000000-0000-0000-0000-000000000003', 'entrada', '2026-07-17 08:45:00+01');

update public.time_entries
set
  device_label = 'Tablet loja',
  photo_path = concat('private/time-photos/', id, '.jpg'),
  verification_status = 'confirmado'
where photo_path is null;

update public.time_entries
set
  verification_status = 'rever',
  verification_flags = array['Foto pouco nitida ou ausente']
where employee_id in (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
)
and type = 'entrada';

insert into public.vacation_requests (employee_id, start_date, end_date, business_days, status, note)
values
  ('10000000-0000-0000-0000-000000000001', '2026-08-10', '2026-08-14', 5, 'pendente', 'Semana de descanso'),
  ('10000000-0000-0000-0000-000000000002', '2026-09-07', '2026-09-11', 5, 'aprovado', null);

insert into public.overtime_rules (establishment_id, daily_regular_minutes, monthly_approval_required, allow_payment, allow_time_off)
values ('00000000-0000-0000-0000-000000000001', 480, true, true, true);

insert into public.hour_bank_transactions (employee_id, type, minutes, transaction_date, status, note)
values
  ('10000000-0000-0000-0000-000000000001', 'credito_extra', 129, '2026-07-12', 'aprovado', 'Extras acumuladas da semana anterior'),
  ('10000000-0000-0000-0000-000000000001', 'folga', -60, '2026-07-15', 'aprovado', 'Saiu 1h mais cedo por folga excepcional'),
  ('10000000-0000-0000-0000-000000000002', 'credito_extra', 188, '2026-07-10', 'aprovado', 'Horas extra mantidas em banco'),
  ('10000000-0000-0000-0000-000000000002', 'pagamento', -120, '2026-07-16', 'pendente', 'Pagar 2h no fechamento mensal');
