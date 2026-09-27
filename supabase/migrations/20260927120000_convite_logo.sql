-- A logo da capa do convite também é trocável no painel.
-- Vazio = a logo que vem no projeto (public/img/convite/logo-convite.webp).
alter table public.invitation_settings add column if not exists cover_logo_path text;
