"use client";

import { useState } from "react";
import { ROTULOS_DESPESA, type Despesa, type Fornecedor } from "@/lib/tipos";
import { diasAte, formatarData, reais } from "@/lib/formato";
import { Botao } from "@/components/Botao";
import { Progresso, Selo } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha, NumeroFicha } from "@/components/Ficha";
import { FormPagamento, statusReal, TOM_DESPESA, totalPago, valorDeReferencia } from "./despesa";

/**
 * A ficha de uma despesa, aberta por cima da lista.
 *
 * Usa a casca comum de ficha (Ficha.tsx). Tudo que antes ficava espremido
 * dentro do cartão — pagamentos, botões, observações — mora aqui, com
 * espaço, e o cartão da lista fica só com o resumo.
 */
export function FichaDespesa({
  despesa,
  fornecedor,
  aoFechar,
  aoEditar,
  aoRemover,
  aoAtualizar,
}: {
  despesa: Despesa;
  fornecedor: Fornecedor | null;
  aoFechar: () => void;
  aoEditar: () => void;
  aoRemover: () => void;
  /** Depois de lançar um pagamento: a lista recarrega e a ficha reflete. */
  aoAtualizar: () => void;
}) {
  const [lancando, setLancando] = useState(false);

  const pago = totalPago(despesa);
  const referencia = valorDeReferencia(despesa);
  const falta = Math.max(0, referencia - pago);
  const quitado = referencia > 0 && falta === 0;
  const situacao = statusReal(despesa);
  const dias = diasAte(despesa.due_date);

  const pagamentos = despesa.payments
    .slice()
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  const ultimoPagamento = pagamentos[0]?.paid_at ?? null;

  const prazo = (() => {
    if (!despesa.due_date) return null;
    if (quitado) return "quitada";
    if (dias === null) return null;
    if (dias < 0) return `vencida há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
    if (dias === 0) return "vence hoje";
    return `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`;
  })();

  return (
    <Ficha
      rotuloAria={`Despesa: ${despesa.description}`}
      aoFechar={aoFechar}
      cabecalho={
        <>
          <p className="versalete text-xs text-terra">{despesa.category}</p>
          <h2 className="titulo-serif mt-1 text-2xl leading-tight text-oliva">
            {despesa.description}
          </h2>
        </>
      }
      abaixoDoCabecalho={
        <>
          <p className="titulo-serif mt-4 text-4xl text-oliva tabular-nums lining-nums">
            {reais(referencia)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-terra">
              {despesa.contracted_cents === null ? "valor previsto" : "valor contratado"}
            </span>
            <Selo tom={TOM_DESPESA[situacao]}>{ROTULOS_DESPESA[situacao]}</Selo>
            {!quitado && pago > 0 && <Selo tom="lavanda">parcial</Selo>}
          </div>
        </>
      }
      rodape={
        <>
          <Botao type="button" variante="contorno" onClick={aoEditar} className="flex-1 sm:flex-none">
            Editar
          </Botao>
          <button
            type="button"
            onClick={aoRemover}
            className={`${ACAO_FICHA} px-3 text-red-800`}
          >
            Remover
          </button>
        </>
      }
    >
      {/* ---------- Quanto já foi, quanto falta ---------- */}
      {referencia > 0 && (
        <CartaoFicha titulo="Pagamento">
          <div className="grid grid-cols-2 gap-3">
            <NumeroFicha rotulo="Já pago" valor={reais(pago)} tom="oliva" />
            <NumeroFicha rotulo="Falta" valor={reais(falta)} tom={falta > 0 ? "lavanda" : "oliva"} />
          </div>
          <div className="mt-4">
            <Progresso atual={pago} total={referencia} tom={quitado ? "oliva" : "lavanda"} />
          </div>
        </CartaoFicha>
      )}

      {/* ---------- Detalhes ---------- */}
      <CartaoFicha titulo="Detalhes">
        <LinhaFicha rotulo="Fornecedor" valor={fornecedor?.name ?? "—"} />
        <LinhaFicha rotulo="Categoria" valor={despesa.category} />
        <LinhaFicha rotulo="Situação" valor={ROTULOS_DESPESA[situacao]} />
        <LinhaFicha rotulo="Forma de pagamento" valor={despesa.payment_method ?? "—"} />
        <LinhaFicha
          rotulo="Parcelas"
          valor={
            despesa.installments > 1
              ? `${pagamentos.length} de ${despesa.installments} pagas`
              : "à vista"
          }
        />
        {despesa.contracted_cents !== null && despesa.estimated_cents !== despesa.contracted_cents && (
          <LinhaFicha rotulo="Previsto antes de fechar" valor={reais(despesa.estimated_cents)} />
        )}
      </CartaoFicha>

      {/* ---------- Datas ---------- */}
      <CartaoFicha titulo="Datas">
        <LinhaFicha
          rotulo="Vencimento"
          valor={despesa.due_date ? formatarData(despesa.due_date) ?? "—" : "sem data"}
          detalhe={prazo}
          alerta={dias !== null && dias < 0 && !quitado}
        />
        <LinhaFicha
          rotulo="Último pagamento"
          valor={ultimoPagamento ? formatarData(ultimoPagamento) ?? "—" : "nenhum ainda"}
        />
      </CartaoFicha>

      {/* ---------- Lançamentos ---------- */}
      <CartaoFicha
        titulo="Lançamentos"
        acao={
          !lancando && situacao !== "cancelado" ? (
            <button
              type="button"
              onClick={() => setLancando(true)}
              className={`${ACAO_FICHA} text-oliva`}
            >
              <Icone nome="mais" className="h-3.5 w-3.5" />
              Lançar
            </button>
          ) : null
        }
      >
        {pagamentos.length === 0 ? (
          <p className="text-sm text-terra">Nenhum pagamento lançado ainda.</p>
        ) : (
          <ul className="divide-y divide-terra/15">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 text-sm text-terra">
                  <span className="block text-oliva">{formatarData(p.paid_at)}</span>
                  {p.method && <span className="block truncate text-terra/90">{p.method}</span>}
                </span>
                <span className="titulo-serif shrink-0 text-lg text-oliva tabular-nums lining-nums">
                  {reais(p.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {lancando && (
          <FormPagamento
            despesaId={despesa.id}
            sugestao={falta}
            aoSalvar={() => {
              setLancando(false);
              aoAtualizar();
            }}
            aoCancelar={() => setLancando(false)}
          />
        )}
      </CartaoFicha>

      {/* ---------- Observações ---------- */}
      {despesa.notes && (
        <CartaoFicha titulo="Observações">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-terra">{despesa.notes}</p>
        </CartaoFicha>
      )}
    </Ficha>
  );
}
