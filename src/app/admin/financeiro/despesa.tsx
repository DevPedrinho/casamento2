"use client";

import { useState, type FormEvent } from "react";
import type { Despesa, Pagamento, StatusDespesa } from "@/lib/tipos";
import { diasAte, paraCampo, paraCentavos } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { valorDeReferencia } from "@/lib/orcamento";

/**
 * O que é comum à lista de despesas e à ficha de uma despesa.
 *
 * As contas de "quanto falta" e "qual é a situação de verdade" moram aqui
 * para que a lista e a ficha nunca discordem entre si.
 */

export { compromissoNosso, pagoPorNos, pagoPorOutros, quemPagou, valorDeReferencia } from "@/lib/orcamento";

/** Soma de todos os lançamentos de uma despesa, de quem quer que tenham
 *  vindo — é o que diz se a conta com o fornecedor está quitada. */
export function totalPago(despesa: Despesa): number {
  return (despesa.payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
}

/** O status guardado, corrigido pela realidade: quitado é pago; vencido e
 *  não quitado é atrasado. Evita depender de alguém lembrar de atualizar. */
export function statusReal(despesa: Despesa): StatusDespesa {
  if (despesa.status === "cancelado") return "cancelado";
  const pago = totalPago(despesa);
  const referencia = valorDeReferencia(despesa);
  if (referencia > 0 && pago >= referencia) return "pago";
  const dias = diasAte(despesa.due_date);
  if (dias !== null && dias < 0) return "atrasado";
  if (despesa.contracted_cents !== null) return "a_pagar";
  return "previsto";
}

export const TOM_DESPESA: Record<StatusDespesa, "neutro" | "oliva" | "lavanda" | "alerta" | "apagado"> = {
  previsto: "neutro",
  a_pagar: "lavanda",
  pago: "oliva",
  atrasado: "alerta",
  cancelado: "apagado",
};

/**
 * Lançar um pagamento novo ou, com `pagamento`, corrigir um já lançado
 * (valor, data, forma, quem pagou) — ou removê-lo, se foi engano.
 */
export function FormPagamento({
  despesaId,
  sugestao = 0,
  pagamento,
  aoSalvar,
  aoCancelar,
}: {
  despesaId: string;
  sugestao?: number;
  pagamento?: Pagamento;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const chave = pagamento?.id ?? despesaId;
  const [valor, setValor] = useState(
    pagamento ? paraCampo(pagamento.amount_cents) : sugestao > 0 ? paraCampo(sugestao) : "",
  );
  const [data, setData] = useState(pagamento?.paid_at ?? new Date().toISOString().slice(0, 10));
  const [metodo, setMetodo] = useState(pagamento?.method ?? "");
  const [deOutraPessoa, setDeOutraPessoa] = useState(Boolean(pagamento?.paid_by_third));
  const [quem, setQuem] = useState(pagamento?.paid_by_name ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const centavos = paraCentavos(valor);
    if (centavos === null || centavos <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      amount_cents: centavos,
      paid_at: data,
      method: metodo.trim() || null,
      paid_by_third: deOutraPessoa,
      paid_by_name: deOutraPessoa ? quem.trim() || null : null,
    };
    const { error } = pagamento
      ? await supabase.from("payments").update(dados).eq("id", pagamento.id)
      : await supabase.from("payments").insert({ expense_id: despesaId, ...dados });
    setSalvando(false);

    if (error) {
      setErro(pagamento ? "Não foi possível salvar a correção." : "Não foi possível lançar o pagamento.");
      return;
    }
    aoSalvar();
  }

  async function remover() {
    if (!pagamento) return;
    if (!confirm("Remover este lançamento? O valor sai do que já foi pago.")) return;
    setErro(null);
    setSalvando(true);
    const { error } = await criarClienteNavegador().from("payments").delete().eq("id", pagamento.id);
    setSalvando(false);
    if (error) {
      setErro("Não foi possível remover o lançamento.");
      return;
    }
    aoSalvar();
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-4 border-t border-terra/15 pt-4">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Rotulo htmlFor={`p-valor-${chave}`}>Valor (R$)</Rotulo>
          <input id={`p-valor-${chave}`} inputMode="decimal" className="campo" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor={`p-data-${chave}`}>Data</Rotulo>
          <input id={`p-data-${chave}`} type="date" className="campo" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor={`p-metodo-${chave}`}>Forma</Rotulo>
          <input id={`p-metodo-${chave}`} className="campo" placeholder="Pix, cartão…" value={metodo} onChange={(e) => setMetodo(e.target.value)} />
        </div>
      </div>
      <fieldset>
        <legend className="versalete mb-2 block text-xs text-terra">Quem pagou?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { valor: false, rotulo: "Nós (noivos)" },
            { valor: true, rotulo: "Outra pessoa" },
          ].map((opcao) => (
            <button
              key={opcao.rotulo}
              type="button"
              aria-pressed={deOutraPessoa === opcao.valor}
              onClick={() => setDeOutraPessoa(opcao.valor)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                deOutraPessoa === opcao.valor
                  ? opcao.valor
                    ? "border-lavanda bg-lavanda/15 text-oliva"
                    : "border-oliva bg-oliva text-creme-claro"
                  : "border-terra/25 text-terra hover:border-oliva/50"
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
        {deOutraPessoa && (
          <div className="mt-3 max-w-sm">
            <Rotulo htmlFor={`p-quem-${chave}`}>Nome</Rotulo>
            <input
              id={`p-quem-${chave}`}
              className="campo"
              placeholder="Pais da noiva, padrinho João…"
              value={quem}
              onChange={(e) => setQuem(e.target.value)}
            />
            <p className="mt-1 text-xs text-terra">Fica registrado, mas não entra no nosso orçamento.</p>
          </div>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" disabled={salvando}>
          {salvando ? (pagamento ? "Salvando…" : "Lançando…") : pagamento ? "Salvar" : "Lançar"}
        </Botao>
        <Botao type="button" variante="contorno" onClick={aoCancelar}>
          Cancelar
        </Botao>
        {pagamento && (
          <button
            type="button"
            onClick={remover}
            disabled={salvando}
            className="versalete ml-auto self-center text-xs text-red-800 underline-offset-4 hover:underline disabled:opacity-50"
          >
            Remover lançamento
          </button>
        )}
      </div>
    </form>
  );
}
