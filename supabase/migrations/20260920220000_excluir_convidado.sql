-- Excluir um convidado de verdade: a linha em guests (o resto vai em
-- cascata) e, se a pessoa já tinha entrado no site, o login dela também.
-- Assim o mesmo e-mail pode se cadastrar de novo, com um código novo.
create or replace function public.admin_excluir_convidado(p_guest uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not private.is_admin() then
    raise exception 'SO_OS_NOIVOS';
  end if;

  select user_id into v_user from public.guests where id = p_guest;
  if not found then
    raise exception 'CONVIDADO_NAO_ENCONTRADO';
  end if;

  delete from public.guests where id = p_guest;

  if v_user is not null then
    delete from auth.users where id = v_user;
  end if;
end;
$$;

revoke all on function public.admin_excluir_convidado(uuid) from public, anon;
grant execute on function public.admin_excluir_convidado(uuid) to authenticated;
