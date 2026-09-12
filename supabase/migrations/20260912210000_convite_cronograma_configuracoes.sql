-- =========================================================
--  Três módulos novos
--
--  1. Convite com tamanho: cada família tem um número de lugares,
--     e o convidado só confirma gente até esse limite — com nome e
--     idade de cada acompanhante, não um número solto.
--  2. Cronograma do grande dia.
--  3. Configurações gerais do site.
-- =========================================================

-- ---------------------------------------------------------
--  1. O convite tem tamanho
-- ---------------------------------------------------------

alter table public.guest_groups
  add column if not exists invite_limit smallint
    check (invite_limit is null or invite_limit between 1 and 20);

comment on column public.guest_groups.invite_limit is
  'Quantas pessoas o convite da família comporta, contando o titular.';

alter table public.guests
  add column if not exists invite_limit smallint
    check (invite_limit is null or invite_limit between 1 and 20);

comment on column public.guests.invite_limit is
  'Limite individual, para quem não está em família. Vazio = 1 + acompanhantes previstos.';

/**
 * Quantas pessoas cabem no convite deste convidado.
 *
 * A família manda: se ela tem limite, vale para todo mundo do grupo
 * junto. Sem família, vale o limite individual e, na falta dele, o que
 * já estava previsto na planilha (o próprio convidado + acompanhantes).
 */
create or replace function public.limite_do_convite(p_guest uuid)
returns integer language sql stable set search_path = '' as $$
  select greatest(
    1,
    coalesce(
      (select g.invite_limit
         from public.guests c
         join public.guest_groups g on g.id = c.group_id
        where c.id = p_guest),
      (select c.invite_limit from public.guests c where c.id = p_guest),
      (select 1 + c.companions_planned from public.guests c where c.id = p_guest),
      1
    )
  );
$$;

/** Os outros convidados que dividem o mesmo convite de família. */
create or replace function private.irmaos_de_convite(p_guest uuid)
returns setof uuid language sql stable set search_path = '' as $$
  select c.id
    from public.guests c
   where c.id <> p_guest
     and c.group_id is not null
     and c.group_id = (select g.group_id from public.guests g where g.id = p_guest)
     and exists (select 1 from public.guest_groups gg
                  where gg.id = c.group_id and gg.invite_limit is not null);
$$;

-- Acompanhantes com nome e idade, um por linha.
create table if not exists public.rsvp_companions (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.rsvps(guest_id) on delete cascade,
  full_name  text not null check (length(trim(full_name)) > 0),
  age        smallint check (age is null or age between 0 and 130),
  notes      text,
  created_at timestamptz not null default now()
);

comment on table public.rsvp_companions is
  'Quem vem junto com o convidado: nome e idade, para mesa e buffet.';

create index if not exists rsvp_companions_guest_idx
  on public.rsvp_companions (guest_id);

/**
 * Não deixa passar do tamanho do convite.
 *
 * Conta o titular mais os acompanhantes dele, e soma quem mais do mesmo
 * convite de família já confirmou. A checagem mora aqui, e não só na
 * tela, para valer mesmo que alguém chame a API por fora.
 */
create or replace function private.checar_tamanho_do_convite()
returns trigger language plpgsql set search_path = '' as $$
declare
  dono    uuid := coalesce(new.guest_id, old.guest_id);
  limite  integer := public.limite_do_convite(dono);
  pessoas integer;
begin
  select
    -- o titular e os acompanhantes dele
    1 + (select count(*) from public.rsvp_companions a where a.guest_id = dono)
    -- mais quem divide o convite e já respondeu que vem
    + coalesce((
        select sum(1 + (select count(*) from public.rsvp_companions a where a.guest_id = r.guest_id))
          from public.rsvps r
         where r.guest_id in (select private.irmaos_de_convite(dono))
           and r.status <> 'nao_vou'
      ), 0)
    into pessoas;

  if pessoas > limite then
    raise exception 'LIMITE_DO_CONVITE:%', limite;
  end if;

  return new;
end $$;

