-- O acompanhante que o convidado cadastra na confirmação vira um cadastro
-- de convidado: conta na lista, entra na família do titular (criada na hora
-- se não existir), senta junto no mapa de mesas e — com 10 anos ou mais —
-- recebe um código para entrar no site. Até 3 anos é só cadastro: fica fora
-- do total e do buffet (regra aplicada nas telas, pela idade).

alter table public.guests
  add column if not exists invited_by uuid references public.guests(id) on delete set null;
comment on column public.guests.invited_by is 'Quem trouxe: o titular do convite, quando este cadastro nasceu de um acompanhante.';
create index if not exists guests_invited_by_idx on public.guests (invited_by);

alter table public.rsvp_companions
  add column if not exists guest_row_id uuid references public.guests(id) on delete set null;
comment on column public.rsvp_companions.guest_row_id is 'O cadastro de convidado gerado para este acompanhante.';
create index if not exists rsvp_companions_guest_row_idx on public.rsvp_companions (guest_row_id);

/** Cria (ou liga) o cadastro de convidado de um acompanhante recém-cadastrado. */
create or replace function private.criar_convidado_do_acompanhante(p_companion uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a        public.rsvp_companions%rowtype;
  titular  public.guests%rowtype;
  v_grupo  uuid;
  v_guest  uuid;
  v_chave  text;
  v_codigo text;
begin
  select * into a from public.rsvp_companions where id = p_companion;
  if not found or a.guest_row_id is not null then
    return a.guest_row_id;
  end if;

  select * into titular from public.guests where id = a.guest_id;
  if not found then
    return null;
  end if;

  -- A família: a do titular, ou uma nova com o nome dele.
  v_grupo := titular.group_id;
  if v_grupo is null then
    insert into public.guest_groups (name, side)
    values (split_part(trim(titular.full_name), ' ', 1) || ' e família', titular.side)
    on conflict (name) do update set name = excluded.name
    returning id into v_grupo;
    update public.guests set group_id = v_grupo where id = titular.id;
  end if;

  -- Se já existe alguém com esse nome na lista, só liga; senão, cria.
  v_chave := public.chave_convidado(a.full_name);
  select id into v_guest from public.guests where import_key = v_chave and id <> titular.id limit 1;

  if v_guest is not null then
    update public.guests
       set invited_by   = titular.id,
           group_id     = coalesce(group_id, v_grupo),
           attends      = coalesce(attends, a.attends),
           age          = coalesce(age, a.age),
           gender       = coalesce(gender, a.gender),
           relationship = coalesce(relationship, a.relationship)
     where id = v_guest;
  else
    -- Código só para quem pode entrar no site: 10 anos ou mais (ou idade desconhecida).
    if a.age is null or a.age >= 10 then
      loop
        v_codigo := private.sortear_codigo();
        exit when not exists (select 1 from public.guests where access_code = v_codigo);
      end loop;
    end if;

    insert into public.guests (
      full_name, import_key, age, gender, relationship, relationship_kind, attends,
      side, group_id, invite_status, confirmed_at, invited_by, access_code
    ) values (
      a.full_name, v_chave, a.age, a.gender, a.relationship,
      coalesce(a.relationship_kind, titular.relationship_kind), a.attends,
      titular.side, v_grupo, 'confirmado', now(), titular.id, v_codigo
    )
    returning id into v_guest;
  end if;

  update public.rsvp_companions set guest_row_id = v_guest where id = p_companion;
  return v_guest;
end;
$$;

/** Mantém o cadastro do acompanhante espelhando o que o titular escreveu. */
create or replace function private.espelhar_acompanhante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.criar_convidado_do_acompanhante(new.id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- O update que só grava guest_row_id vem de dentro; nada a espelhar.
    if new.guest_row_id is distinct from old.guest_row_id then
      return new;
    end if;
    if new.guest_row_id is not null then
      -- Depois que a pessoa entrou no site, os dados são dela.
      update public.guests
         set full_name         = new.full_name,
             age               = new.age,
             gender            = new.gender,
             relationship      = new.relationship,
             relationship_kind = coalesce(new.relationship_kind, relationship_kind),
             attends           = new.attends
       where id = new.guest_row_id and user_id is null;
    end if;
    return new;
  end if;

  -- DELETE
  if old.guest_row_id is not null then
    if exists (select 1 from public.guests where id = old.guest_row_id and user_id is null) then
      delete from public.guests where id = old.guest_row_id;
    else
      update public.guests set invited_by = null where id = old.guest_row_id;
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists rsvp_companions_espelho on public.rsvp_companions;
create trigger rsvp_companions_espelho
  after insert or update or delete on public.rsvp_companions
  for each row execute function private.espelhar_acompanhante();

-- Criança com menos de 10 anos não recebe código: cadastro sem acesso.
create or replace function public.admin_gerar_codigos_faltantes()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  alvo  record;
  novo  text;
  feitos integer := 0;
begin
  if not private.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  for alvo in select id from public.guests where access_code is null and (age is null or age >= 10) loop
    loop
      novo := private.sortear_codigo();
      exit when not exists (select 1 from public.guests where access_code = novo);
    end loop;
    update public.guests set access_code = novo where id = alvo.id;
    feitos := feitos + 1;
  end loop;

  return feitos;
end $$;

-- Quem já tinha acompanhante cadastrado ganha os cadastros agora.
do $$
declare c record;
begin
  for c in select id from public.rsvp_companions where guest_row_id is null order by created_at loop
    perform private.criar_convidado_do_acompanhante(c.id);
  end loop;
end $$;
