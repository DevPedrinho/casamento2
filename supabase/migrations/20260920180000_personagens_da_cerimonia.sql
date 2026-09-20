-- Personagens da cerimônia: a página pública "Personagens" e o módulo do
-- painel que a edita (foto, papel, texto, ordem).
--
-- Cada personagem pode apontar para um convidado da lista, mas não precisa:
-- a página fala de pessoas, e nem toda pessoa é convidado (o noivo, por
-- exemplo). Quando aponta, o painel mantém o convidado em destaque no mural.

create table public.ceremony_people (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid references public.guests(id) on delete set null,
  name        text not null,
  role_label  text not null,
  -- Em que bloco da página a pessoa aparece.
  section     text not null check (section in ('protagonistas', 'raizes', 'ao_lado', 'cortejo')),
  -- Aba dentro de "Quem caminha ao nosso lado": Madrinhas, Padrinhos…
  group_label text,
  -- O texto curto do cartão.
  description text,
  -- O texto do "Conhecer melhor" dos noivos.
  long_text   text,
  image_path  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.ceremony_people is 'Quem aparece na página Personagens da cerimônia, por seção.';
create index ceremony_people_secao_idx on public.ceremony_people (section, sort_order);
create trigger ceremony_people_touch before update on public.ceremony_people
  for each row execute function public.touch_updated_at();

-- Os textos da página (título, abertura, títulos de seção, fechamento).
create table public.ceremony_page (
  id         boolean primary key default true check (id),
  texts      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.ceremony_page (id) values (true);
create trigger ceremony_page_touch before update on public.ceremony_page
  for each row execute function public.touch_updated_at();

-- ---------- RLS: a página é pública; só os noivos editam ----------
alter table public.ceremony_people enable row level security;
alter table public.ceremony_page   enable row level security;

create policy "todo mundo le os personagens" on public.ceremony_people
  for select to anon, authenticated using (true);
create policy "admin gerencia os personagens" on public.ceremony_people
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "todo mundo le a pagina" on public.ceremony_page
  for select to anon, authenticated using (true);
create policy "admin edita a pagina" on public.ceremony_page
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---------- Semente: quem já estava em destaque entra na página ----------
insert into public.ceremony_people (guest_id, name, role_label, section, group_label, sort_order)
select
  g.id,
  g.full_name,
  g.ceremony_role,
  case
    when g.ceremony_role ilike 'noiv%'                                       then 'protagonistas'
    when g.ceremony_role ilike 'mãe%' or g.ceremony_role ilike 'pai %'       then 'raizes'
    when g.ceremony_role ilike 'madrinha%' or g.ceremony_role ilike 'padrinho%' then 'ao_lado'
    else 'cortejo'
  end,
  case
    when g.ceremony_role ilike 'madrinha%' then 'Madrinhas'
    when g.ceremony_role ilike 'padrinho%' then 'Padrinhos'
    else null
  end,
  case
    when g.ceremony_role ilike 'noiva%'        then 1
    when g.ceremony_role ilike 'noivo%'        then 2
    when g.ceremony_role ilike 'mãe da noiva%' then 1
    when g.ceremony_role ilike 'pai da noiva%' then 2
    when g.ceremony_role ilike 'mãe do noivo%' then 3
    when g.ceremony_role ilike 'pai do noivo%' then 4
    else coalesce(g.featured_order, 10 + row_number() over (order by g.ceremony_role, g.full_name))::integer
  end
from public.guests g
where g.is_featured and coalesce(trim(g.ceremony_role), '') <> '';

-- O noivo não é convidado da própria festa; entra pelo nome das configurações.
insert into public.ceremony_people (name, role_label, section, sort_order)
select s.groom_name, 'Noivo', 'protagonistas', 2
from public.site_settings s
where not exists (
  select 1 from public.ceremony_people p
  where p.section = 'protagonistas' and p.role_label ilike 'noivo%'
);
