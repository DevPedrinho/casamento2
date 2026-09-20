-- ============================================================================
-- O "pago" do fornecedor deixa de ser digitado.
--
-- vendors.paid_cents era preenchido à mão na ficha do fornecedor. Quem lançava
-- um pagamento no Financeiro não voltava para atualizar a ficha, e o número
-- envelheceu: em seis dos dez fornecedores ele já não batia com a soma real
-- dos lançamentos — para mais num caso (Audace Joias dizia quitado com
-- R$ 452,00 ainda em aberto) e para menos em cinco (Francisco Ateliê dizia
-- R$ 1.300,00 quando já havia R$ 2.800,00 pagos, ou seja, quitado).
--
-- Agora o valor é sempre somado de public.payments. A coluna fica como
-- referência do que a ficha dizia, para a tela de conciliação poder apontar a
-- diferença — mas nada mais escreve nela.
-- ============================================================================

comment on column public.vendors.paid_cents is
  'LEGADO, somente leitura. O quanto foi pago vem da soma de payments das despesas ligadas ao fornecedor. Esta coluna guarda o que a ficha dizia antes, e serve só para a tela de conciliação mostrar a divergência.';
