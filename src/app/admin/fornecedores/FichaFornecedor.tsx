"use client";

import Link from "next/link";
import {
  ETAPAS_FUNIL,
  ROTULOS_FORNECEDOR,
  type Fornecedor,
  type StatusFornecedor,
} from "@/lib/tipos";
import { diasAte, formatarData, linkSeguro, reais } from "@/lib/formato";
import type { ContaDoFornecedor } from "@/lib/contasDoFornecedor";
import { Botao } from "@/components/Botao";
import { Progresso, Selo } from "@/components/painel";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha, NumeroFicha } from "@/components/Ficha";

export const TOM_ETAPA: Record<StatusFornecedor, "neutro" | "oliva" | "lavanda" | "apagado"> = {
  prospecto: "neutro",
  contatado: "neutro",
  proposta: "lavanda",
  negociando: "lavanda",
  contratado: "oliva",
  descartado: "apagado",
};

/**
 * A ficha do fornecedor. O cartão da lista é só o resumo; contato, valores,
 * a conta no financeiro e o próximo passo ficam aqui, com espaço.
 */
export function FichaFornecedor({
  fornecedor: f,
  conta,
  aoFechar,
  aoEditar,
  aoRemover,
  aoMover,
}: {
  fornecedor: Fornecedor;
  conta: ContaDoFornecedor;
  aoFechar: () => void;
  aoEditar: () => void;
  aoRemover: () => void;
  aoMover: (status: StatusFornecedor) => void;
}) {
  const dias = diasAte(f.next_action_at);
  const urgente = dias !== null && dias <= 7 && f.status !== "contratado" && f.status !== "descartado";
  const site = linkSeguro(f.website);
  const contrato = linkSeguro(f.contract_url ?? null);
  const zap = f.phone ? `https://wa.me/55${f.phone.replace(/\D/g, "")}` : null;

  const quitado = conta.despesas.length > 0 && conta.saldo === 0;
  const diasParaVencer = diasAte(conta.proximoVencimento);

  return (
    <Ficha
      rotuloAria={`Fornecedor: ${f.name}`}
      aoFechar={aoFechar}
      cabecalho={
        <>
          <p className="versalete text-xs text-terra">{f.category}</p>
          <h2 className="titulo-serif mt-1 text-2xl leading-tight text-oliva">{f.name}</h2>
          {f.company && <p className="mt-0.5 text-sm text-terra">{f.company}</p>}
        </>
      }
      abaixoDoCabecalho={
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Selo tom={TOM_ETAPA[f.status]}>{ROTULOS_FORNECEDOR[f.status]}</Selo>
          {f.agreed_cents !== null && (
            <span className="titulo-serif text-lg text-oliva tabular-nums lining-nums">{reais(f.agreed_cents)}</span>
          )}
          {quitado && <Selo tom="oliva">quitado</Selo>}
        </div>
      }
      rodape={
        <>
          <Botao type="button" variante="contorno" onClick={aoEditar} className="flex-1 sm:flex-none">
            Editar
          </Botao>
          <button type="button" onClick={aoRemover} className={`${ACAO_FICHA} ml-auto px-3 text-red-800`}>
            Remover
          </button>
        </>
      }
    >
      {/* ---------- Etapa do funil ---------- */}
      <CartaoFicha titulo="Etapa">
        <label className="flex flex-wrap items-center justify-between gap-3 text-sm text-terra">
          <span>Mover para</span>
          <select
            value={f.status}
            onChange={(e) => aoMover(e.target.value as StatusFornecedor)}
            aria-label="Etapa do fornecedor"
            className="campo w-auto min-w-[12rem]"
          >
            {ETAPAS_FUNIL.map((s) => (
              <option key={s} value={s}>{ROTULOS_FORNECEDOR[s]}</option>
            ))}
          </select>
        </label>
        {f.next_action && (
          <p className={`mt-3 text-sm ${urgente ? "font-medium text-red-800" : "text-terra"}`}>
            Próximo passo: {f.next_action}
            {f.next_action_at && ` — ${formatarData(f.next_action_at)}`}
            {urgente && dias !== null && (dias < 0 ? " (passou)" : dias === 0 ? " (hoje)" : ` (em ${dias}d)`)}
          </p>
        )}
      </CartaoFicha>

      {/* ---------- Contato ---------- */}
      {(f.contact_name || f.phone || f.email || f.instagram || site) && (
        <CartaoFicha titulo="Contato">
          {f.contact_name && <LinhaFicha rotulo="Pessoa" valor={f.contact_name} />}
          {f.phone && (
            <LinhaFicha
              rotulo="WhatsApp"
              valor={
                <a href={zap!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  {f.phone}
                </a>
              }
            />
          )}
          {f.email && <LinhaFicha rotulo="E-mail" valor={<span className="break-all">{f.email}</span>} />}
          {f.instagram && (
            <LinhaFicha
              rotulo="Instagram"
              valor={
                <a href={`https://instagram.com/${f.instagram}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  @{f.instagram}
                </a>
              }
            />
          )}
          {site && (
            <LinhaFicha
              rotulo="Site"
              valor={
                <a href={site} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
                  {site.replace(/^https?:\/\//, "")}
                </a>
              }
            />
          )}
        </CartaoFicha>
      )}

      {/* ---------- Valores ---------- */}
      <CartaoFicha titulo="Valores">
        <LinhaFicha rotulo="Orçamento recebido" valor={f.quoted_cents !== null ? reais(f.quoted_cents) : "—"} />
        <LinhaFicha rotulo="Valor fechado" valor={f.agreed_cents !== null ? reais(f.agreed_cents) : "ainda não fechou"} />
        {f.rating !== null && <LinhaFicha rotulo="Avaliação" valor={"★".repeat(f.rating) + "☆".repeat(5 - f.rating)} />}
        {contrato && (
          <p className="mt-1">
            <a href={contrato} target="_blank" rel="noopener noreferrer" className={`${ACAO_FICHA} text-oliva`}>
              Ver contrato
            </a>
          </p>
        )}
      </CartaoFicha>

      {/* ---------- O que o financeiro registra ---------- */}
      <CartaoFicha
        titulo="No financeiro"
        acao={
          <Link href={`/admin/financeiro?fornecedor=${f.id}`} className={`${ACAO_FICHA} text-oliva`}>
            Abrir
          </Link>
        }
      >
        {conta.despesas.length === 0 ? (
          f.status === "contratado" ? (
            <p className="rounded-sm border border-dashed border-red-800/35 bg-red-50/50 px-4 py-3 text-sm text-red-900">
              Fechado, mas sem despesa lançada no financeiro. Enquanto não houver,
              o que for pago a este fornecedor fica fora do orçamento.
            </p>
          ) : (
            <p className="text-sm text-terra">Nenhuma despesa ligada a este fornecedor ainda.</p>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumeroFicha rotulo="Já pago" valor={reais(conta.pago)} tom="oliva" />
              <NumeroFicha rotulo="Falta" valor={reais(conta.saldo)} tom={conta.saldo > 0 ? "lavanda" : "oliva"} />
            </div>
            <div className="mt-4">
              <Progresso atual={conta.pago} total={conta.contratado} tom={quitado ? "oliva" : "lavanda"} />
            </div>
            <div className="mt-3">
              <LinhaFicha rotulo="Contratado nas despesas" valor={reais(conta.contratado)} />
              <LinhaFicha
                rotulo="Próximo vencimento"
                valor={conta.proximoVencimento ? formatarData(conta.proximoVencimento) ?? "—" : quitado ? "quitado" : "—"}
                alerta={diasParaVencer !== null && diasParaVencer < 0}
              />
            </div>

            {conta.pagamentos.length > 0 && (
              <ul className="mt-3 divide-y divide-terra/15 border-t border-terra/15">
                {conta.pagamentos.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="min-w-0 text-sm text-terra">
                      <span className="block text-oliva">{formatarData(p.paid_at)}</span>
                      <span className="block truncate text-terra/90">
                        {p.despesa}
                        {p.method && ` · ${p.method}`}
                      </span>
                    </span>
                    <span className="titulo-serif shrink-0 text-lg text-oliva tabular-nums lining-nums">
                      {reais(p.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CartaoFicha>

      {f.notes && (
        <CartaoFicha titulo="Observações">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-terra">{f.notes}</p>
        </CartaoFicha>
      )}
    </Ficha>
  );
}
