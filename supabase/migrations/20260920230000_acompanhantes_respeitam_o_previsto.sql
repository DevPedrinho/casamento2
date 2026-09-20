-- O convidado só cadastra tantos acompanhantes quantos os noivos previram
-- na ficha (guests.companions_planned). A checagem mora no banco para
-- valer mesmo por fora da tela. Os noivos, pelo painel, não têm trava:
-- se querem passar do previsto, é porque mudaram de ideia.
create or replace function private.checar_acompanhantes_previstos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite  integer;
  v_pessoas integer;
begin
  if private.is_admin() then
    return new;
  end if;

  select companions_planned into v_limite from public.guests where id = new.guest_id;
  select count(*) into v_pessoas from public.rsvp_companions where guest_id = new.guest_id;

  if v_pessoas > coalesce(v_limite, 0) then
    raise exception 'LIMITE_DO_CONVITE:%', coalesce(v_limite, 0);
  end if;

  return new;
end;
$$;

drop trigger if exists rsvp_companions_previstos on public.rsvp_companions;
create constraint trigger rsvp_companions_previstos
  after insert on public.rsvp_companions
  deferrable initially immediate
  for each row execute function private.checar_acompanhantes_previstos();
