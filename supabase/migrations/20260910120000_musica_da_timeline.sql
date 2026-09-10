-- =========================================================
--  Música da timeline
--  Uma linha só, com o arquivo que os noivos enviam pelo
--  painel. Fica fora de wedding_settings de propósito: essa
--  tabela guarda o orçamento, que ninguém de fora pode ver,
--  e a música precisa ser lida por qualquer visitante.
-- =========================================================

create table if not exists public.site_music (
  id         boolean primary key default true check (id),
  file_path  text,
  title      text,
  artist     text,
  updated_at timestamptz not null default now()
);

comment on table public.site_music is
  'Linha única com a música que toca na página Nossa História.';
comment on column public.site_music.file_path is
  'Caminho do arquivo no bucket público "site". Vazio = o player não aparece.';

insert into public.site_music (id, title, artist)
values (true, 'A Thousand Years', 'Christina Perri')
on conflict (id) do nothing;

create trigger site_music_touch before update on public.site_music
  for each row execute function public.touch_updated_at();

alter table public.site_music enable row level security;

-- A música é parte do site: qualquer visitante precisa poder ouvir.
create policy "todos ouvem a musica do site"
  on public.site_music for select to anon, authenticated using (true);

create policy "admin cuida da musica do site"
  on public.site_music for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- O bucket do site passa a aceitar áudio, e com folga de tamanho:
-- uma música de quatro minutos em MP3 passa fácil dos 5 MB antigos.
update storage.buckets
   set file_size_limit = 12 * 1024 * 1024,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp',
         'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav'
       ]
 where id = 'site';
