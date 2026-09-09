-- Fases 6 a 10: Kanban, subtarefas, timeline, reações, arquivos
-- e o bucket público do site.

create type public.prioridade as enum ('baixa', 'media', 'alta');

alter table public.tasks
  add column if not exists priority  public.prioridade not null default 'media',
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

create table public.task_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 300),
  done       boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index task_items_task_idx on public.task_items (task_id, sort_order);

create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null, sort_order smallint not null default 0,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  title text not null, description text, category text not null default 'Outros',
  owner text, vendor_id uuid references public.vendors(id) on delete set null,
  priority public.prioridade not null default 'media',
  due_date date, sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kanban_cards_col_idx on public.kanban_cards (column_id, sort_order);

create table public.kanban_card_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  title text not null, done boolean not null default false,
  sort_order integer not null default 0
);

create table public.kanban_card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  author_id uuid references public.guests(id) on delete set null,
  body text not null, created_at timestamptz not null default now()
);

create trigger kanban_cards_touch before update on public.kanban_cards
  for each row execute function public.touch_updated_at();

-- ---------- Financeiro ----------
create type public.expense_status as enum ('previsto','a_pagar','pago','atrasado','cancelado');
alter table public.expenses
  add column if not exists status public.expense_status not null default 'previsto',
  add column if not exists payment_method text,
  add column if not exists installments smallint not null default 1 check (installments between 1 and 60);
alter table public.payments
  add column if not exists installment_no smallint,
  add column if not exists due_date date;

alter table public.vendors
  add column if not exists company text,
  add column if not exists contract_url text,
  add column if not exists paid_cents integer check (paid_cents is null or paid_cents >= 0);

-- ---------- Timeline ----------
create table public.timeline_chapters (
  id uuid primary key default gen_random_uuid(),
  period text not null, title text not null, summary text, body text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timeline_photos (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.timeline_chapters(id) on delete cascade,
  image_path text not null, caption text,
  is_cover boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index timeline_photos_cap_idx on public.timeline_photos (chapter_id, sort_order);

create trigger timeline_touch before update on public.timeline_chapters
  for each row execute function public.touch_updated_at();

create table public.story_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (post_id, guest_id)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null, file_path text not null, mime_type text, size_bytes integer,
  category text not null default 'Geral',
  vendor_id uuid references public.vendors(id) on delete set null,
  notes text, created_at timestamptz not null default now()
);

-- Presentes: imagem no storage, não mais só URL externa.
alter table public.gifts
  add column if not exists image_path text,
  add column if not exists quantity smallint not null default 1 check (quantity >= 1);

-- ---------- RLS ----------
alter table public.task_items enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.kanban_card_items enable row level security;
alter table public.kanban_card_comments enable row level security;
alter table public.timeline_chapters enable row level security;
alter table public.timeline_photos enable row level security;
alter table public.story_reactions enable row level security;
alter table public.files enable row level security;

create policy "admin gerencia subtarefas" on public.task_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "admin gerencia colunas" on public.kanban_columns for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "admin gerencia cards" on public.kanban_cards for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "admin gerencia itens do card" on public.kanban_card_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "admin gerencia comentarios do card" on public.kanban_card_comments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "admin gerencia arquivos" on public.files for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- A timeline é a história do casal: aparece no site para todo mundo.
create policy "timeline e publica" on public.timeline_chapters for select to anon, authenticated using (true);
create policy "admin edita a timeline" on public.timeline_chapters for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "fotos da timeline sao publicas" on public.timeline_photos for select to anon, authenticated using (true);
create policy "admin edita fotos da timeline" on public.timeline_photos for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "convidado reage em nome proprio" on public.story_reactions for insert to authenticated
  with check (guest_id = private.meu_guest_id());
create policy "convidado troca a propria reacao" on public.story_reactions for update to authenticated
  using (guest_id = private.meu_guest_id()) with check (guest_id = private.meu_guest_id());
create policy "convidado remove a propria reacao" on public.story_reactions for delete to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin());
create policy "autor ve as reacoes do story" on public.story_reactions for select to authenticated
  using (private.is_admin() or guest_id = private.meu_guest_id()
         or exists (select 1 from public.posts p
                    where p.id = post_id and p.author_id = private.meu_guest_id()));

-- ---------- Bucket público do site ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin envia para o site" on storage.objects for insert to authenticated
  with check (bucket_id = 'site' and private.is_admin());
create policy "admin troca arquivos do site" on storage.objects for update to authenticated
  using (bucket_id = 'site' and private.is_admin())
  with check (bucket_id = 'site' and private.is_admin());
create policy "admin apaga arquivos do site" on storage.objects for delete to authenticated
  using (bucket_id = 'site' and private.is_admin());

-- A pasta do convidado no bucket "mural" passa a ser o id do CONVIDADO,
-- e não o do login — sem isto nenhum upload do mural passaria.
drop policy if exists "convidado envia para a propria pasta" on storage.objects;
drop policy if exists "convidado apaga as proprias fotos"   on storage.objects;
create policy "convidado envia para a propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'mural' and (storage.foldername(name))[1] = private.meu_guest_id()::text);
create policy "convidado apaga as proprias fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'mural'
         and ((storage.foldername(name))[1] = private.meu_guest_id()::text or private.is_admin()));
