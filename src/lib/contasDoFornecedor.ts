import type { Despesa, Pagamento } from "@/lib/tipos";

/**
 * O que o financeiro sabe sobre cada fornecedor.
 *
 * Existe porque a ficha do fornecedor tinha um campo "pago" digitado à mão, e
 * ele envelheceu: quem lançava um pagamento no financeiro não voltava para
 * atualizar a ficha. Seis dos dez fornecedores mostravam valor errado.
 *
 * Agora o número é sempre calculado a partir dos lançamentos. Não tem como
 * divergir, porque não há dois lugares guardando a mesma coisa.
 */
export type ContaDoFornecedor = {
  despesas: Despesa[];
  /** Soma dos valores contratados nas despesas ligadas a este fornecedor. */
  contratado: number;
  /** Soma de tudo que já foi pago, lançamento por lançamento. */
  pago: number;
  /** Quanto falta, pelo contratado. Nunca negativo. */
  saldo: number;
  /** Os lançamentos em si, do mais recente para o mais antigo. */
  pagamentos: (Pagamento & { despesa: string })[];
  /** A próxima data de vencimento em aberto, se houver. */
  proximoVencimento: string | null;
};

export const CONTA_VAZIA: ContaDoFornecedor = {
  despesas: [],
  contratado: 0,
  pago: 0,
  saldo: 0,
  pagamentos: [],
  proximoVencimento: null,
};

export function contasPorFornecedor(despesas: Despesa[]): Map<string, ContaDoFornecedor> {
  const mapa = new Map<string, ContaDoFornecedor>();

  for (const despesa of despesas) {
    if (!despesa.vendor_id) continue;

    const conta = mapa.get(despesa.vendor_id) ?? { ...CONTA_VAZIA, despesas: [], pagamentos: [] };
    const pagamentos = despesa.payments ?? [];
    const pagoAqui = pagamentos.reduce((s, p) => s + p.amount_cents, 0);
    const referencia = despesa.contracted_cents ?? despesa.estimated_cents;

    conta.despesas = [...conta.despesas, despesa];
    conta.contratado += referencia;
    conta.pago += pagoAqui;
    conta.pagamentos = [
      ...conta.pagamentos,
      ...pagamentos.map((p) => ({ ...p, despesa: despesa.description })),
    ];

    // Só conta como vencimento aberto o que ainda não foi quitado.
    if (despesa.due_date && pagoAqui < referencia) {
      conta.proximoVencimento =
        conta.proximoVencimento && conta.proximoVencimento < despesa.due_date
          ? conta.proximoVencimento
          : despesa.due_date;
    }

    mapa.set(despesa.vendor_id, conta);
  }

  for (const conta of mapa.values()) {
    conta.saldo = Math.max(0, conta.contratado - conta.pago);
    conta.pagamentos.sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));
  }

  return mapa;
}
