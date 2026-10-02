-- Quem pagou passa a ser de cada lançamento, não da despesa inteira:
-- uma despesa pode ter parte paga pelos noivos e parte por outra pessoa.
-- Só os lançamentos dos noivos contam como dinheiro deles.

alter table public.payments
  add column if not exists paid_by_third boolean not null default false,
  add column if not exists paid_by_name text;

-- O que já estava marcado na despesa desce para os lançamentos dela.
update public.payments p
   set paid_by_third = true,
       paid_by_name = e.paid_by_name
  from public.expenses e
 where e.id = p.expense_id
   and e.paid_by_third;
