-- ============================================================================
-- Os nomes do mural.
--
-- A política de leitura de guests é estreita de propósito: cada convidado lê
-- a própria linha, e mais nada. Só que o mural precisa de uma informação de
-- todo mundo — o nome de quem postou, curtiu e comentou. Hoje isso volta
-- nulo: o convidado vê a foto de outra pessoa sem saber de quem é.
--
-- A saída não é afrouxar a política (ela protege telefone, e-mail, código do
-- convite, observações dos noivos), e sim expor, numa visão à parte, só o que
-- o mural mostra na tela: nome e papel na cerimônia. E só de quem tem conta,
-- que é exatamente quem pode aparecer lá.
-- ============================================================================

create or replace view public.perfis_publicos
with (security_invoker = off) as
  select
    id,
    full_name,
    ceremony_role,
    is_featured,
    featured_order
  from public.guests
  where user_id is not null;

comment on view public.perfis_publicos is
  'Nome e papel de quem tem conta — o mínimo que o mural mostra. Roda como dona da tabela de propósito: é a única forma de expor colunas escolhidas sem abrir a linha inteira pelo RLS.';

revoke all on public.perfis_publicos from anon;
grant select on public.perfis_publicos to authenticated;
