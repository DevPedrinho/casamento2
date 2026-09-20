-- Os noivos passam a cadastrar acompanhantes pela ficha do convidado, antes
-- mesmo de a pessoa responder no site. Para isso o acompanhante deixa de
-- depender de uma linha em rsvps e passa a apontar direto para o convidado.
--
-- O trigger que mantém rsvps.companions continua: sem rsvp, o update não
-- encontra linha e não faz nada. A policy já deixa o admin cuidar de todos.

do $$
declare nome text;
begin
  select conname into nome
    from pg_constraint
   where conrelid = 'public.rsvp_companions'::regclass
     and contype = 'f'
     and conkey = array[(select attnum from pg_attribute
                          where attrelid = 'public.rsvp_companions'::regclass
                            and attname = 'guest_id')];
  if nome is not null then
    execute format('alter table public.rsvp_companions drop constraint %I', nome);
  end if;
end $$;

alter table public.rsvp_companions
  add constraint rsvp_companions_guest_id_fkey
  foreign key (guest_id) references public.guests(id) on delete cascade;
