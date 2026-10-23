-- O "valor fechado" do fornecedor é sempre a soma das despesas ligadas a
-- ele no financeiro (contratado, ou previsto quando ainda não há
-- contratado) — o mesmo "Contratado nas despesas" da ficha. O banco
-- recalcula a cada despesa criada, alterada, removida ou trocada de
-- fornecedor; fornecedor sem despesa guarda o valor digitado.

create or replace function private.recalcular_valor_fechado(p_fornecedor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.vendors v
     set agreed_cents = s.total
    from (
      select sum(coalesce(e.contracted_cents, e.estimated_cents))::int as total
        from public.expenses e
       where e.vendor_id = p_fornecedor
    ) s
   where v.id = p_fornecedor
     and s.total is not null
     and v.agreed_cents is distinct from s.total;
$$;

create or replace function private.despesa_muda_valor_fechado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.vendor_id is not null then
    perform private.recalcular_valor_fechado(new.vendor_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.vendor_id is not null
     and (tg_op = 'DELETE' or old.vendor_id is distinct from new.vendor_id) then
    perform private.recalcular_valor_fechado(old.vendor_id);
  end if;
  return null;
end;
$$;

create or replace trigger despesa_muda_valor_fechado
  after insert or update of vendor_id, contracted_cents, estimated_cents or delete
  on public.expenses
  for each row execute function private.despesa_muda_valor_fechado();

-- Acerta quem já está diferente hoje.
select private.recalcular_valor_fechado(id) from public.vendors;
