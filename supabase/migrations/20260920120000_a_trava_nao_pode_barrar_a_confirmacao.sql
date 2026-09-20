-- ============================================================================
-- A trava dos campos dos noivos estava impedindo o convidado de confirmar.
--
-- Quando alguém salva a presença, o gatilho rsvp_sincroniza_convite atualiza
-- a ficha do convidado (status do convite, data da confirmação, restrição
-- alimentar). Essa atualização caía na trava travar_campos_dos_noivos, que
-- via "invite_status mudou, e quem está mexendo não é admin" e derrubava a
-- transação inteira com CAMPO_DOS_NOIVOS.
--
-- Resultado: nenhum convidado conseguia confirmar presença. A tela mostrava
-- "Não foi possível salvar agora".
--
-- Duas correções:
--
-- 1. A trava passa a valer só para a escrita DIRETA do convidado. Quando a
--    escrita vem de dentro de outro gatilho — o sistema reagindo à resposta
--    que a própria pessoa acabou de dar — ela passa. É o que pg_trigger_depth
--    distingue: 1 é o convidado mexendo na ficha; 2 ou mais é a cascata.
--
-- 2. O gatilho para de inflar companions_planned com o número que o convidado
--    informou. Esse campo é o PLANO dos noivos, e o confirmado de verdade
--    agora mora em rsvp_companions. Com o gatilho igualando os dois, o aviso
--    de "passou do previsto" no painel nunca poderia disparar.
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

  -- Escrita vinda de outro gatilho: é o sistema, não a pessoa. O único
  -- gatilho que escreve aqui é o que sincroniza o status a partir da
  -- resposta que ela mesma deu — legítimo.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Linha sem dono, ou com outro dono: é o gatilho do cadastro ligando a
  -- conta, ou o resgate do código. A política de RLS só deixa o convidado
  -- atualizar a linha em que user_id já é igual ao dele.
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

-- O plano dos noivos para de ser sobrescrito pelo número do convidado.
create or replace function public.sincroniza_status_do_convite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guests
     set invite_status = case new.status
                           when 'confirmado' then 'confirmado'::public.invite_status
                           when 'nao_vou'    then 'nao_vai'::public.invite_status
                           else 'aguardando'::public.invite_status
                         end,
         confirmed_at  = case when new.status = 'confirmado' then now() else null end,
         dietary_notes = coalesce(new.dietary_notes, dietary_notes)
   where id = new.guest_id;
  return new;
end;
$$;
