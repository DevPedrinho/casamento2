import type { Despesa } from "@/lib/tipos";

/**
 * Se a despesa conta como dinheiro dos noivos. As pagas por terceiros
 * (pais, padrinhos…) ficam registradas, mas fora de totais, gráficos,
 * alertas e da conta do orçamento — em todo o painel, por esta regra.
 *
 * Vive fora dos arquivos "use client" porque o Dashboard (servidor)
 * também a usa.
 */
export function contaNoOrcamento(despesa: Pick<Despesa, "paid_by_third">): boolean {
  return !despesa.paid_by_third;
}

/** "Pago por terceiros · Pais da noiva", para selo e ficha. */
export function rotuloTerceiros(despesa: Pick<Despesa, "paid_by_name">): string {
  const quem = despesa.paid_by_name?.trim();
  return quem ? `Pago por terceiros · ${quem}` : "Pago por terceiros";
}
