import type { Despesa, Pagamento } from "@/lib/tipos";

/**
 * Quem pagou cada lançamento decide o que é dinheiro dos noivos. Os
 * lançamentos de outras pessoas (pais, padrinhos…) quitam a conta com o
 * fornecedor, mas ficam fora de "já pago", dos gráficos e da conta do
 * orçamento — em todo o painel, por estas regras.
 *
 * Vive fora dos arquivos "use client" porque o Dashboard e o assistente
 * (servidor) também as usam.
 */

type ComLancamentos = { payments?: Pick<Pagamento, "amount_cents" | "paid_by_third">[] | null };

/** O lançamento foi feito pelos noivos? */
export function lancamentoNosso(pagamento: Pick<Pagamento, "paid_by_third">): boolean {
  return !pagamento.paid_by_third;
}

/** O valor que vale para o caixa: o contratado quando existe, senão o previsto. */
export function valorDeReferencia(despesa: Pick<Despesa, "contracted_cents" | "estimated_cents">): number {
  return despesa.contracted_cents ?? despesa.estimated_cents;
}

/** Soma dos lançamentos feitos pelos noivos. */
export function pagoPorNos(despesa: ComLancamentos): number {
  return (despesa.payments ?? []).filter(lancamentoNosso).reduce((s, p) => s + p.amount_cents, 0);
}

/** Soma dos lançamentos feitos por outras pessoas. */
export function pagoPorOutros(despesa: ComLancamentos): number {
  return (despesa.payments ?? []).filter((p) => !lancamentoNosso(p)).reduce((s, p) => s + p.amount_cents, 0);
}

/**
 * Quanto da despesa é dos noivos: o valor menos o que outras pessoas já
 * pagaram. Buffet de R$ 10 mil com R$ 6 mil dos pais → R$ 4 mil nossos.
 * `valor` permite usar o previsto ou o contratado no lugar da referência.
 */
export function compromissoNosso(
  despesa: ComLancamentos & Pick<Despesa, "contracted_cents" | "estimated_cents">,
  valor: number = valorDeReferencia(despesa),
): number {
  return Math.max(0, valor - pagoPorOutros(despesa));
}

/** "Nós" ou "Pais da noiva" (ou "Outra pessoa", sem nome). */
export function quemPagou(pagamento: Pick<Pagamento, "paid_by_third" | "paid_by_name">): string {
  if (lancamentoNosso(pagamento)) return "Nós";
  return pagamento.paid_by_name?.trim() || "Outra pessoa";
}
