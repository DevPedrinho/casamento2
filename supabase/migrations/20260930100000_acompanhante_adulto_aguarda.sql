-- Acompanhante de 18 anos ou mais não nasce "confirmado".
--
-- Quando o titular cadastra um acompanhante na confirmação, a ficha dele
-- passa a nascer assim:
--   * menor de 18 anos  -> "confirmado" (o titular responde por ele);
--   * 18 anos ou mais   -> "aguardando" (ele confirma por conta própria, no
--                          RSVP que os noivos vão enviar com o código dele).
-- Sem idade informada (só dado antigo; o formulário agora exige a idade),
-- vale o lado seguro: aguardando.
--
-- Só a ficha NOVA muda. Quem já está cadastrado como confirmado fica como
-- está; nada aqui atualiza linhas existentes. Ao responder pelo próprio RSVP,
-- o gatilho sincroniza_status_do_convite já passa a ficha para "confirmado".

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
      titular.side, v_grupo,
      -- Adulto responde por si (o RSVP dele chega depois); menor de 18 já
      -- entra confirmado, quem responde por ele é o titular. Sem idade
      -- (dado antigo — o formulário passa a exigir), o lado seguro: aguardando.
      case when a.age is not null and a.age < 18
           then 'confirmado'::public.invite_status
           else 'aguardando'::public.invite_status end,
      case when a.age is not null and a.age < 18 then now() end,
      titular.id, v_codigo
    )
    returning id into v_guest;
  end if;

  update public.rsvp_companions set guest_row_id = v_guest where id = p_companion;
  return v_guest;
end;
$$;
