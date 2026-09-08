-- =========================================================
-- Planejamento do casamento: checklist, CRM de fornecedores
-- e financeiro. Tudo restrito aos noivos (is_admin).
-- =========================================================

create type public.task_status   as enum ('pendente', 'fazendo', 'feito');
create type public.vendor_status as enum ('prospecto', 'contatado', 'proposta', 'negociando', 'contratado', 'descartado');

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  notes       text,
  category    text not null default 'Geral',
  -- Fase do planejamento ("12 meses antes", "No dia"...). Ordenada por phase_order.
  phase       text not null default 'Sem prazo',
  phase_order smallint not null default 99,
  status      public.task_status not null default 'pendente',
  owner       text,
  due_date    date,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.tasks is 'Checklist do casamento, agrupado por fase do planejamento.';
create index tasks_fase_idx on public.tasks (phase_order, sort_order, created_at);

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null default 'Geral',
  status         public.vendor_status not null default 'prospecto',
  contact_name   text,
  phone          text,
  email          text,
  instagram      text,
  website        text,
  quoted_cents   integer check (quoted_cents is null or quoted_cents >= 0),
  agreed_cents   integer check (agreed_cents is null or agreed_cents >= 0),
  rating         smallint check (rating is null or rating between 1 and 5),
  next_action    text,
  next_action_at date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.vendors is 'Funil de fornecedores: do primeiro contato ao contrato fechado.';
create index vendors_status_idx on public.vendors (status, category, name);

create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  description      text not null,
  category         text not null default 'Geral',
  vendor_id        uuid references public.vendors(id) on delete set null,
  estimated_cents  integer not null default 0 check (estimated_cents >= 0),
  contracted_cents integer check (contracted_cents is null or contracted_cents >= 0),
  due_date         date,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.expenses is 'Itens do orçamento: quanto se previa gastar e quanto foi fechado.';
create index expenses_categoria_idx on public.expenses (category, due_date);

-- Parcelas: casamento quase sempre é pago em várias vezes.
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_at      date not null default current_date,
  method       text,
  notes        text,
  created_at   timestamptz not null default now()
);
comment on table public.payments is 'Pagamentos feitos em cada item do orçamento (permite parcelas).';
create index payments_expense_idx on public.payments (expense_id, paid_at);

create table public.wedding_settings (
  id                 boolean primary key default true check (id),
  budget_total_cents integer not null default 0 check (budget_total_cents >= 0),
  updated_at         timestamptz not null default now()
);
comment on table public.wedding_settings is 'Linha única com o orçamento total planejado.';
insert into public.wedding_settings (id, budget_total_cents) values (true, 0);

create trigger tasks_touch    before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger vendors_touch  before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.wedding_settings
  for each row execute function public.touch_updated_at();

-- ---------- RLS: nada aqui é do convidado ----------
alter table public.tasks            enable row level security;
alter table public.vendors          enable row level security;
alter table public.expenses         enable row level security;
alter table public.payments         enable row level security;
alter table public.wedding_settings enable row level security;

create policy "admin gerencia o checklist"
  on public.tasks for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin gerencia fornecedores"
  on public.vendors for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin gerencia o orcamento"
  on public.expenses for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin gerencia pagamentos"
  on public.payments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin gerencia as configuracoes"
  on public.wedding_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
