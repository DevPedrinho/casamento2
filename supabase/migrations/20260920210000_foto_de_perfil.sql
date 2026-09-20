-- Foto de perfil do convidado, como numa rede social: ele sobe na área
-- dele, os noivos podem subir pela ficha, e ela aparece no cartão da
-- lista, na ficha e no mural.
--
-- Mora no bucket público "site", na pasta avatares/<id do convidado>/.
-- O convidado só escreve na própria pasta; os noivos escrevem em qualquer.

alter table public.guests add column if not exists avatar_path text;
comment on column public.guests.avatar_path is 'Foto de perfil, no bucket "site": avatares/<guest_id>/<arquivo>.jpg';

-- O mural passa a ver a foto de quem tem conta.
create or replace view public.perfis_publicos
with (security_invoker = off) as
  select
    id,
    full_name,
    ceremony_role,
    is_featured,
    featured_order,
    avatar_path
  from public.guests
  where user_id is not null;

revoke all on public.perfis_publicos from anon;
grant select on public.perfis_publicos to authenticated;

drop policy if exists "convidado envia a propria foto de perfil" on storage.objects;
create policy "convidado envia a propria foto de perfil"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site'
    and (storage.foldername(name))[1] = 'avatares'
    and (storage.foldername(name))[2] = private.meu_guest_id()::text
  );

drop policy if exists "convidado troca a propria foto de perfil" on storage.objects;
create policy "convidado troca a propria foto de perfil"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'site'
    and (storage.foldername(name))[1] = 'avatares'
    and (storage.foldername(name))[2] = private.meu_guest_id()::text
  );
