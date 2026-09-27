-- =========================================================
--  Convite digital
--
--  Uma página separada da Home (/convite e /convite/CODIGO)
--  que abre como um convite de verdade: capa, toque para
--  abrir, música, e as seções na ordem que os noivos quiserem.
--
--  Tudo o que é texto do convite mora aqui. O que já tem casa
--  própria continua lá e o convite só LÊ: nomes, data, traje e
--  monograma em site_settings; cerimônia e recepção em
--  event_venues; a música de Nossa História em site_music.
-- =========================================================

-- ---------- Configurações do convite (linha única) ----------
create table if not exists public.invitation_settings (
  id                  boolean primary key default true check (id),

  -- Música
  music_enabled       boolean not null default true,
  music_use_story     boolean not null default true,
  music_file_path     text,
  music_title         text,
  music_volume        numeric(3, 2) not null default 0.5 check (music_volume between 0 and 1),
  music_loop          boolean not null default true,

  -- Imagens trocáveis (vazio = o desenho da igreja que vem no projeto)
  cover_image_path    text,
  ceremony_image_path text,
  closing_image_path  text,

  verse_visible       boolean not null default false,

  -- Frases do convite, por chave (ver src/lib/conviteDigital.ts)
  texts               jsonb not null default '{}'::jsonb,
  -- Ordem e visibilidade das seções: [{"id": "...", "visivel": true}, ...]
  sections            jsonb not null default '[]'::jsonb,

  updated_at          timestamptz not null default now()
);

comment on table public.invitation_settings is
  'Linha única com textos, ordem das seções, imagens e música do convite digital.';

insert into public.invitation_settings (id, texts, sections)
values (
  true,
  jsonb_build_object(
    'capa_frase',           'Preparamos este convite especialmente para você.',
    'capa_botao',           'Toque para abrir',
    'apresentacao_texto',   E'Com a bênção de Deus e de nossas famílias,\nconvidamos você para celebrar conosco o início de uma nova etapa da nossa história.',
    'versiculo_texto',      '',
    'versiculo_referencia', '',
    'mensagem_titulo',      'Para você',
    'mensagem_texto',       'Cada pessoa que convidamos faz parte da nossa história de algum jeito. Ter você com a gente vai deixar esse dia ainda mais bonito.',
    'grande_dia_titulo',    'O Grande Dia',
    'contagem_titulo',      'Falta pouco para o nosso grande dia',
    'traje_titulo',         'Traje',
    'traje_1',              '',
    'traje_2',              'Pedimos apenas que o branco e seus tons muito claros sejam reservados à noiva. 🤍',
    'traje_3',              'Venha confortável — a festa é longa!',
    'manual_titulo',        'Manual do Convidado',
    'manual_intro',         'Alguns detalhes para que você aproveite cada momento desse dia com a gente.',
    'confirmacao_titulo',   'Confirme sua presença',
    'confirmacao_texto',    'Sua resposta nos ajuda a preparar cada detalhe com carinho.',
    'confirmacao_botao',    'Confirmar presença',
    'explorar_titulo',      'Continue com a gente',
    'explorar_texto',       'No site você encontra a nossa história, a lista de presentes e o mural para compartilhar fotos.',
    'final_texto',          'Mal podemos esperar para viver esse dia ao seu lado.',
    'final_assinatura',     'Com carinho,'
  ),
  '[
    {"id": "apresentacao", "visivel": true},
    {"id": "mensagem",     "visivel": true},
    {"id": "grande_dia",   "visivel": true},
    {"id": "contagem",     "visivel": true},
    {"id": "traje",        "visivel": true},
    {"id": "manual",       "visivel": true},
    {"id": "confirmacao",  "visivel": true},
    {"id": "explorar",     "visivel": true},
    {"id": "final",        "visivel": true}
  ]'::jsonb
)
on conflict (id) do nothing;

create trigger invitation_settings_touch before update on public.invitation_settings
  for each row execute function public.touch_updated_at();

alter table public.invitation_settings enable row level security;

