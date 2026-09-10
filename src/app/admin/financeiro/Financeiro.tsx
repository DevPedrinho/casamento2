"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ROTULOS_DESPESA, type Despesa, type Fornecedor, type StatusDespesa } from "@/lib/tipos";
import { diasAte, formatarData, paraCampo, paraCentavos, reais } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, BarrasCategoria, Indicador, LinhaValor, Progresso, Selo, Vazio } from "@/components/painel";

/** Soma dos pagamentos já lançados em uma despesa. */
function totalPago(despesa: Despesa): number {
  return (despesa.payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
}

/** O valor que vale para o caixa: o contratado quando existe, senão o previsto. */
function valorDeReferencia(despesa: Despesa): number {
  return despesa.contracted_cents ?? despesa.estimated_cents;
}

const VAZIO = {
  description: "",
  category: "",
  vendor_id: "",
  estimated: "",
  contracted: "",
  due_date: "",
  notes: "",
  status: "previsto" as StatusDespesa,
  payment_method: "",
  installments: "1",
};

/** O status guardado, corrigido pela realidade: quitado é pago; vencido e
 *  não quitado é atrasado. Evita depender de alguém lembrar de atualizar. */
function statusReal(despesa: Despesa): StatusDespesa {
  if (despesa.status === "cancelado") return "cancelado";
  const pago = totalPago(despesa);
  const referencia = valorDeReferencia(despesa);
  if (referencia > 0 && pago >= referencia) return "pago";
  const dias = diasAte(despesa.due_date);
  if (dias !== null && dias < 0) return "atrasado";
  if (despesa.contracted_cents !== null) return "a_pagar";
  return "previsto";
}

const TOM_DESPESA: Record<StatusDespesa, "neutro" | "oliva" | "lavanda" | "alerta" | "apagado"> = {
  previsto: "neutro",
  a_pagar: "lavanda",
  pago: "oliva",
  atrasado: "alerta",
  cancelado: "apagado",
};

export function Financeiro({
  despesas,
  fornecedores,
  orcamentoTotal,
}: {
  despesas: Despesa[];
  fornecedores: Fornecedor[];
  orcamentoTotal: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const resumo = useMemo(() => {
    const previsto = despesas.reduce((s, d) => s + d.estimated_cents, 0);
    const contratado = despesas.reduce((s, d) => s + (d.contracted_cents ?? 0), 0);
    const pago = despesas.reduce((s, d) => s + totalPago(d), 0);
    const comprometido = despesas.reduce((s, d) => s + valorDeReferencia(d), 0);
    const aPagar = Math.max(0, comprometido - pago);

    const vencendo = despesas.filter((d) => {
      const dias = diasAte(d.due_date);
      return dias !== null && dias <= 30 && totalPago(d) < valorDeReferencia(d);
    }).length;

    return { previsto, contratado, pago, comprometido, aPagar, vencendo };
  }, [despesas]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, Despesa[]>();
    for (const d of despesas) {
      const lista = mapa.get(d.category);
      if (lista) lista.push(d);
      else mapa.set(d.category, [d]);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [despesas]);

  function limpar() {
    setForm(VAZIO);
    setEditando(null);
    setErro(null);
  }

  function editar(d: Despesa) {
    setEditando(d.id);
    setAberto(true);
    setErro(null);
    setForm({
      description: d.description,
      category: d.category,
      vendor_id: d.vendor_id ?? "",
      estimated: paraCampo(d.estimated_cents),
      contracted: paraCampo(d.contracted_cents),
      due_date: d.due_date ?? "",
      notes: d.notes ?? "",
      status: d.status,
      payment_method: d.payment_method ?? "",
      installments: String(d.installments ?? 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.description.trim()) {
      setErro("Descreva o item do orçamento.");
      return;
    }
    const previsto = paraCentavos(form.estimated);
    if (form.estimated.trim() && previsto === null) {
      setErro("O valor previsto precisa ser um número.");
      return;
    }
    if (form.contracted.trim() && paraCentavos(form.contracted) === null) {
      setErro("O valor contratado precisa ser um número.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      description: form.description.trim(),
      category: form.category.trim() || "Geral",
      vendor_id: form.vendor_id || null,
      estimated_cents: previsto ?? 0,
      contracted_cents: paraCentavos(form.contracted),
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
      status: form.status,
      payment_method: form.payment_method.trim() || null,
      installments: Math.max(1, Number(form.installments) || 1),
    };

    const { error } = editando
      ? await supabase.from("expenses").update(dados).eq("id", editando)
      : await supabase.from("expenses").insert(dados);
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    limpar();
    setAberto(false);
    router.refresh();
  }

  async function remover(d: Despesa) {
    if (!confirm(`Remover "${d.description}" do orçamento? Os pagamentos lançados nele também somem.`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("expenses").delete().eq("id", d.id);
    if (editando === d.id) limpar();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Previsto" valor={reais(resumo.previsto)} />
        <Indicador rotulo="Contratado" valor={reais(resumo.contratado)} tom="lavanda" />
        <Indicador rotulo="Já pago" valor={reais(resumo.pago)} tom="oliva" />
        <Indicador
          rotulo="Falta pagar"
          valor={reais(resumo.aPagar)}
          tom={resumo.aPagar > 0 ? "alerta" : "oliva"}
          detalhe={resumo.vencendo > 0 ? `${resumo.vencendo} vencendo em 30 dias` : undefined}
        />
      </div>

      <AlertasEGraficos despesas={despesas} />

      <OrcamentoTotal
        total={orcamentoTotal}
        comprometido={resumo.comprometido}
        pago={resumo.pago}
        aoSalvar={() => router.refresh()}
      />

      <Bloco
        titulo="Orçamento"
        descricao="Previsto é a estimativa; contratado é o que foi fechado. Lance os pagamentos conforme forem saindo."
        acao={
          <Botao
            type="button"
            variante="contorno"
            onClick={() => {
              if (aberto) limpar();
              setAberto((v) => !v);
            }}
          >
            {aberto ? "Fechar" : "Novo item"}
          </Botao>
        }
      >
        {aberto && (
          <form onSubmit={salvar} className="mb-8 space-y-5 rounded-sm border border-terra/20 bg-creme p-6">
            <h3 className="titulo-serif text-xl text-oliva">
              {editando ? "Editar item" : "Novo item do orçamento"}
            </h3>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="d-desc">Descrição</Rotulo>
                <input id="d-desc" required className="campo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="d-cat">Categoria</Rotulo>
                <input id="d-cat" className="campo" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="d-prev">Previsto (R$)</Rotulo>
                <input id="d-prev" inputMode="decimal" className="campo" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="d-contr">Contratado (R$)</Rotulo>
                <input id="d-contr" inputMode="decimal" className="campo" placeholder="Ao fechar" value={form.contracted} onChange={(e) => setForm({ ...form, contracted: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="d-venc">Vencimento</Rotulo>
                <input id="d-venc" type="date" className="campo" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="d-status">Status</Rotulo>
                <select id="d-status" className="campo" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusDespesa })}>
                  {(Object.keys(ROTULOS_DESPESA) as StatusDespesa[]).map((st) => (
                    <option key={st} value={st}>{ROTULOS_DESPESA[st]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Rotulo htmlFor="d-forma">Forma de pagamento</Rotulo>
                <input id="d-forma" className="campo" placeholder="Pix, cartão, boleto…"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="d-parc">Parcelas</Rotulo>
                <input id="d-parc" inputMode="numeric" className="campo" value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })} />
              </div>
            </div>

            <div>
              <Rotulo htmlFor="d-forn">Fornecedor</Rotulo>
              <select id="d-forn" className="campo" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
                <option value="">Nenhum</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Rotulo htmlFor="d-notas">Observações</Rotulo>
              <textarea id="d-notas" rows={2} className="campo resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Botao type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar"}
              </Botao>
              {editando && (
                <Botao type="button" variante="contorno" onClick={limpar}>
                  Cancelar
                </Botao>
              )}
            </div>
          </form>
        )}

        {despesas.length === 0 ? (
          <Vazio>Nenhum item no orçamento ainda.</Vazio>
        ) : (
          <div className="space-y-9">
            {porCategoria.map(([categoria, itens]) => {
              const catPrevisto = itens.reduce((s, d) => s + d.estimated_cents, 0);
              const catPago = itens.reduce((s, d) => s + totalPago(d), 0);
              return (
                <section key={categoria}>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-terra/20 pb-2">
                    <h3 className="versalete titulo-serif text-xs text-lavanda">{categoria}</h3>
                    <p className="text-sm text-terra tabular-nums lining-nums">
                      previsto {reais(catPrevisto)} · pago {reais(catPago)}
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {itens.map((d) => (
                      <LinhaDespesa
                        key={d.id}
                        despesa={d}
                        fornecedor={fornecedores.find((f) => f.id === d.vendor_id) ?? null}
                        pagando={pagandoId === d.id}
                        aoAbrirPagamento={() => setPagandoId(pagandoId === d.id ? null : d.id)}
                        aoEditar={() => editar(d)}
                        aoRemover={() => remover(d)}
                        aoSalvarPagamento={() => {
                          setPagandoId(null);
                          router.refresh();
                        }}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Bloco>
    </div>
  );
}

/** Alertas de vencimento e os dois gráficos do financeiro. */
function AlertasEGraficos({ despesas }: { despesas: Despesa[] }) {
  const atrasadas = despesas.filter((d) => statusReal(d) === "atrasado");
  const proximas = despesas.filter((d) => {
    const dias = diasAte(d.due_date);
    return dias !== null && dias >= 0 && dias <= 30 && statusReal(d) !== "pago";
  });

  const porCategoria = [...despesas.reduce((mapa, d) => {
    const atual = mapa.get(d.category) ?? { previsto: 0, pago: 0 };
    mapa.set(d.category, {
      previsto: atual.previsto + d.estimated_cents,
      pago: atual.pago + totalPago(d),
    });
    return mapa;
  }, new Map<string, { previsto: number; pago: number }>())]
    .filter(([, v]) => v.previsto > 0 || v.pago > 0)
    .sort((a, b) => b[1].previsto - a[1].previsto)
    .map(([rotulo, v]) => ({ rotulo, valor: v.pago, secundario: v.previsto }));

  // Evolução: pagamentos acumulados mês a mês.
  const evolucao = (() => {
    const pagamentos = despesas
      .flatMap((d) => d.payments ?? [])
      .sort((a, b) => a.paid_at.localeCompare(b.paid_at));
    let acumulado = 0;
    const meses = new Map<string, number>();
    for (const p of pagamentos) {
      acumulado += p.amount_cents;
      meses.set(p.paid_at.slice(0, 7), acumulado);
    }
    return [...meses.entries()].map(([mes, valor]) => ({
      rotulo: new Date(`${mes}-02`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      valor,
    }));
  })();

  if (atrasadas.length === 0 && proximas.length === 0 && porCategoria.length === 0) return null;

  return (
    <div className="space-y-6">
      {(atrasadas.length > 0 || proximas.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {atrasadas.length > 0 && (
            <div className="rounded-sm border border-red-800/30 bg-red-50/60 px-6 py-5">
              <p className="versalete text-xs text-red-900">
                {atrasadas.length} conta{atrasadas.length > 1 ? "s" : ""} em atraso
              </p>
              <ul className="mt-3 space-y-1.5">
                {atrasadas.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 text-sm text-terra">
                    <span className="min-w-0 truncate">{d.description}</span>
                    <span className="shrink-0 tabular-nums lining-nums">
                      {reais(valorDeReferencia(d) - totalPago(d))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {proximas.length > 0 && (
            <div className="rounded-sm border border-lavanda/40 bg-lavanda/10 px-6 py-5">
              <p className="versalete text-xs text-lavanda">
                {proximas.length} vencendo em 30 dias
              </p>
              <ul className="mt-3 space-y-1.5">
                {proximas.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 text-sm text-terra">
                    <span className="min-w-0 truncate">{d.description}</span>
                    <span className="shrink-0 tabular-nums lining-nums">
                      {formatarData(d.due_date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {porCategoria.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Bloco titulo="Planejado × realizado" descricao="Barra cheia é o pago; a clara, o previsto.">
            <BarrasCategoria itens={porCategoria} formatar={reais} />
          </Bloco>

          <Bloco titulo="Evolução dos pagamentos" descricao="Quanto já saiu do bolso, acumulado por mês.">
            {evolucao.length === 0 ? (
              <Vazio>Nenhum pagamento lançado ainda.</Vazio>
            ) : (
              <BarrasCategoria itens={evolucao} formatar={reais} />
            )}
          </Bloco>
        </div>
      )}
    </div>
  );
}

function OrcamentoTotal({
  total,
  comprometido,
  pago,
  aoSalvar,
}: {
  total: number;
  comprometido: number;
  pago: number;
  aoSalvar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(paraCampo(total));
  const [salvando, setSalvando] = useState(false);

  const sobra = total - comprometido;
  const estourou = total > 0 && sobra < 0;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = paraCentavos(valor) ?? 0;
    setSalvando(true);
    const supabase = criarClienteNavegador();
    await supabase
      .from("wedding_settings")
      .update({ budget_total_cents: centavos })
      .eq("id", true);
    setSalvando(false);
    setEditando(false);
    aoSalvar();
  }

  return (
    <div className="rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="titulo-serif text-2xl text-oliva">Orçamento total</h2>
          <p className="mt-1.5 text-sm text-terra">
            Quanto vocês planejam gastar no casamento inteiro.
          </p>
        </div>
        {!editando && (
          <Botao type="button" variante="contorno" onClick={() => setEditando(true)}>
            {total > 0 ? "Alterar" : "Definir"}
          </Botao>
        )}
      </div>

      {editando ? (
        <form onSubmit={salvar} className="mt-6 flex flex-wrap items-end gap-4">
          <div className="min-w-52 flex-1">
            <Rotulo htmlFor="orc-total">Valor total (R$)</Rotulo>
            <input
              id="orc-total"
              inputMode="decimal"
              className="campo"
              placeholder="80000,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
          <Botao type="button" variante="contorno" onClick={() => setEditando(false)}>
            Cancelar
          </Botao>
        </form>
      ) : total === 0 ? (
        <p className="titulo-serif mt-6 text-base text-terra italic">
          Ainda não definido — sem ele não dá para saber se o planejamento cabe no bolso.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          <Progresso
            atual={comprometido}
            total={total}
            rotulo={`${reais(comprometido)} comprometidos de ${reais(total)}`}
            tom={estourou ? "alerta" : "oliva"}
          />
          <div>
            <LinhaValor rotulo="Orçamento total" centavos={total} />
            <LinhaValor rotulo="Comprometido (contratado ou previsto)" centavos={comprometido} />
            <LinhaValor rotulo="Já pago" centavos={pago} />
            <LinhaValor
              rotulo={estourou ? "Passou do orçamento em" : "Ainda cabe"}
              centavos={Math.abs(sobra)}
              destaque
            />
          </div>
          {estourou && (
            <Aviso tipo="erro">
              O que já está comprometido passou do orçamento total. Vale revisar as categorias
              mais pesadas antes de fechar novos contratos.
            </Aviso>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaDespesa({
  despesa,
  fornecedor,
  pagando,
  aoAbrirPagamento,
  aoEditar,
  aoRemover,
  aoSalvarPagamento,
}: {
  despesa: Despesa;
  fornecedor: Fornecedor | null;
  pagando: boolean;
  aoAbrirPagamento: () => void;
  aoEditar: () => void;
  aoRemover: () => void;
  aoSalvarPagamento: () => void;
}) {
  const pago = totalPago(despesa);
  const referencia = valorDeReferencia(despesa);
  const falta = Math.max(0, referencia - pago);
  const quitado = referencia > 0 && falta === 0;
  const dias = diasAte(despesa.due_date);
  const vencendo = !quitado && dias !== null && dias <= 30;

  return (
    <li className="rounded-sm border border-terra/20 bg-creme p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="titulo-serif text-lg text-oliva">{despesa.description}</h4>
            <Selo tom={TOM_DESPESA[statusReal(despesa)]}>
              {ROTULOS_DESPESA[statusReal(despesa)]}
            </Selo>
            {!quitado && pago > 0 && <Selo tom="lavanda">parcial</Selo>}
            {despesa.installments > 1 && (
              <Selo>{despesa.payments.length}/{despesa.installments} parcelas</Selo>
            )}
          </div>

          {fornecedor && <p className="mt-1.5 text-sm text-terra">{fornecedor.name}</p>}
          {despesa.notes && <p className="mt-1.5 text-sm text-terra/85">{despesa.notes}</p>}

          {despesa.due_date && (
            <p className={`mt-1.5 text-sm ${vencendo ? "font-medium text-red-800" : "text-terra"}`}>
              Vence em {formatarData(despesa.due_date)}
              {vencendo && dias !== null && (dias < 0 ? " (vencido)" : ` (${dias}d)`)}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="titulo-serif text-xl text-oliva tabular-nums lining-nums">{reais(referencia)}</p>
          <p className="mt-1 text-sm text-terra tabular-nums lining-nums">
            {despesa.contracted_cents === null ? "previsto" : "contratado"}
          </p>
          {pago > 0 && (
            <p className="mt-1.5 text-sm text-terra tabular-nums lining-nums">
              pago {reais(pago)} · falta {reais(falta)}
            </p>
          )}
        </div>
      </div>

      {referencia > 0 && (
        <div className="mt-4">
          <Progresso atual={pago} total={referencia} tom={quitado ? "oliva" : "lavanda"} />
        </div>
      )}

      {despesa.payments.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-terra/15 pt-3">
          {despesa.payments
            .slice()
            .sort((a, b) => a.paid_at.localeCompare(b.paid_at))
            .map((p) => (
              <li key={p.id} className="flex justify-between gap-4 text-sm text-terra">
                <span>
                  {formatarData(p.paid_at)}
                  {p.method && ` · ${p.method}`}
                </span>
                <span className="tabular-nums lining-nums">{reais(p.amount_cents)}</span>
              </li>
            ))}
        </ul>
      )}

      {pagando ? (
        <FormPagamento despesaId={despesa.id} sugestao={falta} aoSalvar={aoSalvarPagamento} aoCancelar={aoAbrirPagamento} />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 border-t border-terra/15">
          <button type="button" onClick={aoAbrirPagamento} className="versalete inline-flex min-h-11 items-center text-xs text-oliva underline underline-offset-4">
            Lançar pagamento
          </button>
          <button type="button" onClick={aoEditar} className="versalete inline-flex min-h-11 items-center text-xs text-terra underline underline-offset-4">
            Editar
          </button>
          <button type="button" onClick={aoRemover} className="versalete inline-flex min-h-11 items-center text-xs text-red-800 underline underline-offset-4">
            Remover
          </button>
        </div>
      )}
    </li>
  );
}

function FormPagamento({
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
      <div className="grid gap-4 sm:grid-cols-3">
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
