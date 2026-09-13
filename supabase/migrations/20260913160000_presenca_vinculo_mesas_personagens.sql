-- ============================================================================
-- O convite perde o tamanho; a presença ganha a pessoa.
--
-- Três mudanças de fundo, feitas numa migração só porque mexem nas mesmas
-- linhas:
--
--   1. Sai a trava de lugares por convite. Ela nunca chegou a valer — nenhum
--      dos 97 convidados tinha limite preenchido — e tratava como regra de
--      sistema algo que sempre se resolveu na conversa. O grupo familiar
--      fica, mas vira etiqueta interna: é o que vai montar as mesas.
--
--   2. "Vem para a cerimônia, para a recepção ou para as duas" passa a ser
--      pergunta por pessoa, não por convite. A cerimônia é na capela e a
--      festa é no buffet: é comum a criança ir só a uma das duas.
--
--   3. O vínculo com os noivos ganha uma lista fechada ao lado do texto
--      livre. O texto continua contando a história ("Companheira do Ramon");
--      a lista é o que um gráfico consegue ler.
-- ============================================================================


-- ---------------------------------------------------------------- 1. limite

drop trigger if exists rsvp_companions_limite on public.rsvp_companions;
drop function if exists private.checar_tamanho_do_convite();
drop function if exists public.limite_do_convite(uuid);
drop function if exists private.irmaos_de_convite(uuid);

alter table public.guests        drop column if exists invite_limit;
alter table public.guest_groups  drop column if exists invite_limit;
alter table public.site_settings drop column if exists default_invite_limit;


-- -------------------------------------------------------------- 2. presença

create type public.presenca as enum ('cerimonia', 'recepcao', 'ambos');

-- Os 19 registros que vieram da planilha diziam "Cerimônia e Recepção" em
-- texto livre. Entram no formato novo sem ninguém precisar responder de novo.
alter table public.guests
  alter column attends type public.presenca
  using (
    case
      when attends is null or btrim(attends) = ''                       then null
      when attends ilike '%cerim%' and attends ilike '%recep%'          then 'ambos'
      when attends ilike '%cerim%'                                      then 'cerimonia'
      when attends ilike '%recep%' or attends ilike '%fest%'            then 'recepcao'
      else 'ambos'
    end
  )::public.presenca;

alter table public.rsvp_companions add column attends public.presenca;


-- --------------------------------------------------------------- 3. vínculo

create type public.vinculo as enum (
  'familia_noiva',
  'familia_noivo',
  'amigos',
  'trabalho',
  'padrinhos',
  'crianca',
  'outro'
);

alter table public.guests           add column relationship_kind public.vinculo;
alter table public.rsvp_companions  add column relationship_kind public.vinculo;

-- Do acompanhante a gente também quer saber o vínculo com quem o trouxe:
-- "esposa do Flávio" diz mais sobre a mesa do que "amigos".
alter table public.rsvp_companions  add column relationship text;

alter table public.rsvp_companions
  add column gender text
  check (gender is null or gender in ('masculino', 'feminino', 'outro'));

-- Primeiro palpite a partir do que já está preenchido. Não é adivinhação
-- solta: é a mesma leitura que os noivos fariam olhando a ficha. O painel
-- corrige o que sair torto.
update public.guests set relationship_kind =
  case
    when ceremony_role ilike 'madrinha%' or ceremony_role ilike 'padrinho%' then 'padrinhos'
    when age_range = 'Criança'                                             then 'crianca'
    when relationship ilike 'amig%'                                        then 'amigos'
    when side = 'noiva'                                                    then 'familia_noiva'
    when side = 'noivo'                                                    then 'familia_noivo'
    else null
  end::public.vinculo;


-- ----------------------------------------------------------------- 4. mesas

create table public.wedding_tables (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  seats       smallint not null default 8 check (seats between 1 and 30),
  notes       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger wedding_tables_touch
  before update on public.wedding_tables
  for each row execute function public.touch_updated_at();

-- O campo antigo era texto solto e estava vazio nos 97. Some, para não
-- existirem duas respostas para "qual é a mesa dele".
alter table public.guests drop column if exists table_number;

alter table public.guests
  add column table_id uuid references public.wedding_tables(id) on delete set null;

create index guests_table_id_idx on public.guests (table_id);

alter table public.wedding_tables enable row level security;

create policy "noivos cuidam das mesas"
  on public.wedding_tables for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- O convidado enxerga uma mesa só: a dele. Sem essa função, a política teria
-- de ler public.guests e esbarraria na política de lá.
create or replace function private.minha_mesa()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select table_id from public.guests where id = private.meu_guest_id();
$$;

create policy "convidado vê a própria mesa"
  on public.wedding_tables for select to authenticated
  using (id = private.minha_mesa());


-- --------------------------------------------------- 5. personagens principais

alter table public.guests
  add column is_featured    boolean not null default false,
  add column featured_order smallint;

-- As 18 pessoas que já tinham papel na cerimônia entram marcadas: madrinhas,
-- padrinhos, pais dos dois lados, daminha e florista.
update public.guests
   set is_featured = true
 where ceremony_role is not null and btrim(ceremony_role) <> '';

create index guests_is_featured_idx on public.guests (is_featured) where is_featured;
