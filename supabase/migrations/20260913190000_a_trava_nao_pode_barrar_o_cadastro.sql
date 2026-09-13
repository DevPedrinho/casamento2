-- ============================================================================
-- Conserto da trava do convidado.
--
-- A versão anterior barrava mudanças em user_id — e era exatamente isso que o
-- gatilho handle_new_user faz ao ligar uma conta nova ao convidado da lista.
-- Resultado: qualquer cadastro novo morria com CAMPO_DOS_NOIVOS. O mesmo
-- valia para o resgate do código do convite.
--
-- A trava agora só olha para o caso que ela nasceu para cobrir: o convidado
-- editando a ficha que já é dele. Quando a linha ainda não tem dono, quem
-- escreve é o sistema — e essas escritas já passaram pelo RLS.
-- ============================================================================

create or replace function private.travar_campos_dos_noivos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Os noivos mandam em tudo.
  if private.is_admin() then
    return new;
  end if;

  -- Linha sem dono, ou com outro dono: é o gatilho do cadastro ligando a
  -- conta, ou o resgate do código. Não é brecha — a política de RLS só deixa
  -- o convidado atualizar a linha em que user_id já é igual ao dele.
  if old.user_id is null or old.user_id is distinct from auth.uid() then
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
