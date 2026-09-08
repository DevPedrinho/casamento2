-- Todas as policies que comparavam auth.uid() com um id de convidado
-- passam a resolver o vínculo por private.meu_guest_id().
-- (Conteúdo aplicado: guests, rsvps, gift_claims, posts, post_likes,
--  post_comments, story_views e post_reports.)

drop policy if exists "convidado le o proprio perfil"       on public.guests;
drop policy if exists "convidado atualiza o proprio perfil" on public.guests;
create policy "convidado le o proprio perfil" on public.guests for select to authenticated
  using (user_id = auth.uid() or private.is_admin());
create policy "convidado atualiza o proprio perfil" on public.guests for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_admin = private.is_admin());
create policy "admin gerencia convidados" on public.guests for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

alter table public.guest_groups enable row level security;
create policy "admin gerencia grupos" on public.guest_groups for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "convidado le grupos" on public.guest_groups for select to authenticated using (true);

drop policy if exists "convidado le o proprio rsvp"       on public.rsvps;
drop policy if exists "convidado cria o proprio rsvp"     on public.rsvps;
drop policy if exists "convidado atualiza o proprio rsvp" on public.rsvps;
create policy "convidado le o proprio rsvp" on public.rsvps for select to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin());
create policy "convidado cria o proprio rsvp" on public.rsvps for insert to authenticated
  with check (guest_id = private.meu_guest_id());
create policy "convidado atualiza o proprio rsvp" on public.rsvps for update to authenticated
  using (guest_id = private.meu_guest_id()) with check (guest_id = private.meu_guest_id());

drop policy if exists "convidado registra presente"        on public.gift_claims;
drop policy if exists "convidado le os proprios registros" on public.gift_claims;
create policy "convidado registra presente" on public.gift_claims for insert to authenticated
  with check (guest_id = private.meu_guest_id());
create policy "convidado le os proprios registros" on public.gift_claims for select to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin());

drop policy if exists "convidado le o mural"              on public.posts;
drop policy if exists "convidado publica em nome proprio" on public.posts;
drop policy if exists "autor edita a propria publicacao"  on public.posts;
drop policy if exists "autor apaga a propria publicacao"  on public.posts;
create policy "convidado le o mural" on public.posts for select to authenticated
  using (private.is_admin() or author_id = private.meu_guest_id()
         or (not is_hidden and (expires_at is null or expires_at > now())));
create policy "convidado publica em nome proprio" on public.posts for insert to authenticated
  with check (author_id = private.meu_guest_id() and not is_hidden);
create policy "autor edita a propria publicacao" on public.posts for update to authenticated
  using (author_id = private.meu_guest_id() and not is_hidden)
  with check (author_id = private.meu_guest_id() and not is_hidden);
create policy "autor apaga a propria publicacao" on public.posts for delete to authenticated
  using (author_id = private.meu_guest_id());

drop policy if exists "convidado curte em nome proprio" on public.post_likes;
drop policy if exists "convidado descurte o proprio"    on public.post_likes;
create policy "convidado curte em nome proprio" on public.post_likes for insert to authenticated
  with check (guest_id = private.meu_guest_id());
create policy "convidado descurte o proprio" on public.post_likes for delete to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin());

drop policy if exists "convidado le comentarios"            on public.post_comments;
drop policy if exists "convidado comenta em nome proprio"   on public.post_comments;
drop policy if exists "convidado apaga o proprio comentario" on public.post_comments;
create policy "convidado le comentarios" on public.post_comments for select to authenticated
  using (not is_hidden or guest_id = private.meu_guest_id() or private.is_admin());
create policy "convidado comenta em nome proprio" on public.post_comments for insert to authenticated
  with check (guest_id = private.meu_guest_id() and not is_hidden);
create policy "convidado apaga o proprio comentario" on public.post_comments for delete to authenticated
  using (guest_id = private.meu_guest_id() or private.is_admin());

drop policy if exists "convidado registra que viu" on public.story_views;
drop policy if exists "autor ve quem viu o story"  on public.story_views;
create policy "convidado registra que viu" on public.story_views for insert to authenticated
  with check (guest_id = private.meu_guest_id());
create policy "autor ve quem viu o story" on public.story_views for select to authenticated
  using (private.is_admin() or guest_id = private.meu_guest_id()
         or exists (select 1 from public.posts p
                    where p.id = post_id and p.author_id = private.meu_guest_id()));

drop policy if exists "convidado denuncia" on public.post_reports;
drop policy if exists "admin le denuncias" on public.post_reports;
create policy "convidado denuncia" on public.post_reports for insert to authenticated
  with check (reporter_id = private.meu_guest_id());
create policy "admin le denuncias" on public.post_reports for select to authenticated
  using (private.is_admin() or reporter_id = private.meu_guest_id());
