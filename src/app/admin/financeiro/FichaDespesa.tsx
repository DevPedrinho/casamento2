"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ROTULOS_DESPESA, type Despesa, type Fornecedor } from "@/lib/tipos";
import { diasAte, formatarData, reais } from "@/lib/formato";
import { Botao } from "@/components/Botao";
import { Progresso, Selo } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { FormPagamento, statusReal, TOM_DESPESA, totalPago, valorDeReferencia } from "./despesa";

/**
 * A ficha de uma despesa, aberta por cima da lista.
 *
 * No celular ela sobe do rodapé e ocupa a tela; no computador abre como
 * gaveta lateral, igual à ficha do convidado. Tudo que antes ficava
 * espremido dentro do cartão — pagamentos, botões, observações — mora aqui,
 * com espaço, e o cartão da lista fica só com o resumo.
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
  const fecharRef = useRef<HTMLButtonElement>(null);

  // Trava a rolagem da página atrás, fecha no Esc, foca o botão de fechar.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

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
    <div
      className="fixed inset-0 z-[60] flex items-end bg-oliva-escuro/50 sm:items-stretch sm:justify-end"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Despesa: ${despesa.description}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full flex-col overflow-y-auto rounded-t-xl border-t border-terra/20 bg-creme-claro shadow-2xl sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0"
      >
        {/* ---------- Cabeçalho: nome, situação, valor ---------- */}
        <header className="sticky top-0 z-10 border-b border-terra/20 bg-creme-claro px-5 pb-5 pt-4 sm:px-6">
          {/* O puxador que todo celular espera numa folha que sobe. */}
          <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-terra/30 sm:hidden" />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="versalete text-xs text-terra">{despesa.category}</p>
              <h2 className="titulo-serif mt-1 text-2xl leading-tight text-oliva">
                {despesa.description}
              </h2>
            </div>
            <button
              ref={fecharRef}
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-terra transition-colors hover:text-oliva"
            >
              <Icone nome="fechar" />
            </button>
          </div>

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
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {/* ---------- Quanto já foi, quanto falta ---------- */}
          {referencia > 0 && (
            <Cartao titulo="Pagamento">
              <div className="grid grid-cols-2 gap-3">
                <Numero rotulo="Já pago" valor={reais(pago)} tom="oliva" />
                <Numero rotulo="Falta" valor={reais(falta)} tom={falta > 0 ? "lavanda" : "oliva"} />
              </div>
              <div className="mt-4">
                <Progresso atual={pago} total={referencia} tom={quitado ? "oliva" : "lavanda"} />
              </div>
            </Cartao>
          )}

          {/* ---------- Detalhes ---------- */}
          <Cartao titulo="Detalhes">
            <Linha rotulo="Fornecedor" valor={fornecedor?.name ?? "—"} />
            <Linha rotulo="Categoria" valor={despesa.category} />
            <Linha rotulo="Situação" valor={ROTULOS_DESPESA[situacao]} />
            <Linha rotulo="Forma de pagamento" valor={despesa.payment_method ?? "—"} />
            <Linha
              rotulo="Parcelas"
              valor={
                despesa.installments > 1
                  ? `${pagamentos.length} de ${despesa.installments} pagas`
                  : "à vista"
              }
            />
            {despesa.contracted_cents !== null && despesa.estimated_cents !== despesa.contracted_cents && (
              <Linha rotulo="Previsto antes de fechar" valor={reais(despesa.estimated_cents)} />
            )}
          </Cartao>

          {/* ---------- Datas ---------- */}
          <Cartao titulo="Datas">
            <Linha
              rotulo="Vencimento"
              valor={despesa.due_date ? formatarData(despesa.due_date) ?? "—" : "sem data"}
              detalhe={prazo}
              alerta={dias !== null && dias < 0 && !quitado}
            />
            <Linha
              rotulo="Último pagamento"
              valor={ultimoPagamento ? formatarData(ultimoPagamento) ?? "—" : "nenhum ainda"}
            />
          </Cartao>

          {/* ---------- Lançamentos ---------- */}
          <Cartao
            titulo="Lançamentos"
            acao={
              !lancando && situacao !== "cancelado" ? (
                <button
                  type="button"
                  onClick={() => setLancando(true)}
                  className="versalete inline-flex min-h-11 items-center gap-1.5 text-xs text-oliva underline underline-offset-4"
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
                      {p.method && <span className="block truncate text-terra/80">{p.method}</span>}
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
          </Cartao>

          {/* ---------- Observações ---------- */}
          {despesa.notes && (
            <Cartao titulo="Observações">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-terra">{despesa.notes}</p>
            </Cartao>
          )}
        </div>

        {/* ---------- Ações ---------- */}
        <footer className="sticky bottom-0 mt-auto flex flex-wrap gap-3 border-t border-terra/20 bg-creme-claro px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <Botao type="button" variante="contorno" onClick={aoEditar} className="flex-1 sm:flex-none">
            Editar
          </Botao>
          <button
            type="button"
            onClick={aoRemover}
            className="versalete inline-flex min-h-11 items-center px-3 text-xs text-red-800 underline underline-offset-4"
          >
            Remover
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Um bloco da ficha: título em versalete, conteúdo dentro. */
function Cartao({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-terra/20 bg-creme px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="versalete text-xs text-lavanda">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Rótulo à esquerda, valor à direita — a linha que o exemplo usa o tempo todo. */
function Linha({
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string | null;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-sm text-terra">{rotulo}</span>
      <span className="min-w-0 text-right">
        <span className={`block text-sm ${alerta ? "font-medium text-red-800" : "text-oliva"}`}>
          {valor}
        </span>
        {detalhe && (
          <span className={`block text-xs ${alerta ? "text-red-800" : "text-terra/80"}`}>{detalhe}</span>
        )}
      </span>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom: "oliva" | "lavanda";
}) {
  return (
    <div>
      <span className="versalete block text-xs text-terra">{rotulo}</span>
      <span
        className={`titulo-serif block text-2xl tabular-nums lining-nums ${
          tom === "oliva" ? "text-oliva" : "text-lavanda"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
