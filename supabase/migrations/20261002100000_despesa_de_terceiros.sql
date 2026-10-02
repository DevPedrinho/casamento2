-- Despesa paga por terceiros (pais, padrinhos, presente de alguém).
--
-- Fica registrada no Financeiro, para tudo estar num lugar só, mas não
-- conta como dinheiro dos noivos: sai dos totais, dos gráficos e da conta
-- do orçamento. Toda despesa existente continua contando (default false).

alter table public.expenses
  add column if not exists paid_by_third boolean not null default false,
  add column if not exists paid_by_name text;

comment on column public.expenses.paid_by_third is
  'Paga por outra pessoa: aparece no Financeiro, mas fica fora do orçamento dos noivos.';
comment on column public.expenses.paid_by_name is
  'Quem paga, quando é por terceiros ("Pais da noiva", "Padrinho João").';
