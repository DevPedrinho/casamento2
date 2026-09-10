-- =========================================================
--  Código do convite
--
--  Cada convidado ganha um código gerado pelos noivos no painel.
--  Sem ele ninguém cria cadastro no site — assim os noivos sabem
--  exatamente para quem já mandaram convite e todo login nasce
--  ligado à ficha certa da lista, sem depender de acertar o nome.
-- =========================================================

alter table public.guests
  add column if not exists access_code  text,
  add column if not exists code_sent_at timestamptz;

comment on column public.guests.access_code is
  'Código do convite. Gerado no painel e entregue ao convidado.';
comment on column public.guests.code_sent_at is
  'Quando os noivos marcaram que entregaram o código.';

create unique index if not exists guests_access_code_key
  on public.guests (access_code) where access_code is not null;

-- ---------- Sorteio do código ----------
-- Alfabeto sem I, O, 0 e 1: quem digita no celular não erra por
-- causa de caractere parecido. 32 letras em 8 casas dão 1,1 trilhão
-- de combinações, longe do alcance de tentativa e erro.
create or replace function private.sortear_codigo()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codigo   text := '';
begin
  for i in 1..8 loop
    codigo := codigo || substr(
      alfabeto,
      1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32),
      1
    );
  end loop;
  return codigo;
end $$;

revoke all on function private.sortear_codigo() from public, anon, authenticated;

/** Deixa o código como o banco guarda: só letras e números, maiúsculo. */
create or replace function public.normalizar_codigo(p_codigo text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- ---------- Painel: gerar códigos ----------
create or replace function public.admin_gerar_codigo(p_guest uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare novo text;
begin
  if not private.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  loop
    novo := private.sortear_codigo();
    exit when not exists (select 1 from public.guests where access_code = novo);
  end loop;

  -- Código novo é código não entregue: a marcação de envio zera junto.
  update public.guests
     set access_code = novo, code_sent_at = null
   where id = p_guest;

  return novo;
end $$;

revoke all on function public.admin_gerar_codigo(uuid) from public, anon;
grant execute on function public.admin_gerar_codigo(uuid) to authenticated;

/** Gera de uma vez para todo mundo que ainda está sem código. */
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

  for alvo in select id from public.guests where access_code is null loop
    loop
      novo := private.sortear_codigo();
      exit when not exists (select 1 from public.guests where access_code = novo);
    end loop;
    update public.guests set access_code = novo where id = alvo.id;
    feitos := feitos + 1;
  end loop;

  return feitos;
end $$;

revoke all on function public.admin_gerar_codigos_faltantes() from public, anon;
grant execute on function public.admin_gerar_codigos_faltantes() to authenticated;

-- ---------- Site: conferir o código antes de cadastrar ----------
/** Diz se o código serve e de quem é, para o formulário avisar antes
 *  de criar a conta. Não expõe nada além do primeiro nome. */
create or replace function public.conferir_codigo(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare alvo public.guests;
begin
  select * into alvo from public.guests
   where access_code = public.normalizar_codigo(p_codigo);

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'invalido');
  end if;
  if alvo.user_id is not null then
    return jsonb_build_object('ok', false, 'motivo', 'usado');
  end if;

  return jsonb_build_object(
    'ok', true,
    'nome', split_part(trim(alvo.full_name), ' ', 1)
  );
end $$;

revoke all on function public.conferir_codigo(text) from public;
grant execute on function public.conferir_codigo(text) to anon, authenticated;

-- ---------- Quem já tem conta: resgatar o código ----------
/** Liga uma conta existente à ficha do convidado dona do código,
 *  levando junto o que a pessoa já tinha feito no site. */
create or replace function public.resgatar_codigo(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  alvo   public.guests;
  eu     uuid := auth.uid();
  antigo uuid;
begin
  if eu is null then
    raise exception 'PRECISA_ENTRAR';
  end if;

  select * into alvo from public.guests
   where access_code = public.normalizar_codigo(p_codigo);

  if not found then
    raise exception 'CODIGO_INVALIDO';
  end if;
  if alvo.user_id is not null and alvo.user_id <> eu then
    raise exception 'CODIGO_JA_USADO';
  end if;

  select id into antigo from public.guests
   where user_id = eu and id <> alvo.id limit 1;

  if antigo is not null then
    -- Confirmação de presença: a da ficha certa tem prioridade.
    if exists (select 1 from public.rsvps where guest_id = alvo.id) then
      delete from public.rsvps where guest_id = antigo;
    else
      update public.rsvps set guest_id = alvo.id where guest_id = antigo;
    end if;

    -- Onde há unicidade por convidado, move o que não colide e
    -- descarta o repetido.
    update public.post_likes l set guest_id = alvo.id
     where l.guest_id = antigo
       and not exists (select 1 from public.post_likes o
                       where o.post_id = l.post_id and o.guest_id = alvo.id);
    delete from public.post_likes where guest_id = antigo;

    update public.story_views v set guest_id = alvo.id
     where v.guest_id = antigo
       and not exists (select 1 from public.story_views o
                       where o.post_id = v.post_id and o.guest_id = alvo.id);
    delete from public.story_views where guest_id = antigo;

    update public.story_reactions r set guest_id = alvo.id
     where r.guest_id = antigo
       and not exists (select 1 from public.story_reactions o
                       where o.post_id = r.post_id and o.guest_id = alvo.id);
    delete from public.story_reactions where guest_id = antigo;

    update public.posts               set author_id   = alvo.id where author_id   = antigo;
    update public.post_comments       set guest_id    = alvo.id where guest_id    = antigo;
    update public.post_reports        set reporter_id = alvo.id where reporter_id = antigo;
    update public.gift_claims         set guest_id    = alvo.id where guest_id    = antigo;
    update public.kanban_card_comments set author_id  = alvo.id where author_id   = antigo;

    -- A ficha avulsa criada no cadastro antigo não serve mais; o que
    -- ela tinha de contato aproveita na ficha certa.
    update public.guests a
       set email    = coalesce(a.email, b.email),
           phone    = coalesce(a.phone, b.phone),
           is_admin = a.is_admin or b.is_admin
      from public.guests b
     where a.id = alvo.id and b.id = antigo;

    delete from public.guests where id = antigo;
  end if;

  update public.guests set user_id = eu where id = alvo.id;

  return jsonb_build_object('ok', true, 'nome', alvo.full_name);
end $$;

revoke all on function public.resgatar_codigo(text) from public, anon;
grant execute on function public.resgatar_codigo(text) to authenticated;

-- ---------- Cadastro novo só com código ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  nome text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                        split_part(new.email, '@', 1));
  fone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  cod  text := public.normalizar_codigo(new.raw_user_meta_data ->> 'access_code');
  alvo public.guests;
begin
  if cod = '' then
    raise exception 'CODIGO_OBRIGATORIO';
  end if;

  select * into alvo from public.guests where access_code = cod;

  if not found then
    raise exception 'CODIGO_INVALIDO';
  end if;
  if alvo.user_id is not null then
    raise exception 'CODIGO_JA_USADO';
  end if;

  update public.guests
     set user_id   = new.id,
         email     = coalesce(email, new.email),
         phone     = coalesce(phone, fone),
         full_name = case when trim(coalesce(full_name, '')) = '' then nome else full_name end
   where id = alvo.id;

  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
