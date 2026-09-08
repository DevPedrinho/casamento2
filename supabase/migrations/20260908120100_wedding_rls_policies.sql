-- =========================================================
-- Row Level Security: cada convidado só enxerga o que é dele.
-- Os noivos (is_admin) enxergam tudo.
-- =========================================================

-- private.is_admin() fica fora do schema público de propósito: as policies
-- precisam chamá-la, mas ela não deve ficar exposta em /rest/v1/rpc.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select g.is_admin from public.guests g where g.id = auth.uid()), false);
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

alter table public.guests      enable row level security;
alter table public.rsvps       enable row level security;
alter table public.gifts       enable row level security;
alter table public.gift_claims enable row level security;

-- ---------- guests ----------
create policy "convidado le o proprio perfil"
  on public.guests for select to authenticated
  using (id = auth.uid() or private.is_admin());

-- O `is_admin = private.is_admin()` impede que um convidado se promova.
create policy "convidado atualiza o proprio perfil"
  on public.guests for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = private.is_admin());

create policy "admin atualiza qualquer perfil"
  on public.guests for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------- rsvps ----------
create policy "convidado le o proprio rsvp"
  on public.rsvps for select to authenticated
  using (guest_id = auth.uid() or private.is_admin());

create policy "convidado cria o proprio rsvp"
  on public.rsvps for insert to authenticated
  with check (guest_id = auth.uid());

create policy "convidado atualiza o proprio rsvp"
  on public.rsvps for update to authenticated
  using (guest_id = auth.uid()) with check (guest_id = auth.uid());

create policy "admin gerencia rsvps"
  on public.rsvps for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------- gifts ----------
-- A vitrine é pública: o visitante vê a lista antes mesmo de se cadastrar.
create policy "presentes ativos sao publicos"
  on public.gifts for select to anon, authenticated
  using (is_active or private.is_admin());

create policy "admin gerencia presentes"
  on public.gifts for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------- gift_claims ----------
create policy "convidado registra presente"
  on public.gift_claims for insert to authenticated
  with check (guest_id = auth.uid());

create policy "convidado le os proprios registros"
  on public.gift_claims for select to authenticated
  using (guest_id = auth.uid() or private.is_admin());

create policy "admin gerencia registros"
  on public.gift_claims for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
