-- ============================================================================
-- O que é do convidado, e o que é dos noivos.
--
-- A partir de agora o convidado cuida da própria ficha: nome, telefone,
-- idade, restrição alimentar, onde participa, vínculo. A política de RLS já
-- permitia que ele atualizasse a própria linha — só que a linha também guarda
-- decisões que não são dele: em que mesa senta, que papel tem na cerimônia,
-- em que ponto do CRM está, qual é o código do convite.
--
-- Sem esta trava, um convidado bem-intencionado (ou curioso) mudaria a
-- planilha de mesas dos noivos a partir do navegador dele.
-- ============================================================================

create or replace function private.travar_campos_dos_noivos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Os noivos mandam em tudo; a trava vale só para o próprio convidado.
  if private.is_admin() then
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
  then
    raise exception 'CAMPO_DOS_NOIVOS';
  end if;

  return new;
end;
$$;

comment on function private.travar_campos_dos_noivos() is
  'Impede que o convidado altere, na própria ficha, o que é decisão dos noivos.';

drop trigger if exists guests_campos_dos_noivos on public.guests;

create trigger guests_campos_dos_noivos
  before update on public.guests
  for each row execute function private.travar_campos_dos_noivos();