-- O convite é aberto: qualquer pessoa com o link precisa conseguir ler.
create policy "todos leem o convite"
  on public.invitation_settings for select to anon, authenticated using (true);

create policy "admin cuida do convite"
  on public.invitation_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------- Manual do Convidado ----------
create table if not exists public.invitation_guide_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  icon       text not null default 'coracao',
  sort_order integer not null default 0,
  visible    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.invitation_guide_items is
  'Orientações do Manual do Convidado, na ordem e com a visibilidade que os noivos escolhem.';

create index if not exists invitation_guide_items_ordem_idx
  on public.invitation_guide_items (sort_order);

create trigger invitation_guide_items_touch before update on public.invitation_guide_items
  for each row execute function public.touch_updated_at();

alter table public.invitation_guide_items enable row level security;

create policy "todos leem o manual visivel"
  on public.invitation_guide_items for select to anon, authenticated
  using (visible or private.is_admin());

create policy "admin cuida do manual"
  on public.invitation_guide_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

insert into public.invitation_guide_items (title, body, icon, sort_order)
select * from (values
  ('Traje',
   'Esporte fino. Pedimos apenas que o branco e seus tons muito claros sejam reservados à noiva. 🤍',
   'traje', 10),
  ('Chegue com antecedência',
   'Queremos muito que você acompanhe esse momento desde o começo. Programe-se para chegar alguns minutos antes da cerimônia.',
   'relogio', 20),
  ('Registre esse momento',
   'Fotografe, sorria e guarde suas lembranças. No dia do casamento você também poderá compartilhar suas fotos em nosso álbum colaborativo.',
   'camera', 30)
) as v(title, body, icon, sort_order)
where not exists (select 1 from public.invitation_guide_items);

-- ---------- Nome no convite ----------
-- "Família Souza", "Maria e João". Vazio = o nome da ficha.
alter table public.guests add column if not exists invite_name text;

comment on column public.guests.invite_name is
  'Como o convite digital chama esta pessoa ou família. Vazio = full_name.';

-- O nome no convite é dos noivos: entra na trava dos campos que o
-- convidado não mexe. Mesma função da migração anterior, mais a coluna.
create or replace function private.travar_campos_dos_noivos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() then
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if old.user_id is null or old.user_id is distinct from auth.uid() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id            is distinct from old.user_id
     or new.is_admin           is distinct from old.is_admin
     or new.group_id           is distinct from old.group_id
     or new.side               is distinct from old.side
     or new.ceremony_role      is distinct from old.ceremony_role
     or new.is_featured        is distinct from old.is_featured
     or new.featured_order     is distinct from old.featured_order
     or new.table_id           is distinct from old.table_id
     or new.invite_status      is distinct from old.invite_status
     or new.companions_planned is distinct from old.companions_planned
     or new.access_code        is distinct from old.access_code
     or new.code_sent_at       is distinct from old.code_sent_at
     or new.import_key         is distinct from old.import_key
     or new.favor_type         is distinct from old.favor_type
     or new.notes              is distinct from old.notes
     or new.last_contact_at    is distinct from old.last_contact_at
     or new.next_action        is distinct from old.next_action
     or new.next_action_at     is distinct from old.next_action_at
     or new.invite_name        is distinct from old.invite_name
  then
    raise exception 'CAMPO_DOS_NOIVOS';
  end if;

  return new;
end;
$$;

-- ---------- Quem é o dono do link ----------
/** O convite individual (/convite/CODIGO) mostra o nome de quem recebeu.
 *  Como conferir_codigo: devolve só o nome e se já existe cadastro —
 *  o bastante para a capa e para o botão de confirmar levar ao lugar certo. */
create or replace function public.convite_por_codigo(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare alvo public.guests;
begin
  select * into alvo from public.guests
   where access_code = public.normalizar_codigo(p_codigo);

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'nome', coalesce(nullif(trim(alvo.invite_name), ''), trim(alvo.full_name)),
    'conta', alvo.user_id is not null
  );
end $$;

revoke all on function public.convite_por_codigo(text) from public;
grant execute on function public.convite_por_codigo(text) to anon, authenticated;
