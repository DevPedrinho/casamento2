-- =========================================================
--  Movimento dos convidados
--
--  O que cada convidado fez no site, para os noivos acompanharem:
--  abriu o link do convite, tocou para abrir, criou o cadastro, entrou
--  no site, respondeu a confirmação, publicou no mural, presenteou.
--  E quem está online agora (last_seen_at, renovado a cada minuto
--  enquanto a pessoa está com o site aberto).
--
--  Só os noivos leem. Ninguém grava direto na tabela: os eventos
--  entram por funções e gatilhos, e o que os noivos fazem no site
--  (inclusive abrir o convite de alguém para conferir) não conta.
-- =========================================================

create table if not exists public.guest_events (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.guests(id) on delete cascade,
  kind       text not null check (kind in (
    'abriu_link', 'abriu_convite', 'cadastro', 'entrou',
    'confirmou', 'recusou', 'mudou_resposta',
    'publicou', 'comentou', 'presenteou'
  )),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.guest_events is
  'Linha do tempo do que cada convidado fez no site. Só os noivos leem.';

create index if not exists guest_events_recentes_idx on public.guest_events (created_at desc);
create index if not exists guest_events_convidado_idx on public.guest_events (guest_id, created_at desc);

alter table public.guest_events enable row level security;

create policy "noivos leem o movimento"
  on public.guest_events for select to authenticated
  using (private.is_admin());

-- Online agora: renovado pelo site enquanto a pessoa navega.
alter table public.guests add column if not exists last_seen_at timestamptz;
alter table public.guests add column if not exists last_seen_path text;

comment on column public.guests.last_seen_at is 'Última vez que o convidado estava com o site aberto.';
comment on column public.guests.last_seen_path is 'Página em que o convidado estava na última vez.';

-- ---------- Registro interno ----------
/** Grava um evento. Com p_intervalo, não repete o mesmo evento da mesma
 *  pessoa dentro dessa janela (abrir o link dez vezes seguidas conta uma). */
create or replace function private.registrar_evento(
  p_guest uuid, p_kind text, p_meta jsonb default '{}'::jsonb, p_intervalo interval default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_guest is null then
    return;
  end if;
  -- Os noivos não aparecem no próprio painel.
  if exists (select 1 from public.guests where id = p_guest and is_admin) then
    return;
  end if;
  if p_intervalo is not null and exists (
    select 1 from public.guest_events
     where guest_id = p_guest and kind = p_kind and created_at > now() - p_intervalo
  ) then
    return;
  end if;
  insert into public.guest_events (guest_id, kind, meta) values (p_guest, p_kind, coalesce(p_meta, '{}'::jsonb));
end $$;

revoke all on function private.registrar_evento(uuid, text, jsonb, interval) from public;

-- ---------- Site: o convite foi aberto ----------
/** Chamado pela página do convite. Com código, é o dono do código; sem
 *  código, quem está logado. Abrir o convite de alguém sendo noivo não conta. */
create or replace function public.registrar_convite(p_codigo text, p_evento text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_guest uuid;
begin
  if p_evento not in ('abriu_link', 'abriu_convite') then
    return;
  end if;
  if private.is_admin() then
    return;
  end if;

  if p_codigo is not null and p_codigo <> '' then
    select id into v_guest from public.guests where access_code = public.normalizar_codigo(p_codigo);
  elsif auth.uid() is not null then
    select id into v_guest from public.guests where user_id = auth.uid();
  end if;

  perform private.registrar_evento(
    v_guest, p_evento,
    jsonb_build_object('por', case when p_codigo is not null and p_codigo <> '' then 'link' else 'site' end),
    interval '30 minutes'
  );
end $$;

revoke all on function public.registrar_convite(text, text) from public;
grant execute on function public.registrar_convite(text, text) to anon, authenticated;

-- ---------- Site: a pessoa está com o site aberto ----------
/** Renova o "online agora" e, quando a pessoa volta depois de 30 minutos
 *  longe, registra uma nova entrada no site. */
create or replace function public.registrar_visita(p_pagina text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  eu public.guests%rowtype;
  pagina text := left(coalesce(p_pagina, ''), 120);
begin
  if auth.uid() is null then
    return;
  end if;
  select * into eu from public.guests where user_id = auth.uid();
  if not found or eu.is_admin then
    return;
  end if;

  if eu.last_seen_at is null or eu.last_seen_at < now() - interval '30 minutes' then
    perform private.registrar_evento(eu.id, 'entrou', jsonb_build_object('pagina', pagina));
  end if;

  update public.guests
     set last_seen_at = now(), last_seen_path = pagina
   where id = eu.id;
end $$;

revoke all on function public.registrar_visita(text) from public;
grant execute on function public.registrar_visita(text) to authenticated;

-- ---------- Gatilhos: o que acontece no banco vira evento ----------

/** Cadastro: a ficha ganhou uma conta (cadastro com código ou resgate). */
create or replace function private.evento_cadastro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is null and new.user_id is not null then
    perform private.registrar_evento(new.id, 'cadastro');
  end if;
  return new;
end $$;

drop trigger if exists guests_evento_cadastro on public.guests;
create trigger guests_evento_cadastro
  after update of user_id on public.guests
  for each row execute function private.evento_cadastro();

/** Confirmação: primeira resposta, ou troca de resposta. */
create or replace function private.evento_rsvp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.registrar_evento(
      new.guest_id,
      case new.status when 'confirmado' then 'confirmou' when 'nao_vou' then 'recusou' else 'mudou_resposta' end,
      jsonb_build_object('acompanhantes', new.companions)
    );
  elsif new.status is distinct from old.status then
    perform private.registrar_evento(
      new.guest_id,
      case new.status when 'confirmado' then 'confirmou' when 'nao_vou' then 'recusou' else 'mudou_resposta' end,
      jsonb_build_object('acompanhantes', new.companions, 'antes', old.status)
    );
  elsif new.companions is distinct from old.companions then
    perform private.registrar_evento(
      new.guest_id, 'mudou_resposta',
      jsonb_build_object('acompanhantes', new.companions, 'antes_acompanhantes', old.companions)
    );
  end if;
  return new;
end $$;

drop trigger if exists rsvps_evento on public.rsvps;
create trigger rsvps_evento
  after insert or update on public.rsvps
  for each row execute function private.evento_rsvp();

/** Mural: publicação (foto ou story) e comentário. */
create or replace function private.evento_mural()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'posts' then
    perform private.registrar_evento(new.author_id, 'publicou', jsonb_build_object('tipo', new.kind));
  else
    perform private.registrar_evento(new.guest_id, 'comentou');
  end if;
  return new;
end $$;

drop trigger if exists posts_evento on public.posts;
create trigger posts_evento
  after insert on public.posts
  for each row execute function private.evento_mural();

drop trigger if exists post_comments_evento on public.post_comments;
create trigger post_comments_evento
  after insert on public.post_comments
  for each row execute function private.evento_mural();

/** Presente: clicou em Presentear. */
create or replace function private.evento_presente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_titulo text;
begin
  select title into v_titulo from public.gifts where id = new.gift_id;
  perform private.registrar_evento(new.guest_id, 'presenteou', jsonb_build_object('presente', v_titulo));
  return new;
end $$;

drop trigger if exists gift_claims_evento on public.gift_claims;
create trigger gift_claims_evento
  after insert on public.gift_claims
  for each row execute function private.evento_presente();

-- ---------- O que já tinha acontecido ----------
-- Recupera o histórico que o banco já guardava, para o painel não nascer
-- vazio. Marcado com "historico" (a hora pode ser aproximada).

insert into public.guest_events (guest_id, kind, meta, created_at)
select g.id, 'cadastro', '{"historico": true}'::jsonb, u.created_at
  from public.guests g
  join auth.users u on u.id = g.user_id
 where not g.is_admin;

insert into public.guest_events (guest_id, kind, meta, created_at)
select r.guest_id,
       case r.status when 'confirmado' then 'confirmou' when 'nao_vou' then 'recusou' else 'mudou_resposta' end,
       jsonb_build_object('historico', true, 'acompanhantes', r.companions),
       r.updated_at
  from public.rsvps r
  join public.guests g on g.id = r.guest_id
 where not g.is_admin;

insert into public.guest_events (guest_id, kind, meta, created_at)
select p.author_id, 'publicou', jsonb_build_object('historico', true, 'tipo', p.kind), p.created_at
  from public.posts p
  join public.guests g on g.id = p.author_id
 where not g.is_admin;

insert into public.guest_events (guest_id, kind, meta, created_at)
select c.guest_id, 'presenteou', jsonb_build_object('historico', true, 'presente', gi.title), c.created_at
  from public.gift_claims c
  join public.guests g on g.id = c.guest_id
  left join public.gifts gi on gi.id = c.gift_id
 where not g.is_admin;
