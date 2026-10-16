-- Despesa parcelada guarda uma data de vencimento só: a da próxima parcela.
-- Ao lançar um pagamento, ela passa para o mês seguinte (enquanto faltarem
-- parcelas e a conta não estiver quitada); ao remover um lançamento, volta.
-- Editar um lançamento não mexe na data.

create or replace function private.avancar_vencimento_da_parcela()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_despesa uuid := coalesce(new.expense_id, old.expense_id);
  v_parcelas int;
  v_vencimento date;
  v_referencia bigint;
  v_lancamentos int;
  v_pago bigint;
begin
  select e.installments, e.due_date, coalesce(e.contracted_cents, e.estimated_cents)
    into v_parcelas, v_vencimento, v_referencia
    from public.expenses e
   where e.id = v_despesa;

  if v_parcelas is null or v_parcelas <= 1 or v_vencimento is null then
    return null;
  end if;

  select count(*), coalesce(sum(p.amount_cents), 0)
    into v_lancamentos, v_pago
    from public.payments p
   where p.expense_id = v_despesa;

  if tg_op = 'INSERT' then
    -- Depois deste lançamento ainda falta parcela e a conta segue em aberto.
    if v_lancamentos < v_parcelas and v_pago < v_referencia then
      update public.expenses set due_date = (v_vencimento + interval '1 month')::date where id = v_despesa;
    end if;
  elsif tg_op = 'DELETE' then
    -- O inverso exato: com o lançamento removido de volta, a regra valia?
    if v_lancamentos + 1 < v_parcelas and v_pago + old.amount_cents < v_referencia then
      update public.expenses set due_date = (v_vencimento - interval '1 month')::date where id = v_despesa;
    end if;
  end if;
  return null;
end;
$$;

create or replace trigger parcela_avanca_vencimento
  after insert or delete on public.payments
  for each row execute function private.avancar_vencimento_da_parcela();
