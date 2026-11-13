-- Quando os noivos pretendem enviar os convites. Com ela, a pendência
-- "Enviar o convite" do Mês a mês cai no dia certo (e só vira "vencido"
-- se a data passar com convidados ainda sem contato).
alter table public.site_settings
  add column if not exists invites_send_date date;

-- Quem teve o convite marcado como entregue pela ficha ficava como
-- "não contatado" (só a fila mudava o status). Acerta esses casos.
update public.guests
   set invite_status = 'convite_enviado'
 where code_sent_at is not null
   and invite_status = 'nao_contatado';
