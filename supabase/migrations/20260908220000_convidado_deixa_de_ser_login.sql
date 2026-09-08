-- =========================================================
-- guests deixa de ser "quem tem login" e passa a ser
-- "quem foi convidado". O login vira um vínculo opcional.
--
-- Sem isso, os 93 convidados da planilha (que nunca vão criar
-- conta) não caberiam na mesma tabela que o CRM, o RSVP e as
-- mesas precisam usar.
-- =========================================================

create table if not exists public.guest_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  side       text check (side in ('noivo', 'noiva', 'ambos')),
  notes      text,
  created_at timestamptz not null default now()
);

create type public.invite_status as enum (
  'nao_contatado', 'convite_enviado', 'visualizou',
  'aguardando', 'confirmado', 'nao_vai', 'follow_up'
);

alter table public.guests
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;
update public.guests set user_id = id where user_id is null;

-- O id deixa de ser o id do auth: passa a ser gerado pela própria tabela.
alter table public.guests drop constraint if exists guests_id_fkey;
alter table public.guests alter column id set default gen_random_uuid();

alter table public.guests
  add column if not exists group_id       uuid references public.guest_groups(id) on delete set null,
  add column if not exists side           text check (side is null or side in ('noivo','noiva')),
  add column if not exists relationship   text,
  add column if not exists ceremony_role  text,
  add column if not exists attends        text,
  add column if not exists gender         text check (gender is null or gender in ('masculino','feminino','outro')),
  add column if not exists age            smallint check (age is null or age between 0 and 130),
  add column if not exists age_range      text,
  add column if not exists favor_type     text,
  add column if not exists email          text,
  add column if not exists whatsapp       text,
  add column if not exists invite_status  public.invite_status not null default 'nao_contatado',
  add column if not exists confirmed_at   timestamptz,
  add column if not exists companions_planned smallint not null default 0
    check (companions_planned >= 0 and companions_planned <= 20),
  add column if not exists table_number   text,
  add column if not exists dietary_notes  text,
  add column if not exists notes          text,
  add column if not exists last_contact_at date,
  add column if not exists next_action    text,
  add column if not exists next_action_at date,
  -- Guarda colunas da planilha que não tenham campo próprio, sem perder dado.
  add column if not exists extra          jsonb not null default '{}'::jsonb,
  add column if not exists import_key     text;

create index if not exists guests_grupo_idx  on public.guests (group_id, full_name);
create index if not exists guests_status_idx on public.guests (invite_status);
alter table public.guests add constraint guests_import_key_key unique (import_key);

-- Normalização usada na deduplicação e no vínculo do cadastro.
create or replace function public.unaccent_simples(texto text)
returns text language sql immutable set search_path = '' as $$
  select translate(coalesce(texto, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN');
$$;

create or replace function public.chave_convidado(nome text)
returns text language sql immutable set search_path = '' as $$
  select nullif(lower(trim(regexp_replace(public.unaccent_simples(nome), '\s+', ' ', 'g'))), '');
$$;

revoke all on function public.unaccent_simples(text) from public, anon, authenticated;
revoke all on function public.chave_convidado(text) from public, anon, authenticated;
update public.guests set import_key = public.chave_convidado(full_name) where import_key is null;

-- ---------- O convidado da sessão atual ----------
create or replace function private.meu_guest_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select g.id from public.guests g where g.user_id = auth.uid();
$$;
revoke all on function private.meu_guest_id() from public;
grant execute on function private.meu_guest_id() to anon, authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select g.is_admin from public.guests g where g.user_id = auth.uid()), false);
$$;

-- ---------- Cadastro liga a uma linha existente, ou cria ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nome  text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  fone  text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  chave text := public.chave_convidado(nome);
  alvo  uuid;
begin
  select g.id into alvo from public.guests g
  where g.user_id is null and (g.import_key = chave or lower(g.email) = lower(new.email))
  limit 1;

  if alvo is not null then
    update public.guests
       set user_id = new.id, email = coalesce(email, new.email), phone = coalesce(phone, fone)
     where id = alvo;
  else
    insert into public.guests (user_id, full_name, phone, email, import_key)
    values (new.id, nome, fone, new.email, chave)
    on conflict (import_key) do update
      set user_id = excluded.user_id, email = coalesce(public.guests.email, excluded.email);
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
