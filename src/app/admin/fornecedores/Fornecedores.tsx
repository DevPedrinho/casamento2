"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  CATEGORIAS_FORNECEDOR,
  ETAPAS_FUNIL,
  ROTULOS_FORNECEDOR,
  type Despesa,
  type Fornecedor,
  type StatusFornecedor,
} from "@/lib/tipos";
import { diasAte, formatarData, linkSeguro, paraCampo, paraCentavos, reais } from "@/lib/formato";
import {
  contasPorFornecedor,
  CONTA_VAZIA,
  type ContaDoFornecedor,
} from "@/lib/contasDoFornecedor";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { QuadroRolavel } from "@/components/QuadroRolavel";
import { FichaFornecedor, TOM_ETAPA } from "./FichaFornecedor";

/** Quem pede retorno nos próximos 7 dias (ou já passou) e ainda está em jogo. */
function retornaEm7Dias(f: Fornecedor): boolean {
  const dias = diasAte(f.next_action_at);
  return dias !== null && dias <= 7 && f.status !== "contratado" && f.status !== "descartado";
}

/** Duas formas de olhar o mesmo funil. A lista é a padrão; o quadro, opção. */
const VISOES = ["lista", "kanban"] as const;
type Visao = (typeof VISOES)[number];
const ROTULOS_VISAO: Record<Visao, string> = { lista: "Lista", kanban: "Kanban" };

const VAZIO = {
  name: "",
  company: "",
  contract_url: "",
  category: "",
  status: "prospecto" as StatusFornecedor,
  contact_name: "",
  phone: "",
  email: "",
  instagram: "",
  website: "",
  quoted: "",
  agreed: "",
  next_action: "",
  next_action_at: "",
  notes: "",
};