drop trigger if exists rsvp_companions_limite on public.rsvp_companions;
create constraint trigger rsvp_companions_limite
  after insert or update on public.rsvp_companions
  deferrable initially immediate
  for each row execute function private.checar_tamanho_do_convite();

/** Mantém rsvps.companions igual ao número de acompanhantes cadastrados. */
create or replace function private.sincronizar_contagem_acompanhantes()
returns trigger language plpgsql set search_path = '' as $$
declare dono uuid := coalesce(new.guest_id, old.guest_id);
begin
  update public.rsvps r
     set companions = (select count(*) from public.rsvp_companions a where a.guest_id = dono)
   where r.guest_id = dono;
  return null;
end $$;

drop trigger if exists rsvp_companions_contagem on public.rsvp_companions;
create trigger rsvp_companions_contagem
  after insert or delete or update on public.rsvp_companions
  for each row execute function private.sincronizar_contagem_acompanhantes();

alter table public.rsvp_companions enable row level security;

create policy "convidado cuida dos proprios acompanhantes"
  on public.rsvp_companions for all to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin())
  with check (guest_id = private.meu_guest_id() or private.is_admin());

-- ---------------------------------------------------------
--  2. Cronograma do grande dia
-- ---------------------------------------------------------

create table if not exists public.day_schedule (
  id          uuid primary key default gen_random_uuid(),
  starts_at   time not null,
  ends_at     time,
  title       text not null,
  description text,
  location    text,
  owner       text,
  vendor_id   uuid references public.vendors(id) on delete set null,
  -- 'convidados' aparece no site; 'interno' fica só para os noivos e a equipe.
  audience    text not null default 'interno'
                check (audience in ('interno', 'convidados')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.day_schedule is
  'Linha do tempo do dia do casamento, do primeiro pincel à última música.';

create index if not exists day_schedule_hora_idx
  on public.day_schedule (starts_at, sort_order);

create trigger day_schedule_touch before update on public.day_schedule
  for each row execute function public.touch_updated_at();

alter table public.day_schedule enable row level security;

create policy "todos veem o cronograma dos convidados"
  on public.day_schedule for select to anon, authenticated
  using (audience = 'convidados' or private.is_admin());

create policy "admin cuida do cronograma"
  on public.day_schedule for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------
--  3. Configurações gerais
-- ---------------------------------------------------------

create table if not exists public.site_settings (
  id                boolean primary key default true check (id),

  -- Quem casa
  bride_name        text not null default 'Deysiane',
  groom_name        text not null default 'Pedro',
  motto             text not null default 'Amor que acolhe',
  tagline           text not null default 'Um amor que cuida, se adapta e escolhe caminhar junto.',

  -- Quando
  wedding_at        timestamptz not null default '2027-05-22T16:00:00-03:00',
  ceremony_time     text default '16h00',
  reception_time    text default '18h00',
  dress_code        text default 'Esporte fino',

  -- Onde (o endereço detalhado continua em event_venues)
  venue_name        text,
  venue_address     text,
  venue_city        text,
  venue_maps_url    text,

  -- Como falar com os noivos
  contact_email     text,
  contact_whatsapp  text,
  instagram_url     text,
  hashtag           text,

  -- Regras do convite
  rsvp_deadline     date,
  default_invite_limit smallint not null default 2
                      check (default_invite_limit between 1 and 20),
  companion_rules   text default
    'Cada convite vale para um número certo de pessoas. Confirme apenas quem está no seu convite.',

  -- Imagens do bucket "site"
  logo_path         text,
  monogram_path     text,
  hero_image_path   text,
  og_image_path     text,

  -- Paleta (aplicada por cima da identidade, sem recompilar o site)
  color_olive       text,
  color_lavender    text,
  color_earth       text,
  color_cream       text,

  -- Textos soltos do site, por chave
  texts             jsonb not null default '{}'::jsonb,

  updated_at        timestamptz not null default now()
);

comment on table public.site_settings is
  'Linha única com o conteúdo do site que os noivos editam sem mexer no código.';

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

create policy "todos leem as configuracoes do site"
  on public.site_settings for select to anon, authenticated using (true);

create policy "admin edita as configuracoes do site"
  on public.site_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
