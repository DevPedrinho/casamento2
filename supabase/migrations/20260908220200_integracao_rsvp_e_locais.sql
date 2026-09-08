-- Integração: responder o RSVP pelo site move o status no CRM.
-- Os dois módulos escrevem no mesmo registro, sem base paralela.
create or replace function public.sincroniza_status_do_convite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.guests
     set invite_status = case new.status
                           when 'confirmado' then 'confirmado'::public.invite_status
                           when 'nao_vou'    then 'nao_vai'::public.invite_status
                           else 'aguardando'::public.invite_status
                         end,
         confirmed_at = case when new.status = 'confirmado' then now() else null end,
         companions_planned = greatest(companions_planned, new.companions),
         dietary_notes = coalesce(new.dietary_notes, dietary_notes)
   where id = new.guest_id;
  return new;
end;
$$;
revoke all on function public.sincroniza_status_do_convite() from public, anon, authenticated;

create trigger rsvp_sincroniza_convite
  after insert or update on public.rsvps
  for each row execute function public.sincroniza_status_do_convite();

-- ---------- Locais do evento ----------
create table public.event_venues (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null unique check (kind in ('cerimonia', 'recepcao')),
  name         text not null,
  address      text,
  city         text,
  maps_url     text,
  instagram    text,
  phone        text,
  contact_name text,
  starts_at    text,
  notes        text,
  guest_info   text,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.venue_photos (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references public.event_venues(id) on delete cascade,
  image_path text not null,
  caption    text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create trigger venues_touch before update on public.event_venues
  for each row execute function public.touch_updated_at();

alter table public.event_venues enable row level security;
alter table public.venue_photos enable row level security;

-- Os locais são públicos: o convidado precisa saber onde é a festa.
create policy "locais sao publicos" on public.event_venues for select to anon, authenticated using (true);
create policy "admin gerencia locais" on public.event_venues for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "fotos do local sao publicas" on public.venue_photos for select to anon, authenticated using (true);
create policy "admin gerencia fotos do local" on public.venue_photos for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

insert into public.event_venues (kind, name, address, city, instagram, starts_at, sort_order, guest_info) values
  ('cerimonia', 'Capela da Igreja da Glória', 'Cidade dos Funcionários', 'Fortaleza – CE',
   null, '16h00', 1, 'Chegue com 20 minutos de antecedência para acomodar todo mundo antes da entrada da noiva.'),
  ('recepcao', 'Buffet Genesis', null, 'Fortaleza – CE',
   'genesisbuffetce', '18h00', 2, 'A recepção começa logo após a cerimônia, no Buffet Genesis.');