export function Fornecedores({
  fornecedores,
  despesas,
  etapaInicial,
}: {
  fornecedores: Fornecedor[];
  despesas: Despesa[];
  /** Vinda do dashboard pela URL: a lista já abre naquela etapa do funil. */
  etapaInicial?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [etapaVisivel, setEtapaVisivel] = useState<StatusFornecedor | "todas">(() =>
    ETAPAS_FUNIL.includes(etapaInicial as StatusFornecedor) ? (etapaInicial as StatusFornecedor) : "todas",
  );
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhe = fornecedores.find((f) => f.id === detalheId) ?? null;
  const [visao, setVisao] = useState<Visao>("lista");
  /** Recorte ligado pelo indicador "Retornar em 7 dias". */
  const [soRetornos, setSoRetornos] = useState(false);
  /** O cartão que está trocando de etapa agora: fica apagado até gravar. */
  const [movendoId, setMovendoId] = useState<string | null>(null);

  /** O que o financeiro sabe de cada um: contratado, pago e os lançamentos. */
  const contas = useMemo(() => contasPorFornecedor(despesas), [despesas]);

  const resumo = useMemo(() => {
    const contratados = fornecedores.filter((f) => f.status === "contratado");
    const emNegociacao = fornecedores.filter((f) =>
      ["contatado", "proposta", "negociando"].includes(f.status),
    );
    const totalFechado = contratados.reduce((s, f) => s + (f.agreed_cents ?? 0), 0);
    const proximas = fornecedores.filter(retornaEm7Dias).length;
    const totalPago = [...contas.values()].reduce((s, c) => s + c.pago, 0);

    return {
      total: fornecedores.length,
      contratados: contratados.length,
      emNegociacao: emNegociacao.length,
      totalFechado,
      totalPago,
      aPagar: Math.max(0, totalFechado - totalPago),
      proximas,
    };
  }, [contas, fornecedores]);

  const porEtapa = useMemo(() => {
    const base = soRetornos ? fornecedores.filter(retornaEm7Dias) : fornecedores;
    return ETAPAS_FUNIL.map((etapa) => ({
      etapa,
      itens: base.filter((f) => f.status === etapa),
    })).filter((g) => (etapaVisivel === "todas" || g.etapa === etapaVisivel) && (!soRetornos || g.itens.length > 0));
  }, [fornecedores, etapaVisivel, soRetornos]);

  function limpar() {
    setForm(VAZIO);
    setEditando(null);
    setErro(null);
  }

  function editar(f: Fornecedor) {
    setEditando(f.id);
    setAberto(true);
    setErro(null);
    setForm({
      name: f.name,
      company: f.company ?? "",
      contract_url: f.contract_url ?? "",
      category: f.category,
      status: f.status,
      contact_name: f.contact_name ?? "",
      phone: f.phone ?? "",
      email: f.email ?? "",
      instagram: f.instagram ?? "",
      website: f.website ?? "",
      quoted: paraCampo(f.quoted_cents),
      agreed: paraCampo(f.agreed_cents),
      next_action: f.next_action ?? "",
      next_action_at: f.next_action_at ?? "",
      notes: f.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.name.trim()) {
      setErro("Dê um nome ao fornecedor.");
      return;
    }
    if (form.quoted.trim() && paraCentavos(form.quoted) === null) {
      setErro("O valor do orçamento precisa ser um número.");
      return;
    }
    if (form.agreed.trim() && paraCentavos(form.agreed) === null) {
      setErro("O valor fechado precisa ser um número.");
      return;
    }
    if (form.website.trim() && !linkSeguro(form.website)) {
      setErro("O site precisa começar com https://");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      contract_url: form.contract_url.trim() || null,
      category: form.category.trim() || "Geral",
      status: form.status,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      instagram: form.instagram.trim().replace(/^@/, "") || null,
      website: form.website.trim() || null,
      quoted_cents: paraCentavos(form.quoted),
      agreed_cents: paraCentavos(form.agreed),
      next_action: form.next_action.trim() || null,
      next_action_at: form.next_action_at || null,
      notes: form.notes.trim() || null,
    };

    const { error } = editando
      ? await supabase.from("vendors").update(dados).eq("id", editando)
      : await supabase.from("vendors").insert(dados);
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    limpar();
    setAberto(false);
    router.refresh();
  }

  async function moverEtapa(f: Fornecedor, status: StatusFornecedor) {
    if (f.status === status) return;
    setMovendoId(f.id);
    const supabase = criarClienteNavegador();
    await supabase.from("vendors").update({ status }).eq("id", f.id);
    setMovendoId(null);
    router.refresh();
  }

  async function remover(f: Fornecedor): Promise<boolean> {
    if (!confirm(`Remover ${f.name} do funil?`)) return false;
    const supabase = criarClienteNavegador();
    await supabase.from("vendors").delete().eq("id", f.id);
    if (editando === f.id) limpar();
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="No funil" valor={resumo.total} />
        <Indicador rotulo="Contratados" valor={resumo.contratados} tom="oliva" />
        <Indicador rotulo="Em negociação" valor={resumo.emNegociacao} tom="lavanda" />
        <Indicador
          rotulo="Retornar em 7 dias"
          valor={resumo.proximas}
          tom={resumo.proximas > 0 ? "alerta" : "neutro"}
          aoClicar={
            resumo.proximas > 0
              ? () => {
                  setVisao("lista");
                  setEtapaVisivel("todas");
                  setSoRetornos(true);
                  document.getElementById("lista-fornecedores")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              : undefined
          }
        />
      </div>

      {resumo.totalFechado > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Indicador rotulo="Fechado em contratos" valor={reais(resumo.totalFechado)} />
          <Indicador
            rotulo="Já pago"
            valor={reais(resumo.totalPago)}
            tom="oliva"
            detalhe="somado dos lançamentos"
          />
          <Indicador
            rotulo="Ainda a pagar"
            valor={reais(resumo.aPagar)}
            tom={resumo.aPagar > 0 ? "lavanda" : "oliva"}
          />
        </div>
      )}

      <div id="lista-fornecedores" className="scroll-mt-4" />
      <Bloco
        titulo="Fornecedores"
        descricao={
          visao === "kanban"
            ? "Arraste o cartão para outra etapa — no celular, use as setas. Toque no nome para abrir a ficha."
            : "Do primeiro contato ao contrato fechado. Toque no fornecedor para abrir a ficha."
        }
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Forma de ver o funil"
              className="inline-flex rounded-full border border-terra/30 bg-creme p-0.5"
            >
              {VISOES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisao(v)}
                  aria-pressed={visao === v}
                  className={`versalete titulo-serif inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors ${
                    visao === v ? "bg-oliva text-creme-claro" : "text-terra hover:text-oliva"
                  }`}
                >
                  <Icone nome={v === "lista" ? "fornecedores" : "kanban"} className="h-4 w-4" />
                  {ROTULOS_VISAO[v]}
                </button>
              ))}
            </div>
            <Botao
              type="button"
              variante="contorno"
              onClick={() => {
                if (aberto) limpar();
                setAberto((v) => !v);
              }}
            >
              {aberto ? "Fechar" : "Novo fornecedor"}
            </Botao>
          </div>
        }
      >
        {aberto && (
          <form onSubmit={salvar} className="mb-8 space-y-5 rounded-sm border border-terra/20 bg-creme p-6">
            <h3 className="titulo-serif text-xl text-oliva">
              {editando ? "Editar fornecedor" : "Novo fornecedor"}
            </h3>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="f-nome">Nome</Rotulo>
                <input id="f-nome" required className="campo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-cat">Categoria</Rotulo>
                <select id="f-cat" className="campo" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">—</option>
                  {CATEGORIAS_FORNECEDOR.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Rotulo htmlFor="f-status">Etapa</Rotulo>
                <select id="f-status" className="campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusFornecedor })}>
                  {ETAPAS_FUNIL.map((s) => (
                    <option key={s} value={s}>{ROTULOS_FORNECEDOR[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="f-contato">Pessoa de contato</Rotulo>
                <input id="f-contato" className="campo" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-fone">WhatsApp</Rotulo>
                <input id="f-fone" className="campo" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-email">E-mail</Rotulo>
                <input id="f-email" type="email" className="campo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="f-insta">Instagram</Rotulo>
                <input id="f-insta" className="campo" placeholder="@perfil" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-site">Site</Rotulo>
                <input id="f-site" type="url" className="campo" placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="f-empresa">Empresa / razão social</Rotulo>
                <input id="f-empresa" className="campo" value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-contrato">Link do contrato</Rotulo>
                <input id="f-contrato" type="url" className="campo" placeholder="https://…"
                  value={form.contract_url}
                  onChange={(e) => setForm({ ...form, contract_url: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="f-orc">Orçamento recebido (R$)</Rotulo>
                <input id="f-orc" inputMode="decimal" className="campo" placeholder="12000,00" value={form.quoted} onChange={(e) => setForm({ ...form, quoted: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-fech">Valor fechado (R$)</Rotulo>
                <input id="f-fech" inputMode="decimal" className="campo" placeholder="Só quando contratar" value={form.agreed} onChange={(e) => setForm({ ...form, agreed: e.target.value })} />
              </div>
              <p className="self-end text-xs leading-relaxed text-terra/90">
                O quanto já foi pago não se digita aqui — ele é somado dos
                lançamentos do financeiro, e por isso nunca fica desencontrado.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="f-acao">Próximo passo</Rotulo>
                <input id="f-acao" className="campo" placeholder="Pedir orçamento, agendar visita…" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-acao-data">Quando</Rotulo>
                <input id="f-acao-data" type="date" className="campo" value={form.next_action_at} onChange={(e) => setForm({ ...form, next_action_at: e.target.value })} />
              </div>
            </div>

            <div>
              <Rotulo htmlFor="f-notas">Observações</Rotulo>
              <textarea id="f-notas" rows={3} className="campo resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

        {soRetornos && visao === "lista" && (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="versalete text-xs text-terra">Mostrando só</span>
            <button
              type="button"
              onClick={() => setSoRetornos(false)}
              className="versalete inline-flex min-h-9 items-center gap-2 rounded-full border border-red-800/40 bg-red-50/60 px-3 text-xs text-red-900 transition-colors hover:border-red-800"
            >
              Retornos em 7 dias
              <Icone nome="fechar" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {visao === "lista" && (
          <div className="mb-7 flex flex-wrap gap-2.5">
            <FiltroEtapa ativo={etapaVisivel === "todas"} onClick={() => setEtapaVisivel("todas")}>
              Todas
            </FiltroEtapa>
            {ETAPAS_FUNIL.map((etapa) => (
              <FiltroEtapa key={etapa} ativo={etapaVisivel === etapa} onClick={() => setEtapaVisivel(etapa)}>
                {ROTULOS_FORNECEDOR[etapa]}
              </FiltroEtapa>
            ))}
          </div>
        )}

        {fornecedores.length === 0 ? (
          <Vazio>Nenhum fornecedor no funil ainda. Comece adicionando os que já pesquisaram.</Vazio>
        ) : visao === "kanban" ? (
          <QuadroFornecedores
            fornecedores={fornecedores}
            contas={contas}
            movendoId={movendoId}
            aoMover={moverEtapa}
            aoAbrir={(f) => setDetalheId(f.id)}
          />
        ) : (
          <div className="space-y-9">
            {porEtapa.map(({ etapa, itens }) => (
              <section key={etapa}>
                <h3 className="versalete titulo-serif mb-4 border-b border-terra/20 pb-2 text-xs text-lavanda">
                  {ROTULOS_FORNECEDOR[etapa]} · {itens.length}
                </h3>
                {itens.length === 0 ? (
                  <p className="text-sm text-terra/85">Ninguém nesta etapa.</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {itens.map((f) => (
                      <CartaoFornecedor
                        key={f.id}
                        fornecedor={f}
                        conta={contas.get(f.id) ?? CONTA_VAZIA}
                        aoAbrir={() => setDetalheId(f.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </Bloco>

      {detalhe && (
        <FichaFornecedor
          fornecedor={detalhe}
          conta={contas.get(detalhe.id) ?? CONTA_VAZIA}
          aoFechar={() => setDetalheId(null)}
          aoEditar={() => {
            setDetalheId(null);
            editar(detalhe);
          }}
          aoRemover={() => {
            void remover(detalhe).then((removeu) => removeu && setDetalheId(null));
          }}
          aoMover={(s) => moverEtapa(detalhe, s)}
        />
      )}
    </div>
  );
}

/**
 * O mesmo funil em seis colunas, uma por etapa. Arrastar e soltar muda a
 * etapa no desktop; as setas do cartão fazem o mesmo no toque.
 */
function QuadroFornecedores({
  fornecedores,
  contas,
  movendoId,
  aoMover,
  aoAbrir,
}: {
  fornecedores: Fornecedor[];
  contas: Map<string, ContaDoFornecedor>;
  movendoId: string | null;
  aoMover: (fornecedor: Fornecedor, para: StatusFornecedor) => void;
  aoAbrir: (fornecedor: Fornecedor) => void;
}) {
  const [colunaAlvo, setColunaAlvo] = useState<StatusFornecedor | null>(null);

  function soltar(evento: DragEvent<HTMLElement>, etapa: StatusFornecedor) {
    evento.preventDefault();
    setColunaAlvo(null);
    const id = evento.dataTransfer.getData("text/plain");
    const f = fornecedores.find((x) => x.id === id);
    if (f) aoMover(f, etapa);
  }

  return (
    <QuadroRolavel>
      <div className="flex min-w-full gap-4">
        {ETAPAS_FUNIL.map((etapa) => {
          const itens = fornecedores.filter((f) => f.status === etapa);
          const fechado = itens.reduce((s, f) => s + (f.agreed_cents ?? 0), 0);
          // Quem foi descartado quase nunca tem valor fechado: o que ele
          // valia é o orçamento que mandou. A soma dá ideia do que ficou
          // fora — não é economia exata, que seria a diferença para o
          // contratado da mesma categoria.
          const recusado = itens.reduce((s, f) => s + (f.quoted_cents ?? f.agreed_cents ?? 0), 0);
          const totalDaColuna =
            etapa === "contratado" && fechado > 0
              ? `${reais(fechado)} fechados`
              : etapa === "descartado" && recusado > 0
                ? `${reais(recusado)} em orçamentos recusados`
                : "";
          return (
            <section
              key={etapa}
              aria-label={ROTULOS_FORNECEDOR[etapa]}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setColunaAlvo(etapa);
              }}
              onDragLeave={() => setColunaAlvo((atual) => (atual === etapa ? null : atual))}
              onDrop={(e) => soltar(e, etapa)}
              className={`flex min-w-72 flex-1 shrink flex-col rounded-sm border p-3 transition-colors ${
                colunaAlvo === etapa ? "border-oliva bg-oliva/5" : "border-terra/20 bg-creme-claro/60"
              }`}
            >
              <h3 className="versalete titulo-serif mb-1 flex items-center justify-between px-1 text-xs text-lavanda">
                <span>{ROTULOS_FORNECEDOR[etapa]}</span>
                <span className="text-terra/85 lining-nums">{itens.length}</span>
              </h3>
              <p className="mb-3 min-h-5 px-1 text-xs text-terra/85 tabular-nums lining-nums">
                {totalDaColuna}
              </p>

              {itens.length === 0 ? (
                <p className="px-1 py-8 text-center text-sm text-terra/85">Solte um fornecedor aqui.</p>
              ) : (
                <ul className="space-y-2.5">
                  {itens.map((f) => (
                    <CartaoKanban
                      key={f.id}
                      fornecedor={f}
                      conta={contas.get(f.id) ?? CONTA_VAZIA}
                      salvando={movendoId === f.id}
                      aoMover={(para) => aoMover(f, para)}
                      aoAbrir={() => aoAbrir(f)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </QuadroRolavel>
  );
}

function CartaoKanban({
  fornecedor: f,
  conta,
  salvando,
  aoMover,
  aoAbrir,
}: {
  fornecedor: Fornecedor;
  conta: ContaDoFornecedor;
  salvando: boolean;
  aoMover: (para: StatusFornecedor) => void;
  aoAbrir: () => void;
}) {
  const dias = diasAte(f.next_action_at);
  const urgente = dias !== null && dias <= 7 && f.status !== "contratado" && f.status !== "descartado";
  const semDespesa = f.status === "contratado" && conta.despesas.length === 0;
  const quitado = conta.despesas.length > 0 && conta.saldo === 0;
  const valor = f.agreed_cents ?? f.quoted_cents;
  const posicao = ETAPAS_FUNIL.indexOf(f.status);
  const anterior = ETAPAS_FUNIL[posicao - 1] as StatusFornecedor | undefined;
  const proxima = ETAPAS_FUNIL[posicao + 1] as StatusFornecedor | undefined;

  const seta =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-terra/30 text-terra transition-colors hover:border-oliva hover:text-oliva disabled:opacity-30 disabled:hover:border-terra/30 disabled:hover:text-terra";

  return (
    <li>
      <article
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", f.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`cursor-grab rounded-sm border border-terra/20 bg-creme px-4 py-3 active:cursor-grabbing ${
          salvando ? "opacity-50" : ""
        }`}
      >
        <button type="button" onClick={aoAbrir} className="block w-full text-left">
          <p className="titulo-serif text-base leading-snug text-oliva">{f.name}</p>
          <p className="mt-0.5 truncate text-xs text-terra/85">
            {[f.category, f.contact_name ?? f.company].filter(Boolean).join(" · ")}
          </p>

          <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-terra/85">
            {valor !== null && (
              <span className="titulo-serif text-base text-oliva tabular-nums lining-nums">
                {reais(valor)}
                <span className="font-corpo text-xs text-terra/85">
                  {" "}{f.agreed_cents !== null ? "fechado" : "orçamento"}
                </span>
              </span>
            )}
            {quitado && <Selo tom="oliva">quitado</Selo>}
            {semDespesa && <Selo tom="alerta">sem despesa</Selo>}
          </span>

          {f.next_action && (
            <span className={`mt-2 line-clamp-2 text-xs ${urgente ? "font-medium text-red-800" : "text-terra/85"}`}>
              Próximo: {f.next_action}
              {f.next_action_at && ` — ${formatarData(f.next_action_at)}`}
            </span>
          )}
        </button>

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            disabled={!anterior || salvando}
            onClick={() => anterior && aoMover(anterior)}
            aria-label={anterior ? `Mover para ${ROTULOS_FORNECEDOR[anterior]}` : "Já está na primeira etapa"}
            className={seta}
          >
            ←
          </button>
          <button
            type="button"
            disabled={!proxima || salvando}
            onClick={() => proxima && aoMover(proxima)}
            aria-label={proxima ? `Mover para ${ROTULOS_FORNECEDOR[proxima]}` : "Já está na última etapa"}
            className={seta}
          >
            →
          </button>
        </div>
      </article>
    </li>
  );
}

function FiltroEtapa({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`versalete titulo-serif inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors ${
        ativo
          ? "border-oliva bg-oliva text-creme-claro"
          : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * O cartão da lista é só o resumo: nome, etapa, o valor que importa e o
 * próximo passo. Tudo o mais — contato, conta no financeiro, ações — mora
 * na ficha, que abre ao tocar.
 */
function CartaoFornecedor({
  fornecedor: f,
  conta,
  aoAbrir,
}: {
  fornecedor: Fornecedor;
  conta: ContaDoFornecedor;
  aoAbrir: () => void;
}) {
  const dias = diasAte(f.next_action_at);
  const urgente = dias !== null && dias <= 7 && f.status !== "contratado" && f.status !== "descartado";
  const semDespesa = f.status === "contratado" && conta.despesas.length === 0;
  const quitado = conta.despesas.length > 0 && conta.saldo === 0;
  const valor = f.agreed_cents ?? f.quoted_cents;

  return (
    <li>
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Abrir ${f.name}`}
        className="block w-full rounded-sm border border-terra/20 bg-creme p-4 text-left transition-colors hover:border-oliva/40 focus-visible:border-oliva sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="titulo-serif text-lg leading-snug text-oliva">{f.name}</h4>
            <p className="mt-1 truncate text-sm text-terra">
              {[f.category, f.contact_name ?? f.company].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Selo tom={TOM_ETAPA[f.status]}>{ROTULOS_FORNECEDOR[f.status]}</Selo>
              {quitado && <Selo tom="oliva">quitado</Selo>}
              {semDespesa && <Selo tom="alerta">sem despesa</Selo>}
            </div>
          </div>

          {valor !== null && (
            <div className="flex items-baseline justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
              <p className="titulo-serif text-xl text-oliva tabular-nums lining-nums">{reais(valor)}</p>
              <p className="text-sm text-terra">{f.agreed_cents !== null ? "fechado" : "orçamento"}</p>
            </div>
          )}
        </div>

        {conta.despesas.length > 0 && (
          <div className="mt-3">
            <div
              className="h-2 w-full rounded-full bg-terra/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={conta.contratado}
              aria-valuenow={conta.pago}
              aria-label="Pago do contratado"
            >
              <span
                className={`block h-2 rounded-full ${quitado ? "bg-oliva" : "bg-lavanda"}`}
                style={{ width: `${Math.min(100, Math.round((conta.pago / Math.max(1, conta.contratado)) * 100))}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm text-terra tabular-nums lining-nums">
              {quitado ? "Quitado" : `${reais(conta.pago)} pagos · falta ${reais(conta.saldo)}`}
            </p>
          </div>
        )}

        {f.next_action && (
          <p className={`mt-2 truncate text-sm ${urgente ? "font-medium text-red-800" : "text-terra"}`}>
            Próximo: {f.next_action}
            {f.next_action_at && ` — ${formatarData(f.next_action_at)}`}
          </p>
        )}
      </button>
    </li>
  );
}
