-- A marca "paga por terceiros" da despesa inteira deu lugar ao pagador de
-- cada lançamento (20261002120000_pagador_do_lancamento.sql).
alter table public.expenses
  drop column if exists paid_by_third,
  drop column if exists paid_by_name;
