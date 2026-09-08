-- =========================================================
-- Mural: o "feed" do casamento. Convidados logados publicam
-- fotos e recados; stories somem sozinhos em 24h.
-- =========================================================

create type public.post_kind as enum ('feed', 'story');

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.guests(id) on delete cascade,
  kind          public.post_kind not null default 'feed',
  caption       text check (caption is null or char_length(caption) <= 2000),
  image_path    text,
  -- Moderação: os noivos ocultam sem apagar a foto de quem postou.
  is_hidden     boolean not null default false,
  hidden_reason text,
  -- Stories têm validade; posts do feed ficam para sempre (expires_at nulo).
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint post_tem_conteudo check (
    image_path is not null or (kind = 'feed' and caption is not null)
  ),
  constraint story_tem_validade check (
    (kind = 'story' and expires_at is not null) or (kind = 'feed' and expires_at is null)
  )
);
comment on table public.posts is 'Publicações do mural: fotos e recados dos convidados.';
comment on column public.posts.image_path is 'Caminho do arquivo no bucket "mural" do Storage.';
create index posts_feed_idx  on public.posts (kind, is_hidden, created_at desc);
create index posts_autor_idx on public.posts (author_id, created_at desc);

create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, guest_id)
);

create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

create table public.story_views (
  post_id   uuid not null references public.posts(id) on delete cascade,
  guest_id  uuid not null references public.guests(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, guest_id)
);

create table public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts(id) on delete cascade,
  comment_id  uuid references public.post_comments(id) on delete cascade,
  reporter_id uuid not null references public.guests(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint denuncia_tem_alvo check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  )
);

-- =========================================================
-- RLS: o mural é privado, só para convidados logados.
-- =========================================================
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;
alter table public.story_views   enable row level security;
alter table public.post_reports  enable row level security;

-- Convidado logado vê o que está publicado (não oculto e, se story, ainda no
-- prazo) mais o que ele mesmo postou. Os noivos veem tudo.
create policy "convidado le o mural"
  on public.posts for select to authenticated
  using (
    private.is_admin()
    or author_id = auth.uid()
    or (not is_hidden and (expires_at is null or expires_at > now()))
  );

create policy "convidado publica em nome proprio"
  on public.posts for insert to authenticated
  with check (author_id = auth.uid() and not is_hidden);

-- O autor edita a legenda, mas não consegue se "desocultar".
create policy "autor edita a propria publicacao"
  on public.posts for update to authenticated
  using (author_id = auth.uid() and not is_hidden)
  with check (author_id = auth.uid() and not is_hidden);

create policy "autor apaga a propria publicacao"
  on public.posts for delete to authenticated
  using (author_id = auth.uid());

create policy "admin modera o mural"
  on public.posts for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "convidado le curtidas"
  on public.post_likes for select to authenticated using (true);
create policy "convidado curte em nome proprio"
  on public.post_likes for insert to authenticated with check (guest_id = auth.uid());
create policy "convidado descurte o proprio"
  on public.post_likes for delete to authenticated
  using (guest_id = auth.uid() or private.is_admin());

create policy "convidado le comentarios"
  on public.post_comments for select to authenticated
  using (not is_hidden or guest_id = auth.uid() or private.is_admin());
create policy "convidado comenta em nome proprio"
  on public.post_comments for insert to authenticated
  with check (guest_id = auth.uid() and not is_hidden);
create policy "convidado apaga o proprio comentario"
  on public.post_comments for delete to authenticated
  using (guest_id = auth.uid() or private.is_admin());
create policy "admin modera comentarios"
  on public.post_comments for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "convidado registra que viu"
  on public.story_views for insert to authenticated with check (guest_id = auth.uid());
-- Só o autor do story (e os noivos) veem a audiência inteira.
create policy "autor ve quem viu o story"
  on public.story_views for select to authenticated
  using (
    private.is_admin()
    or guest_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

create policy "convidado denuncia"
  on public.post_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admin le denuncias"
  on public.post_reports for select to authenticated
  using (private.is_admin() or reporter_id = auth.uid());
create policy "admin resolve denuncias"
  on public.post_reports for delete to authenticated using (private.is_admin());

-- =========================================================
-- Storage: bucket privado. As fotos só saem por URL assinada,
-- gerada no servidor para quem está logado.
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mural', 'mural', false, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada convidado só escreve dentro da própria pasta (o id dele).
create policy "convidado envia para a propria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mural'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "convidado le as fotos do mural"
  on storage.objects for select to authenticated
  using (bucket_id = 'mural');

create policy "convidado apaga as proprias fotos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'mural'
    and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin())
  );
