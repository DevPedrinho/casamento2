"use client";

import { useState, type FormEvent } from "react";
import type { Despesa, StatusDespesa } from "@/lib/tipos";
import { diasAte, paraCampo, paraCentavos } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";

/**
 * O que é comum à lista de despesas e à ficha de uma despesa.
 *
 * As contas de "quanto falta" e "qual é a situação de verdade" moram aqui
 * para que a lista e a ficha nunca discordem entre si.
 */

/** Soma dos pagamentos já lançados em uma despesa. */
export function totalPago(despesa: Despesa): number {
  return (despesa.payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
}

/** O valor que vale para o caixa: o contratado quando existe, senão o previsto. */
export function valorDeReferencia(despesa: Despesa): number {
  return despesa.contracted_cents ?? despesa.estimated_cents;
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

export function FormPagamento({
  despesaId,
  sugestao,
  aoSalvar,
  aoCancelar,
}: {
  despesaId: string;
  sugestao: number;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [valor, setValor] = useState(sugestao > 0 ? paraCampo(sugestao) : "");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [metodo, setMetodo] = useState("");
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
    const { error } = await supabase.from("payments").insert({
      expense_id: despesaId,
      amount_cents: centavos,
      paid_at: data,
      method: metodo.trim() || null,
    });
    setSalvando(false);

    if (error) {
      setErro("Não foi possível lançar o pagamento.");
      return;
    }
    aoSalvar();
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-4 border-t border-terra/15 pt-4">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Rotulo htmlFor={`p-valor-${despesaId}`}>Valor (R$)</Rotulo>
          <input id={`p-valor-${despesaId}`} inputMode="decimal" className="campo" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor={`p-data-${despesaId}`}>Data</Rotulo>
          <input id={`p-data-${despesaId}`} type="date" className="campo" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor={`p-metodo-${despesaId}`}>Forma</Rotulo>
          <input id={`p-metodo-${despesaId}`} className="campo" placeholder="Pix, cartão…" value={metodo} onChange={(e) => setMetodo(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Lançando…" : "Lançar"}
        </Botao>
        <Botao type="button" variante="contorno" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
