-- Um número só por convidado. O painel edita o `phone` ("Telefone /
-- WhatsApp"), mas a ficha e o botão do WhatsApp liam o `whatsapp`, que
-- ficava com o número antigo. Daqui em diante o `whatsapp` acompanha o
-- `phone` sempre que ele é gravado ou muda — venha de onde vier.

create or replace function private.whatsapp_acompanha_telefone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.phone is not null then
      new.whatsapp := new.phone;
    end if;
  elsif new.phone is distinct from old.phone then
    new.whatsapp := new.phone;
  end if;
  return new;
end;
$$;

create or replace trigger whatsapp_acompanha_telefone
  before insert or update of phone on public.guests
  for each row execute function private.whatsapp_acompanha_telefone();

-- Quem já estava com os dois números diferentes fica com o telefone, que é
-- o campo editado no painel.
update public.guests
   set whatsapp = phone
 where phone is not null
   and whatsapp is not null
   and regexp_replace(phone, '\D', '', 'g') <> regexp_replace(whatsapp, '\D', '', 'g');
