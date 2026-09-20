"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
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
import { FichaFornecedor, TOM_ETAPA } from "./FichaFornecedor";

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
}: {
  fornecedores: Fornecedor[];
  despesas: Despesa[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [etapaVisivel, setEtapaVisivel] = useState<StatusFornecedor | "todas">("todas");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhe = fornecedores.find((f) => f.id === detalheId) ?? null;

  /** O que o financeiro sabe de cada um: contratado, pago e os lançamentos. */
  const contas = useMemo(() => contasPorFornecedor(despesas), [despesas]);

  const resumo = useMemo(() => {
    const contratados = fornecedores.filter((f) => f.status === "contratado");
    const emNegociacao = fornecedores.filter((f) =>
      ["contatado", "proposta", "negociando"].includes(f.status),
    );
    const totalFechado = contratados.reduce((s, f) => s + (f.agreed_cents ?? 0), 0);
    const proximas = fornecedores.filter((f) => {
      const dias = diasAte(f.next_action_at);
      return dias !== null && dias <= 7 && f.status !== "contratado" && f.status !== "descartado";
    }).length;
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
    return ETAPAS_FUNIL.map((etapa) => ({
      etapa,
      itens: fornecedores.filter((f) => f.status === etapa),
    })).filter((g) => etapaVisivel === "todas" || g.etapa === etapaVisivel);
  }, [fornecedores, etapaVisivel]);

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
    const supabase = criarClienteNavegador();
    await supabase.from("vendors").update({ status }).eq("id", f.id);
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

      <Bloco
        titulo="Fornecedores"
        descricao="Do primeiro contato ao contrato fechado. Toque no fornecedor para abrir a ficha."
        acao={
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

        {fornecedores.length === 0 ? (
          <Vazio>Nenhum fornecedor no funil ainda. Comece adicionando os que já pesquisaram.</Vazio>
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
