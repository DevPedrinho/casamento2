-- =========================================================
-- Site do casamento: Deysiane & Pedro — 22/05/2027
-- Tabelas principais, gatilhos e helpers.
-- =========================================================

create table if not exists public.guests (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  phone         text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.guests is 'Perfil de cada convidado cadastrado (1:1 com auth.users).';

create type public.rsvp_status as enum ('confirmado', 'nao_vou', 'talvez');

create table if not exists public.rsvps (
  guest_id        uuid primary key references public.guests(id) on delete cascade,
  status          public.rsvp_status not null default 'confirmado',
  companions      smallint not null default 0 check (companions >= 0 and companions <= 10),
  companion_names text,
  dietary_notes   text,
  message         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.rsvps is 'Confirmação de presença do convidado, com acompanhantes e recado.';

create table if not exists public.gifts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  price_cents   integer check (price_cents is null or price_cents >= 0),
  image_url     text,
  gift_url      text not null,
  category      text not null default 'Casa',
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.gifts is 'Itens do marketplace. gift_url é o link para onde o botão "Presentear" leva.';
comment on column public.gifts.gift_url is 'Link de pagamento/loja cadastrado pelos noivos no painel.';

create index if not exists gifts_active_order_idx on public.gifts (is_active, sort_order, created_at);

create table if not exists public.gift_claims (
  id          uuid primary key default gen_random_uuid(),
  gift_id     uuid not null references public.gifts(id) on delete cascade,
  guest_id    uuid references public.guests(id) on delete set null,
  guest_name  text,
  message     text,
  created_at  timestamptz not null default now()
);
comment on table public.gift_claims is 'Registro de quando um convidado clica em Presentear, para os noivos agradecerem.';

create index if not exists gift_claims_gift_idx on public.gift_claims (gift_id, created_at desc);

-- ---------- Gatilhos ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger guests_touch before update on public.guests
  for each row execute function public.touch_updated_at();
create trigger rsvps_touch before update on public.rsvps
  for each row execute function public.touch_updated_at();
create trigger gifts_touch before update on public.gifts
  for each row execute function public.touch_updated_at();

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guests (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
