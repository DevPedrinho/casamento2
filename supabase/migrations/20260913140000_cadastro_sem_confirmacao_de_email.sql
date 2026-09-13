-- Cadastro sem confirmação por e-mail.
--
-- Quem é da lista já foi autenticado uma vez: os noivos cadastraram a pessoa
-- e mandaram o código do convite junto com o convite. Exigir, em cima disso,
-- que ela ache um e-mail de confirmação (que quase sempre cai no spam) só
-- afasta convidado — e, no fim, é confirmar por e-mail alguém que já provou
-- quem é pelo código.
--
-- Então o cadastro nasce confirmado. O gatilho roda antes da inserção, de
-- modo que o convidado já sai do formulário com a sessão aberta.

create or replace function public.confirmar_email_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

comment on function public.confirmar_email_no_cadastro() is
  'Marca o e-mail como confirmado no cadastro: o código do convite já faz esse papel.';

drop trigger if exists confirmar_email_no_cadastro on auth.users;

create trigger confirmar_email_no_cadastro
  before insert on auth.users
  for each row execute function public.confirmar_email_no_cadastro();

-- Quem ficou parado esperando o e-mail entra agora, sem refazer nada.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email_confirmed_at is null;
