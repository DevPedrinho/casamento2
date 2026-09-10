"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  CATEGORIAS_FORNECEDOR,
  ETAPAS_FUNIL,
  ROTULOS_FORNECEDOR,
  type Fornecedor,
  type StatusFornecedor,
} from "@/lib/tipos";
import { diasAte, formatarData, paraCampo, paraCentavos, reais } from "@/lib/formato";
import { linkSeguro } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";

const TOM_ETAPA: Record<StatusFornecedor, "neutro" | "oliva" | "lavanda" | "apagado"> = {
  prospecto: "neutro",
  contatado: "neutro",
  proposta: "lavanda",
  negociando: "lavanda",
  contratado: "oliva",
  descartado: "apagado",
};

const VAZIO = {
  name: "",
  company: "",
  contract_url: "",
  paid: "",
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

export function Fornecedores({ fornecedores }: { fornecedores: Fornecedor[] }) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [etapaVisivel, setEtapaVisivel] = useState<StatusFornecedor | "todas">("todas");

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
    return {
      total: fornecedores.length,
      contratados: contratados.length,
      emNegociacao: emNegociacao.length,
      totalFechado,
      proximas,
    };
  }, [fornecedores]);

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
      paid: paraCampo(f.paid_cents ?? null),
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
      paid_cents: paraCentavos(form.paid),
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

  async function remover(f: Fornecedor) {
    if (!confirm(`Remover ${f.name} do funil?`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("vendors").delete().eq("id", f.id);
    if (editando === f.id) limpar();
    router.refresh();
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
        <div className="rounded-sm border border-terra/20 bg-creme-claro px-6 py-5 text-center">
          <span className="versalete text-xs text-terra">Total já fechado em contratos</span>
          <p className="titulo-serif mt-2 text-3xl text-oliva tabular-nums lining-nums">
            {reais(resumo.totalFechado)}
          </p>
        </div>
      )}

      <Bloco
        titulo="Fornecedores"
        descricao="Do primeiro contato ao contrato fechado — com o valor de cada orçamento."
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

            <div className="grid gap-5 sm:grid-cols-3">
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

            <div className="grid gap-5 sm:grid-cols-3">
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="f-insta">Instagram</Rotulo>
                <input id="f-insta" className="campo" placeholder="@perfil" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-site">Site</Rotulo>
                <input id="f-site" type="url" className="campo" placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="f-orc">Orçamento recebido (R$)</Rotulo>
                <input id="f-orc" inputMode="decimal" className="campo" placeholder="12000,00" value={form.quoted} onChange={(e) => setForm({ ...form, quoted: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-fech">Valor fechado (R$)</Rotulo>
                <input id="f-fech" inputMode="decimal" className="campo" placeholder="Só quando contratar" value={form.agreed} onChange={(e) => setForm({ ...form, agreed: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-pago">Já pago (R$)</Rotulo>
                <input id="f-pago" inputMode="decimal" className="campo" value={form.paid}
                  onChange={(e) => setForm({ ...form, paid: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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
                  <p className="text-sm text-terra/70">Ninguém nesta etapa.</p>
                ) : (
                  <ul className="grid gap-4 lg:grid-cols-2">
                    {itens.map((f) => (
                      <CartaoFornecedor
                        key={f.id}
                        fornecedor={f}
                        aoEditar={() => editar(f)}
                        aoRemover={() => remover(f)}
                        aoMover={(s) => moverEtapa(f, s)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </Bloco>
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

function CartaoFornecedor({
  fornecedor: f,
  aoEditar,
  aoRemover,
  aoMover,
}: {
  fornecedor: Fornecedor;
  aoEditar: () => void;
  aoRemover: () => void;
  aoMover: (status: StatusFornecedor) => void;
}) {
  const dias = diasAte(f.next_action_at);
  const urgente = dias !== null && dias <= 7;
  const site = linkSeguro(f.website);

  return (
    <li className="rounded-sm border border-terra/20 bg-creme p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="titulo-serif text-xl text-oliva">{f.name}</h4>
          <p className="mt-1 text-sm text-terra">
            {[f.category, f.company].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Selo tom={TOM_ETAPA[f.status]}>{ROTULOS_FORNECEDOR[f.status]}</Selo>
      </div>

      {(f.contact_name || f.phone || f.email || f.instagram || site) && (
        <div className="mt-3 space-y-1 text-sm text-terra">
          {f.contact_name && <p>{f.contact_name}</p>}
          {f.phone && (
            <p>
              <a
                href={`https://wa.me/55${f.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-oliva"
              >
                {f.phone}
              </a>
            </p>
          )}
          {f.email && <p className="break-all">{f.email}</p>}
          {f.instagram && (
            <p>
              <a
                href={`https://instagram.com/${f.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-oliva"
              >
                @{f.instagram}
              </a>
            </p>
          )}
          {site && (
            <p>
              <a href={site} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4 hover:text-oliva">
                {site.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </div>
      )}

      {(f.quoted_cents !== null || f.agreed_cents !== null) && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
          {f.quoted_cents !== null && (
            <p className="text-sm text-terra">
              Orçamento: <span className="tabular-nums lining-nums">{reais(f.quoted_cents)}</span>
            </p>
          )}
          {f.agreed_cents !== null && (
            <p className="titulo-serif text-base text-oliva">
              Fechado: <span className="tabular-nums lining-nums">{reais(f.agreed_cents)}</span>
            </p>
          )}
          {f.agreed_cents !== null && (f.paid_cents ?? 0) > 0 && (
            <p className="text-sm text-terra">
              Pago: <span className="tabular-nums lining-nums">{reais(f.paid_cents ?? 0)}</span>
              {" · saldo "}
              <span className="tabular-nums lining-nums">
                {reais(Math.max(0, f.agreed_cents - (f.paid_cents ?? 0)))}
              </span>
            </p>
          )}
        </div>
      )}

      {linkSeguro(f.contract_url ?? null) && (
        <p className="mt-2">
          <a href={linkSeguro(f.contract_url ?? null)!} target="_blank" rel="noopener noreferrer"
            className="versalete text-xs text-oliva underline underline-offset-4">
            Ver contrato
          </a>
        </p>
      )}

      {f.next_action && (
        <p className={`mt-3 text-sm ${urgente ? "font-medium text-red-800" : "text-terra"}`}>
          Próximo passo: {f.next_action}
          {f.next_action_at && ` — ${formatarData(f.next_action_at)}`}
        </p>
      )}

      {f.notes && <p className="mt-3 text-sm leading-relaxed text-terra/85">{f.notes}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-terra/15 pt-4">
        <label className="versalete text-xs text-terra">
          Mover para{" "}
          <select
            value={f.status}
            onChange={(e) => aoMover(e.target.value as StatusFornecedor)}
            className="ml-1 rounded-sm border border-terra/30 bg-creme-claro px-2 py-1 text-sm normal-case tracking-normal text-oliva"
          >
            {ETAPAS_FUNIL.map((s) => (
              <option key={s} value={s}>{ROTULOS_FORNECEDOR[s]}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={aoEditar} className="versalete text-xs text-oliva underline underline-offset-4">
          Editar
        </button>
        <button type="button" onClick={aoRemover} className="versalete text-xs text-red-800 underline underline-offset-4">
          Remover
        </button>
      </div>
    </li>
  );
}
