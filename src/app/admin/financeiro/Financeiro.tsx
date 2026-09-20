"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ROTULOS_DESPESA, type Despesa, type Fornecedor, type StatusDespesa } from "@/lib/tipos";
import { diasAte, formatarData, paraCampo, paraCentavos, reais } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, BarrasCategoria, Indicador, LinhaValor, Progresso, Selo, Vazio } from "@/components/painel";
import { BarrasInterativas, type Fatia } from "@/components/graficos";
import { Icone } from "@/components/Icones";
import { ACAO_FICHA } from "@/components/Ficha";
import { statusReal, TOM_DESPESA, totalPago, valorDeReferencia } from "./despesa";
import { FichaDespesa } from "./FichaDespesa";

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

export function Financeiro({
  despesas,
  fornecedores,
  orcamentoTotal,
  categoriaInicial,
  fornecedorInicial,
}: {
  despesas: Despesa[];
  fornecedores: Fornecedor[];
  orcamentoTotal: number;
  /** Categoria que já chega aberta, quando o clique veio do dashboard. */
  categoriaInicial?: string;
  /** Fornecedor a isolar, quando o clique veio da ficha dele. */
  fornecedorInicial?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  /** A despesa aberta na ficha. Guardamos o id, não o objeto: quando a
   *  lista recarrega depois de um pagamento, a ficha lê a versão nova. */
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhe = despesas.find((d) => d.id === detalheId) ?? null;

  // Quando se chega pela ficha de um fornecedor, a tela mostra só o que é
  // dele — é a pergunta que a pessoa trouxe da outra tela.
  const [filtroFornecedor, setFiltroFornecedor] = useState<string | null>(
    fornecedorInicial ?? null,
  );
  const fornecedorFiltrado = fornecedores.find((f) => f.id === filtroFornecedor) ?? null;

  const visiveis = useMemo(
    () => (filtroFornecedor ? despesas.filter((d) => d.vendor_id === filtroFornecedor) : despesas),
    [despesas, filtroFornecedor],
  );

  // As categorias começam fechadas: o orçamento inteiro aberto vira uma
  // parede de números. A que veio do gráfico já abre.
  const [abertas, setAbertas] = useState<Set<string>>(() => {
    if (categoriaInicial) return new Set([categoriaInicial]);
    // Vindo de um fornecedor, são poucas despesas: abre todas de uma vez.
    if (fornecedorInicial) {
      return new Set(
        despesas.filter((d) => d.vendor_id === fornecedorInicial).map((d) => d.category),
      );
    }
    return new Set();
  });

  function alternarCategoria(categoria: string) {
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(categoria)) nova.delete(categoria);
      else nova.add(categoria);
      return nova;
    });
  }

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
    for (const d of visiveis) {
      const lista = mapa.get(d.category);
      if (lista) lista.push(d);
      else mapa.set(d.category, [d]);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [visiveis]);

  /** Com 14 categorias, abrir uma a uma cansa: um toque abre ou recolhe todas. */
  const todasAbertas = porCategoria.length > 0 && porCategoria.every(([c]) => abertas.has(c));
  function alternarTodas() {
    setAbertas(todasAbertas ? new Set() : new Set(porCategoria.map(([c]) => c)));
  }

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

  /** Devolve se removeu de fato — quem chamou decide o que fechar. */
  async function remover(d: Despesa): Promise<boolean> {
    if (!confirm(`Remover "${d.description}" do orçamento? Os pagamentos lançados nele também somem.`)) return false;
    const supabase = criarClienteNavegador();
    await supabase.from("expenses").delete().eq("id", d.id);
    if (editando === d.id) limpar();
    router.refresh();
    return true;
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

      <AlertasEGraficos
        despesas={despesas}
        aoEscolherCategoria={(categoria) => {
          setAbertas((atual) => new Set(atual).add(categoria));
          document
            .getElementById(`categoria-${encodeURIComponent(categoria)}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {porCategoria.length > 1 && (
              <button
                type="button"
                onClick={alternarTodas}
                className={`${ACAO_FICHA} text-terra hover:text-oliva`}
              >
                {todasAbertas ? "Recolher todas" : "Abrir todas"}
              </button>
            )}
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
          </div>
        }
      >
        {aberto && (
          <form onSubmit={salvar} className="mb-8 space-y-5 rounded-sm border border-terra/20 bg-creme p-6">
            <h3 className="titulo-serif text-xl text-oliva">
              {editando ? "Editar item" : "Novo item do orçamento"}
            </h3>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="d-desc">Descrição</Rotulo>
                <input id="d-desc" required className="campo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="d-cat">Categoria</Rotulo>
                <input id="d-cat" className="campo" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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

        {fornecedorFiltrado && (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="versalete text-xs text-terra">Mostrando só</span>
            <button
              type="button"
              onClick={() => setFiltroFornecedor(null)}
              className="versalete inline-flex min-h-9 items-center gap-2 rounded-full border border-lavanda/40 bg-lavanda/10 px-3 text-xs text-lavanda transition-colors hover:border-lavanda"
            >
              {fornecedorFiltrado.name}
              <Icone nome="fechar" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {visiveis.length === 0 ? (
          <Vazio>
            {fornecedorFiltrado
              ? `Nenhuma despesa lançada para ${fornecedorFiltrado.name} ainda. Crie uma acima para o que for pago a ele entrar no orçamento.`
              : "Nenhum item no orçamento ainda."}
          </Vazio>
        ) : (
          <div className="space-y-9">
            {porCategoria.map(([categoria, itens]) => {
              const catPrevisto = itens.reduce((s, d) => s + d.estimated_cents, 0);
              const catReferencia = itens.reduce((s, d) => s + valorDeReferencia(d), 0);
              const catPago = itens.reduce((s, d) => s + totalPago(d), 0);
              const catQuitada = catReferencia > 0 && catPago >= catReferencia;
              const aberta = abertas.has(categoria);
              // O cabeçalho é uma linha de verdade — nome em corpo de título,
              // números legíveis à direita e uma barra fina do quanto já foi.
              // A versalete em Cormorant 13px que ficava aqui era fio de cabelo.
              return (
                <section key={categoria} id={`categoria-${encodeURIComponent(categoria)}`}>
                  <button
                    type="button"
                    onClick={() => alternarCategoria(categoria)}
                    aria-expanded={aberta}
                    className="mb-4 block w-full border-b border-terra/25 py-3 text-left transition-colors hover:border-oliva/50"
                  >
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <h3 className="titulo-serif flex min-w-0 items-center gap-2.5 text-xl leading-tight text-oliva">
                        <Icone
                          nome="recolher"
                          className={`h-5 w-5 shrink-0 text-terra transition-transform ${aberta ? "-rotate-90" : ""}`}
                        />
                        <span className="min-w-0 truncate">{categoria}</span>
                        <span className="font-corpo shrink-0 text-sm text-terra">
                          {itens.length} {itens.length > 1 ? "itens" : "item"}
                        </span>
                      </h3>
                      <p className="flex flex-wrap gap-x-4 pl-[1.9rem] text-sm text-terra tabular-nums lining-nums sm:pl-0">
                        <span>previsto {reais(catPrevisto)}</span>
                        <span className={catPago > 0 ? "font-medium text-oliva" : ""}>
                          pago {reais(catPago)}
                        </span>
                      </p>
                    </div>
                    {catReferencia > 0 && (
                      <div className="mt-2.5 pl-[1.9rem]">
                        <Progresso
                          atual={catPago}
                          total={catReferencia}
                          tom={catQuitada ? "oliva" : "lavanda"}
                        />
                      </div>
                    )}
                  </button>
                  <ul className="space-y-3" hidden={!aberta}>
                    {itens.map((d) => (
                      <LinhaDespesa
                        key={d.id}
                        despesa={d}
                        fornecedor={fornecedores.find((f) => f.id === d.vendor_id) ?? null}
                        aoAbrir={() => setDetalheId(d.id)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Bloco>

      {detalhe && (
        <FichaDespesa
          despesa={detalhe}
          fornecedor={fornecedores.find((f) => f.id === detalhe.vendor_id) ?? null}
          aoFechar={() => setDetalheId(null)}
          aoEditar={() => {
            setDetalheId(null);
            editar(detalhe);
          }}
          aoRemover={() => {
            void remover(detalhe).then((removeu) => removeu && setDetalheId(null));
          }}
          aoAtualizar={() => router.refresh()}
        />
      )}
    </div>
  );
}

/** Alertas de vencimento e os dois gráficos do financeiro. */
function AlertasEGraficos({
  despesas,
  aoEscolherCategoria,
}: {
  despesas: Despesa[];
  aoEscolherCategoria: (categoria: string) => void;
}) {
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
    .sort((a, b) => b[1].previsto - a[1].previsto);

  const fatiasPorCategoria: Fatia[] = porCategoria.map(([rotulo, v]) => ({
    chave: rotulo,
    rotulo,
    valor: v.previsto,
    detalhe: `${reais(v.pago)} já pagos`,
  }));

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {atrasadas.length > 0 && (
            <div className="rounded-sm border border-red-800/30 bg-red-50/60 px-6 py-5">
              <p className="titulo-serif text-lg text-red-900 lining-nums">
                {atrasadas.length} conta{atrasadas.length > 1 ? "s" : ""} em atraso
              </p>
              <ul className="mt-3 space-y-1.5">
                {atrasadas.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 text-sm text-terra">
                    <span className="min-w-0 truncate">{d.description}</span>
                    <span className="shrink-0 font-medium text-red-900 tabular-nums lining-nums">
                      {reais(valorDeReferencia(d) - totalPago(d))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {proximas.length > 0 && (
            <div className="rounded-sm border border-lavanda/40 bg-lavanda/10 px-6 py-5">
              <p className="titulo-serif text-lg text-lavanda lining-nums">
                {proximas.length} vencendo em 30 dias
              </p>
              <ul className="mt-3 space-y-1.5">
                {proximas.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 text-sm text-terra">
                    <span className="min-w-0 truncate">{d.description}</span>
                    <span className="shrink-0 font-medium text-lavanda tabular-nums lining-nums">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloco
            titulo="Planejado × realizado"
            descricao="Toque numa categoria para abrir as despesas dela, logo abaixo."
          >
            <BarrasInterativas
              itens={fatiasPorCategoria}
              tom={2}
              moeda
              aoClicar={aoEscolherCategoria}
            />
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
  aoAbrir,
}: {
  despesa: Despesa;
  fornecedor: Fornecedor | null;
  aoAbrir: () => void;
}) {
  const pago = totalPago(despesa);
  const referencia = valorDeReferencia(despesa);
  const falta = Math.max(0, referencia - pago);
  const quitado = referencia > 0 && falta === 0;
  const situacao = statusReal(despesa);
  const dias = diasAte(despesa.due_date);
  const vencendo = !quitado && dias !== null && dias <= 30;

  // O cartão é só o resumo: tudo o mais fica na ficha, com espaço. No
  // celular o valor desce para baixo do nome em vez de disputar a linha —
  // era essa disputa que fazia o título atropelar o "pago … falta …".
  return (
    <li>
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Abrir ${despesa.description}`}
        className="block w-full rounded-sm border border-terra/20 bg-creme p-4 text-left transition-colors hover:border-oliva/40 focus-visible:border-oliva sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="titulo-serif text-lg leading-snug text-oliva">{despesa.description}</h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Selo tom={TOM_DESPESA[situacao]}>{ROTULOS_DESPESA[situacao]}</Selo>
              {!quitado && pago > 0 && <Selo tom="lavanda">parcial</Selo>}
              {despesa.installments > 1 && (
                <Selo>{despesa.payments.length}/{despesa.installments} parcelas</Selo>
              )}
            </div>
            {fornecedor && <p className="mt-1.5 truncate text-sm text-terra">{fornecedor.name}</p>}
          </div>

          <div className="flex items-baseline justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
            <p className="titulo-serif text-xl text-oliva tabular-nums lining-nums">{reais(referencia)}</p>
            <p className="text-sm text-terra">
              {despesa.contracted_cents === null ? "previsto" : "contratado"}
            </p>
          </div>
        </div>

        {referencia > 0 && (
          <div className="mt-3">
            <Progresso atual={pago} total={referencia} tom={quitado ? "oliva" : "lavanda"} />
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-terra tabular-nums lining-nums">
            {quitado
              ? "Quitada"
              : pago > 0
                ? `Falta ${reais(falta)}`
                : "Nada pago ainda"}
          </span>
          {despesa.due_date && (
            <span className={vencendo ? "font-medium text-red-800" : "text-terra"}>
              {dias !== null && dias < 0 && !quitado ? "Venceu em " : "Vence em "}
              {formatarData(despesa.due_date)}
              {vencendo && dias !== null && dias >= 0 && ` (${dias}d)`}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}
