"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ETAPAS_CONVITE,
  ROTULOS_CONVITE,
  type ConvidadoCompleto,
  type GrupoConvidados,
  type StatusConvite,
} from "@/lib/tipos";
import { formatarData } from "@/lib/formato";
import { formatarCodigo } from "@/lib/codigo";
import { linkWhatsApp, mensagemDoConvite } from "@/lib/convite";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";
import { Botao, BotaoLink } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { FichaConvidado } from "./FichaConvidado";

export const TOM_STATUS: Record<StatusConvite, "neutro" | "oliva" | "lavanda" | "alerta" | "apagado"> = {
  nao_contatado: "neutro",
  convite_enviado: "lavanda",
  visualizou: "lavanda",
  aguardando: "lavanda",
  confirmado: "oliva",
  nao_vai: "apagado",
  follow_up: "alerta",
};

type Ordem = "nome" | "grupo" | "status" | "idade";
type FiltroCodigo = "todos" | "sem_codigo" | "nao_enviado" | "enviado";

export function GerenciadorConvidados({
  convidados,
  grupos,
}: {
  convidados: ConvidadoCompleto[];
  grupos: GrupoConvidados[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusConvite | "todos">("todos");
  const [grupo, setGrupo] = useState<string>("todos");
  const [lado, setLado] = useState<"todos" | "noivo" | "noiva">("todos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [filtroCodigo, setFiltroCodigo] = useState<FiltroCodigo>("todos");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<ConvidadoCompleto | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);

  const resumo = useMemo(() => {
    const conta = (s: StatusConvite) => convidados.filter((c) => c.invite_status === s).length;
    const confirmados = convidados.filter((c) => c.invite_status === "confirmado");
    return {
      total: convidados.length,
      confirmados: confirmados.length,
      pessoas: confirmados.reduce((s, c) => s + 1 + c.companions_planned, 0),
      aguardando: conta("aguardando") + conta("convite_enviado") + conta("visualizou"),
      naoVao: conta("nao_vai"),
      semConvite: conta("nao_contatado"),
      followUp: conta("follow_up"),
      grupos: grupos.length,
      semCodigo: convidados.filter((c) => !c.access_code).length,
      codigoEnviado: convidados.filter((c) => c.code_sent_at).length,
      jaEntraram: convidados.filter((c) => c.user_id).length,
    };
  }, [convidados, grupos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = convidados.filter((c) => {
      if (status !== "todos" && c.invite_status !== status) return false;
      if (grupo !== "todos" && c.group_id !== grupo) return false;
      if (lado !== "todos" && c.side !== lado) return false;
      if (filtroCodigo === "sem_codigo" && c.access_code) return false;
      if (filtroCodigo === "nao_enviado" && (!c.access_code || c.code_sent_at)) return false;
      if (filtroCodigo === "enviado" && !c.code_sent_at) return false;
      if (!termo) return true;
      return (
        c.full_name.toLowerCase().includes(termo) ||
        (c.phone ?? "").includes(termo) ||
        (c.relationship ?? "").toLowerCase().includes(termo) ||
        (c.grupo?.name ?? "").toLowerCase().includes(termo) ||
        (c.ceremony_role ?? "").toLowerCase().includes(termo)
      );
    });

    return lista.sort((a, b) => {
      if (ordem === "grupo") {
        return (a.grupo?.name ?? "zzz").localeCompare(b.grupo?.name ?? "zzz", "pt-BR")
          || a.full_name.localeCompare(b.full_name, "pt-BR");
      }
      if (ordem === "status") {
        return ETAPAS_CONVITE.indexOf(a.invite_status) - ETAPAS_CONVITE.indexOf(b.invite_status)
          || a.full_name.localeCompare(b.full_name, "pt-BR");
      }
      if (ordem === "idade") return (b.age ?? -1) - (a.age ?? -1);
      return a.full_name.localeCompare(b.full_name, "pt-BR");
    });
  }, [busca, convidados, filtroCodigo, grupo, lado, ordem, status]);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const todosVisiveisSelecionados =
    visiveis.length > 0 && visiveis.every((c) => selecionados.has(c.id));

  function alternarTodos() {
    setSelecionados(todosVisiveisSelecionados ? new Set() : new Set(visiveis.map((c) => c.id)));
  }

  /** Ação em massa: move o status de todos os selecionados de uma vez. */
  async function mudarStatusEmLote(novoStatus: StatusConvite) {
    if (selecionados.size === 0) return;
    setSalvandoLote(true);
    const supabase = criarClienteNavegador();
    await supabase
      .from("guests")
      .update({ invite_status: novoStatus, last_contact_at: new Date().toISOString().slice(0, 10) })
      .in("id", [...selecionados]);
    setSalvandoLote(false);
    setSelecionados(new Set());
    router.refresh();
  }

  /** Gera o código de um convidado só. */
  async function gerarCodigo(id: string) {
    setGerando(true);
    const supabase = criarClienteNavegador();
    await supabase.rpc("admin_gerar_codigo", { p_guest: id });
    setGerando(false);
    router.refresh();
  }

  /** Gera de uma vez para todo mundo que ainda está sem código. */
  async function gerarCodigosFaltantes() {
    setGerando(true);
    const supabase = criarClienteNavegador();
    await supabase.rpc("admin_gerar_codigos_faltantes");
    setGerando(false);
    router.refresh();
  }

  /** Marca (ou desmarca) que o código já foi entregue. */
  async function marcarEnviado(ids: string[], enviado: boolean) {
    if (ids.length === 0) return;
    const supabase = criarClienteNavegador();
    await supabase
      .from("guests")
      .update({ code_sent_at: enviado ? new Date().toISOString() : null })
      .in("id", ids);
    router.refresh();
  }

  async function copiarCodigo(convidado: ConvidadoCompleto) {
    if (!convidado.access_code) return;
    try {
      await navigator.clipboard.writeText(formatarCodigo(convidado.access_code));
      setCopiado(convidado.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o código está
      // na tela, dá para copiar na mão.
    }
  }

  function baixarCsv() {
    const alvo = selecionados.size > 0 ? visiveis.filter((c) => selecionados.has(c.id)) : visiveis;
    const cab = ["Nome","Grupo","Lado","Relação","Papel","Telefone","Idade","Faixa",
                 "Lembrancinha","Status","Acompanhantes","Mesa","Observações",
                 "Código","Código entregue","Já se cadastrou"];
    const linhas = alvo.map((c) => [
      c.full_name, c.grupo?.name ?? "", c.side ?? "", c.relationship ?? "",
      c.ceremony_role ?? "", c.phone ?? "", c.age?.toString() ?? "", c.age_range ?? "",
      c.favor_type ?? "", ROTULOS_CONVITE[c.invite_status],
      String(c.companions_planned), c.table_number ?? "", c.notes ?? "",
      formatarCodigo(c.access_code), formatarData(c.code_sent_at?.slice(0, 10) ?? null) ?? "",
      c.user_id ? "sim" : "não",
    ]);
    const csv = [cab, ...linhas]
      .map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Lista completa</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Convidados</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <BotaoLink href="/admin/convidados/importar" variante="contorno">
            Importar planilha
          </BotaoLink>
          <Botao type="button" variante="contorno" onClick={baixarCsv}>
            Baixar CSV
          </Botao>
          <Botao type="button" onClick={() => setNovo(true)}>
            <Icone nome="mais" className="h-4 w-4" />
            Novo convidado
          </Botao>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Indicador rotulo="Convidados" valor={resumo.total} />
        <Indicador rotulo="Confirmados" valor={resumo.confirmados} tom="oliva" detalhe={`${resumo.pessoas} pessoas`} />
        <Indicador rotulo="Aguardando" valor={resumo.aguardando} tom="lavanda" />
        <Indicador rotulo="Não irão" valor={resumo.naoVao} />
        <Indicador rotulo="Sem convite" valor={resumo.semConvite} tom={resumo.semConvite > 0 ? "alerta" : "oliva"} />
        <Indicador rotulo="Famílias" valor={resumo.grupos} />
      </div>

      <Bloco
        titulo="Códigos do convite"
        descricao="Cada convidado entra no site com o próprio código. Sem código, ninguém cria cadastro — é assim que vocês sabem para quem já mandaram convite."
        acao={
          resumo.semCodigo > 0 ? (
            <Botao type="button" onClick={gerarCodigosFaltantes} disabled={gerando}>
              {gerando ? "Gerando…" : `Gerar os ${resumo.semCodigo} que faltam`}
            </Botao>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Indicador rotulo="Com código" valor={resumo.total - resumo.semCodigo} tom="oliva" />
          <Indicador
            rotulo="Sem código"
            valor={resumo.semCodigo}
            tom={resumo.semCodigo > 0 ? "alerta" : "oliva"}
          />
          <Indicador rotulo="Já entreguei" valor={resumo.codigoEnviado} tom="lavanda" />
          <Indicador rotulo="Já se cadastraram" valor={resumo.jaEntraram} />
        </div>
      </Bloco>

      <Bloco titulo="Lista de convidados" descricao="Busque, filtre e edite. Clique em qualquer linha para abrir a ficha.">
        {/* ---------- Filtros ---------- */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Rotulo htmlFor="busca">Buscar</Rotulo>
            <div className="relative">
              <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terra/60" />
              <input
                id="busca"
                className="campo pl-10"
                placeholder="Nome, telefone, família, papel…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Rotulo htmlFor="f-status">Status</Rotulo>
            <select id="f-status" className="campo" value={status} onChange={(e) => setStatus(e.target.value as StatusConvite | "todos")}>
              <option value="todos">Todos</option>
              {ETAPAS_CONVITE.map((s) => (
                <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="f-grupo">Família</Rotulo>
            <select id="f-grupo" className="campo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="todos">Todas</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="f-codigo">Código</Rotulo>
            <select
              id="f-codigo"
              className="campo"
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value as FiltroCodigo)}
            >
              <option value="todos">Todos</option>
              <option value="sem_codigo">Ainda sem código</option>
              <option value="nao_enviado">Com código, não entregue</option>
              <option value="enviado">Já entreguei</option>
            </select>
          </div>
          <div>
            <Rotulo htmlFor="f-ordem">Ordenar por</Rotulo>
            <select id="f-ordem" className="campo" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
              <option value="nome">Nome</option>
              <option value="grupo">Família</option>
              <option value="status">Status</option>
              <option value="idade">Idade</option>
            </select>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          {(["todos", "noivo", "noiva"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLado(l)}
              aria-pressed={lado === l}
              className={`versalete titulo-serif inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors ${
                lado === l
                  ? "border-oliva bg-oliva text-creme-claro"
                  : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
              }`}
            >
              {l === "todos" ? "Todos" : l === "noivo" ? "Lado do noivo" : "Lado da noiva"}
            </button>
          ))}
          <span className="ml-auto text-sm text-terra">
            {visiveis.length} de {convidados.length}
          </span>
        </div>

        {/* ---------- Ações em massa ---------- */}
        {selecionados.size > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-sm border border-oliva/30 bg-oliva/10 px-5 py-4">
            <span className="titulo-serif text-base text-oliva">
              {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
            </span>
            <label className="versalete ml-auto text-xs text-terra">
              Mover para{" "}
              <select
                className="ml-1 rounded-sm border border-terra/30 bg-creme-claro px-2 py-1 text-sm normal-case tracking-normal text-oliva"
                value=""
                disabled={salvandoLote}
                onChange={(e) => e.target.value && mudarStatusEmLote(e.target.value as StatusConvite)}
              >
                <option value="">escolher…</option>
                {ETAPAS_CONVITE.map((s) => (
                  <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => marcarEnviado([...selecionados], true)}
              className="versalete inline-flex min-h-11 items-center text-xs text-oliva underline underline-offset-4"
            >
              Marcar código como entregue
            </button>
            <button
              type="button"
              onClick={() => setSelecionados(new Set())}
              className="versalete inline-flex min-h-11 items-center text-xs text-terra underline underline-offset-4"
            >
              Limpar seleção
            </button>
          </div>
        )}

        {/* ---------- Lista ---------- */}
        {visiveis.length === 0 ? (
          <Vazio>Nenhum convidado encontrado com esses filtros.</Vazio>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3 px-1">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={todosVisiveisSelecionados}
                  onChange={alternarTodos}
                  aria-label="Selecionar todos os visíveis"
                  className="h-5 w-5 accent-[var(--color-oliva)]"
                />
                <span className="versalete text-xs text-terra">Selecionar todos</span>
              </label>
            </div>

            <ul className="space-y-2.5">
              {visiveis.map((c) => (
                <li key={c.id}>
                  <div
                    className={`rounded-sm border transition-colors ${
                      selecionados.has(c.id)
                        ? "border-oliva/50 bg-oliva/5"
                        : "border-terra/20 bg-creme hover:border-oliva/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4">
                      {/* O rótulo em volta dá área de toque à caixinha sem
                          engordar o desenho da linha. */}
                      <label className="-my-3 flex shrink-0 cursor-pointer items-center py-3">
                        <input
                          type="checkbox"
                          checked={selecionados.has(c.id)}
                          onChange={() => alternarSelecao(c.id)}
                          aria-label={`Selecionar ${c.full_name}`}
                          className="h-5 w-5 accent-[var(--color-oliva)]"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setAberto(c)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
                      >
                        <Avatar nome={c.full_name} tamanho="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="titulo-serif block text-lg text-oliva sm:truncate">
                            {c.full_name}
                            {c.ceremony_role && (
                              <span className="versalete ml-2 text-xs text-lavanda">
                                {c.ceremony_role}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-sm text-terra">
                            {[c.grupo?.name, c.relationship, c.phone].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                        <span className="hidden shrink-0 sm:block">
                          <Selo tom={TOM_STATUS[c.invite_status]}>
                            {ROTULOS_CONVITE[c.invite_status]}
                          </Selo>
                        </span>
                      </button>
                    </div>

                    <LinhaDoCodigo
                      convidado={c}
                      copiado={copiado === c.id}
                      gerando={gerando}
                      aoGerar={() => gerarCodigo(c.id)}
                      aoCopiar={() => copiarCodigo(c)}
                      aoMarcar={(enviado) => marcarEnviado([c.id], enviado)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Bloco>

      {(aberto || novo) && (
        <FichaConvidado
          convidado={aberto}
          grupos={grupos}
          aoFechar={() => {
            setAberto(null);
            setNovo(false);
          }}
          aoSalvar={() => {
            setAberto(null);
            setNovo(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Segunda linha de cada convidado: o código do convite e o que dá para
 * fazer com ele. Fica fora do botão que abre a ficha porque botão dentro
 * de botão não existe — e assim cada ação tem a própria área de toque.
 */
function LinhaDoCodigo({
  convidado,
  copiado,
  gerando,
  aoGerar,
  aoCopiar,
  aoMarcar,
}: {
  convidado: ConvidadoCompleto;
  copiado: boolean;
  gerando: boolean;
  aoGerar: () => void;
  aoCopiar: () => void;
  aoMarcar: (enviado: boolean) => void;
}) {
  const telefone = convidado.whatsapp ?? convidado.phone;
  const zap = convidado.access_code
    ? linkWhatsApp(telefone, mensagemDoConvite(convidado.full_name, convidado.access_code))
    : null;

  const acao =
    "versalete inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2.5 text-xs transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-terra/15 px-3 py-1.5">
      {convidado.access_code ? (
        <>
          <code className="rounded-sm bg-creme-escuro/60 px-2.5 py-1.5 font-mono text-sm tracking-widest text-oliva">
            {formatarCodigo(convidado.access_code)}
          </code>

          <button type="button" onClick={aoCopiar} className={`${acao} text-terra hover:text-oliva`}>
            {copiado ? "copiado!" : "copiar"}
          </button>

          {zap && (
            <a
              href={zap}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => aoMarcar(true)}
              className={`${acao} text-terra hover:text-oliva`}
            >
              WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={() => aoMarcar(!convidado.code_sent_at)}
            className={`${acao} ${
              convidado.code_sent_at ? "text-oliva" : "text-terra hover:text-oliva"
            }`}
            title={
              convidado.code_sent_at
                ? `Entregue em ${formatarData(convidado.code_sent_at.slice(0, 10))}`
                : "Marcar que já entreguei este código"
            }
          >
            {convidado.code_sent_at ? "✓ entregue" : "marcar entregue"}
          </button>

          <button
            type="button"
            onClick={aoGerar}
            disabled={gerando}
            className={`${acao} text-terra/70 hover:text-red-800`}
            title="Sorteia outro código; o anterior deixa de valer"
          >
            trocar
          </button>

          {convidado.user_id && (
            <span className="versalete ml-auto px-2 text-xs text-oliva">já se cadastrou</span>
          )}
        </>
      ) : (
        <>
          <span className="versalete px-1 text-xs text-terra/70">sem código</span>
          <button
            type="button"
            onClick={aoGerar}
            disabled={gerando}
            className={`${acao} text-oliva underline underline-offset-4`}
          >
            gerar código
          </button>
        </>
      )}
    </div>
  );
}

export { formatarData };
