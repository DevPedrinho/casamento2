"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ETAPAS_CONVITE,
  ROTULOS_CONVITE,
  ROTULOS_PRESENCA_CURTO,
  ROTULOS_VINCULO,
  type Acompanhante,
  type ConvidadoCompleto,
  type GrupoConvidados,
  type Mesa,
  type StatusConvite,
} from "@/lib/tipos";
import { formatarData } from "@/lib/formato";
import { formatarCodigo } from "@/lib/codigo";
import { urlDoSite } from "@/lib/storage";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { confirmarExclusao, excluirConvidado } from "@/lib/excluirConvidado";
import { contaNoTotal, temAcessoAoSite } from "@/lib/idade";
import { Avatar } from "@/components/Avatar";
import { Botao, BotaoLink } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Bloco, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { DetalheConvidado } from "./DetalheConvidado";
import { Familias } from "./Familias";
import { FichaConvidado, type AbaDaFicha } from "./FichaConvidado";
import { FilaDeConvites } from "./FilaDeConvites";
import { RetratoConvidados, type FiltroDoRetrato } from "./RetratoConvidados";
import { TOM_STATUS } from "./tons";
import type { FiltroInicial } from "./page";

export { TOM_STATUS };

type Ordem = "nome" | "grupo" | "status" | "idade";
type FiltroCodigo = "todos" | "sem_codigo" | "nao_enviado" | "enviado" | "cadastrado" | "sem_acesso";
/** "em_espera" junta os três status de quem já recebeu e ainda não respondeu. */
type FiltroStatus = StatusConvite | "todos" | "em_espera";
const EM_ESPERA: StatusConvite[] = ["aguardando", "convite_enviado", "visualizou"];

/**
 * Três leituras da mesma lista.
 *
 * "ficha" é a visão de organização: família, telefone, código do convite.
 * "respostas" é a visão da festa: quem vem, para onde, com quem e em que
 * mesa. "familias" agrupa por família — é onde se cria e se desfaz grupo,
 * e onde se enxerga o conjunto que vai sentar junto.
 */
type Visao = "ficha" | "respostas" | "familias";
const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: "ficha", rotulo: "Ficha" },
  { valor: "respostas", rotulo: "Respostas" },
  { valor: "familias", rotulo: "Famílias" },
];

export function GerenciadorConvidados({
  convidados,
  grupos,
  mesas,
  acompanhantes,
  inicial,
}: {
  convidados: ConvidadoCompleto[];
  grupos: GrupoConvidados[];
  mesas: Mesa[];
  acompanhantes: Acompanhante[];
  /** Vem preenchido quando o clique partiu de um gráfico do dashboard. */
  inicial: FiltroInicial;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>(
    ETAPAS_CONVITE.includes(inicial.status as StatusConvite) ? (inicial.status as StatusConvite) : "todos",
  );
  const [excederam, setExcederam] = useState(false);
  const [grupo, setGrupo] = useState<string>("todos");
  const [lado, setLado] = useState<"todos" | "noivo" | "noiva">(
    inicial.lado === "noivo" || inicial.lado === "noiva" ? inicial.lado : "todos",
  );
  const [vinculo, setVinculo] = useState<string>(inicial.vinculo ?? "todos");
  const [faixa, setFaixa] = useState<string>(inicial.faixa ?? "todos");
  const [presenca, setPresenca] = useState<string>(inicial.presenca ?? "todos");
  const [genero, setGenero] = useState<string>(inicial.genero ?? "todos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [filtroCodigo, setFiltroCodigo] = useState<FiltroCodigo>("todos");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ convidado: ConvidadoCompleto; aba: AbaDaFicha } | null>(null);
  const [filaAberta, setFilaAberta] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [novo, setNovo] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [visao, setVisao] = useState<Visao>(
    inicial.presenca || inicial.vinculo ? "respostas" : "ficha",
  );

  const detalhe = convidados.find((c) => c.id === detalheId) ?? null;

  /** Acompanhantes agrupados por quem os trouxe. */
  const porTitular = useMemo(() => {
    const mapa = new Map<string, Acompanhante[]>();
    for (const a of acompanhantes) {
      mapa.set(a.guest_id, [...(mapa.get(a.guest_id) ?? []), a]);
    }
    return mapa;
  }, [acompanhantes]);

  const resumo = useMemo(() => {
    // Quem conta: acompanhante já é cadastro próprio; criança de colo fica fora.
    const contam = convidados.filter(contaNoTotal);
    const conta = (s: StatusConvite) => contam.filter((c) => c.invite_status === s).length;
    const confirmados = contam.filter((c) => c.invite_status === "confirmado");
    return {
      total: contam.length,
      colo: convidados.length - contam.length,
      confirmados: confirmados.length,
      pessoas: confirmados.length,
      aguardando: conta("aguardando") + conta("convite_enviado") + conta("visualizou"),
      naoVao: conta("nao_vai"),
      semConvite: conta("nao_contatado"),
      followUp: conta("follow_up"),
      semCodigo: convidados.filter((c) => !c.access_code && temAcessoAoSite(c)).length,
      semAcesso: convidados.filter((c) => !temAcessoAoSite(c)).length,
      codigoEnviado: convidados.filter((c) => c.code_sent_at).length,
      jaEntraram: convidados.filter((c) => c.user_id).length,
      // Sem trava de lugares, o excesso vira aviso: quem trouxe mais gente do
      // que os noivos tinham planejado aparece aqui para ser conversado.
      excederam: convidados.filter(
        (c) => (porTitular.get(c.id)?.length ?? 0) > c.companions_planned,
      ).length,
      semFamilia: convidados.filter((c) => !c.group_id).length,
    };
  }, [convidados, porTitular]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = convidados.filter((c) => {
      if (status === "em_espera" && !EM_ESPERA.includes(c.invite_status)) return false;
      if (status !== "todos" && status !== "em_espera" && c.invite_status !== status) return false;
      if (excederam && (porTitular.get(c.id)?.length ?? 0) <= c.companions_planned) return false;
      if (grupo !== "todos" && c.group_id !== grupo) return false;
      if (lado !== "todos" && c.side !== lado) return false;
      if (vinculo !== "todos" && c.relationship_kind !== vinculo) return false;
      if (faixa !== "todos" && c.age_range !== faixa) return false;
      if (genero !== "todos" && c.gender !== genero) return false;
      if (presenca !== "todos" && c.attends !== presenca) return false;
      if (filtroCodigo === "sem_codigo" && (c.access_code || !temAcessoAoSite(c))) return false;
      if (filtroCodigo === "nao_enviado" && (!c.access_code || c.code_sent_at)) return false;
      if (filtroCodigo === "enviado" && !c.code_sent_at) return false;
      if (filtroCodigo === "cadastrado" && !c.user_id) return false;
      if (filtroCodigo === "sem_acesso" && temAcessoAoSite(c)) return false;
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
  }, [busca, convidados, excederam, faixa, filtroCodigo, genero, grupo, lado, ordem, porTitular, presenca, status, vinculo]);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  /** Um clique no retrato: aplica o filtro daquele eixo e leva até a lista. */
  function filtrarPeloRetrato(f: FiltroDoRetrato) {
    if (f.eixo === "vinculo") setVinculo(f.valor);
    if (f.eixo === "faixa") setFaixa(f.valor);
    if (f.eixo === "genero") setGenero(f.valor);
    if (f.eixo === "presenca") setPresenca(f.valor);
    if (f.eixo === "lado") setLado(f.valor === "noiva" || f.valor === "noivo" ? f.valor : "todos");
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Um número da faixa clicado: zera os filtros irmãos e aplica o dele; de novo, desfaz. */
  function recortarPor(alvo: { status?: FiltroStatus; codigo?: FiltroCodigo; excederam?: boolean }) {
    const jaAtivo =
      (alvo.status ? status === alvo.status : true) &&
      (alvo.codigo ? filtroCodigo === alvo.codigo : true) &&
      (alvo.excederam ? excederam : true) &&
      (alvo.status || alvo.codigo || alvo.excederam ? true : status === "todos" && filtroCodigo === "todos" && !excederam);
    setStatus(jaAtivo ? "todos" : (alvo.status ?? "todos"));
    setFiltroCodigo(jaAtivo ? "todos" : (alvo.codigo ?? "todos"));
    setExcederam(jaAtivo ? false : Boolean(alvo.excederam));
  }
  const semRecorteDeStatus = status === "todos" && filtroCodigo === "todos" && !excederam;

  /** Tudo que está filtrando a lista, em chips, para ver e desfazer sem abrir o painel. */
  const recortes: { rotulo: string; limpar: () => void }[] = [
    status !== "todos" && {
      rotulo: status === "em_espera" ? "Aguardando resposta" : ROTULOS_CONVITE[status],
      limpar: () => setStatus("todos"),
    },
    excederam && { rotulo: "Passaram do previsto", limpar: () => setExcederam(false) },
    grupo !== "todos" && {
      rotulo: grupos.find((g) => g.id === grupo)?.name ?? "Família",
      limpar: () => setGrupo("todos"),
    },
    filtroCodigo !== "todos" && {
      rotulo: { sem_codigo: "Sem código", nao_enviado: "Código não entregue", enviado: "Código entregue", cadastrado: "Com cadastro", sem_acesso: "Crianças sem acesso" }[filtroCodigo],
      limpar: () => setFiltroCodigo("todos"),
    },
    vinculo !== "todos" && {
      rotulo: ROTULOS_VINCULO[vinculo as keyof typeof ROTULOS_VINCULO] ?? vinculo,
      limpar: () => setVinculo("todos"),
    },
    faixa !== "todos" && { rotulo: faixa, limpar: () => setFaixa("todos") },
    presenca !== "todos" && {
      rotulo: ROTULOS_PRESENCA_CURTO[presenca as keyof typeof ROTULOS_PRESENCA_CURTO] ?? presenca,
      limpar: () => setPresenca("todos"),
    },
    genero !== "todos" && { rotulo: genero, limpar: () => setGenero("todos") },
    lado !== "todos" && {
      rotulo: lado === "noiva" ? "Lado da noiva" : "Lado do noivo",
      limpar: () => setLado("todos"),
    },
  ].filter(Boolean) as { rotulo: string; limpar: () => void }[];

  const todosVisiveisSelecionados =
    visiveis.length > 0 && visiveis.every((c) => selecionados.has(c.id));

  function alternarTodos() {
    setSelecionados(todosVisiveisSelecionados ? new Set() : new Set(visiveis.map((c) => c.id)));
  }

  /** Muda o status de um convidado direto na linha, sem abrir a ficha. */
  async function mudarStatus(convidado: ConvidadoCompleto, novoStatus: StatusConvite) {
    if (novoStatus === convidado.invite_status) return;
    const supabase = criarClienteNavegador();
    await supabase
      .from("guests")
      .update({ invite_status: novoStatus, last_contact_at: new Date().toISOString().slice(0, 10) })
      .eq("id", convidado.id);
    router.refresh();
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

  /** Ação em massa: põe os selecionados numa família (ou tira deles a família). */
  async function moverParaFamilia(groupId: string | null) {
    if (selecionados.size === 0) return;
    setSalvandoLote(true);
    const supabase = criarClienteNavegador();
    await supabase.from("guests").update({ group_id: groupId }).in("id", [...selecionados]);
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

  async function remover(convidado: ConvidadoCompleto): Promise<boolean> {
    if (!confirmarExclusao(convidado)) return false;
    const erro = await excluirConvidado(convidado);
    if (erro) {
      alert(erro);
      return false;
    }
    router.refresh();
    return true;
  }

  /** Ação em massa: exclui todos os selecionados, um a um, com uma confirmação só. */
  async function excluirSelecionados() {
    const alvo = convidados.filter((c) => selecionados.has(c.id));
    if (alvo.length === 0) return;
    const comCadastro = alvo.filter((c) => c.user_id).length;
    const aviso = [
      `Excluir ${alvo.length} convidado${alvo.length === 1 ? "" : "s"}?`,
      "",
      "Saem da lista, das famílias e das mesas; respostas, acompanhantes e publicações no mural vão junto.",
      comCadastro > 0 ? `\n${comCadastro} já ${comCadastro === 1 ? "tem" : "têm"} cadastro: o login também é apagado.` : "",
      "",
      "Isso não pode ser desfeito.",
    ].join("\n");
    if (!confirm(aviso)) return;
    setSalvandoLote(true);
    for (const c of alvo) {
      const erro = await excluirConvidado(c);
      if (erro) {
        alert(`${c.full_name}: ${erro}`);
        break;
      }
    }
    setSalvandoLote(false);
    setSelecionados(new Set());
    router.refresh();
  }

  function baixarCsv() {
    const alvo = selecionados.size > 0 ? visiveis.filter((c) => selecionados.has(c.id)) : visiveis;
    const cab = ["Nome","Família","Lado","Vínculo","Relação","Papel","Telefone","Idade","Faixa",
                 "Lembrancinha","Status","Onde participa","Acompanhantes previstos",
                 "Acompanhantes confirmados","Mesa","Observações",
                 "Código","Código entregue","Já se cadastrou"];
    const linhas = alvo.map((c) => [
      c.full_name, c.grupo?.name ?? "", c.side ?? "",
      c.relationship_kind ? ROTULOS_VINCULO[c.relationship_kind] : "",
      c.relationship ?? "",
      c.ceremony_role ?? "", c.phone ?? "", c.age?.toString() ?? "", c.age_range ?? "",
      c.favor_type ?? "", ROTULOS_CONVITE[c.invite_status],
      c.attends ? ROTULOS_PRESENCA_CURTO[c.attends] : "",
      String(c.companions_planned), String(porTitular.get(c.id)?.length ?? 0),
      c.mesa?.name ?? "", c.notes ?? "",
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

  const nomePorId = useMemo(() => new Map(convidados.map((c) => [c.id, c.full_name])), [convidados]);

  /** A linha de um convidado, igual nas três visões; só o resumo muda. */
  const linha = (c: ConvidadoCompleto) => (
    <LinhaConvidado
      key={c.id}
      convidado={c}
      titular={c.invited_by ? (nomePorId.get(c.invited_by) ?? null) : null}
      visao={visao}
      acompanhantes={porTitular.get(c.id) ?? []}
      selecionado={selecionados.has(c.id)}
      aoSelecionar={() => alternarSelecao(c.id)}
      aoAbrir={() => setDetalheId(c.id)}
      aoMudarStatus={(s) => mudarStatus(c, s)}
    />
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Lista completa</p>
          <h1 className="titulo-serif mt-2 text-3xl text-oliva sm:text-4xl">Convidados</h1>
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

      {/* ---------- Os números, numa faixa só ---------- */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-sm border border-terra/20 bg-creme-claro px-3 py-2.5" role="group" aria-label="Filtrar pelos números">
        <Numero rotulo="Convidados" valor={resumo.total} detalhe={resumo.colo > 0 ? `+${resumo.colo} no colo` : undefined} ativo={semRecorteDeStatus} aoClicar={() => recortarPor({})} />
        <Numero rotulo="Confirmados" valor={resumo.confirmados} tom="oliva" ativo={status === "confirmado"} aoClicar={() => recortarPor({ status: "confirmado" })} />
        <Numero rotulo="Aguardando" valor={resumo.aguardando} tom="lavanda" ativo={status === "em_espera"} aoClicar={() => recortarPor({ status: "em_espera" })} />
        <Numero rotulo="Não irão" valor={resumo.naoVao} ativo={status === "nao_vai"} aoClicar={() => recortarPor({ status: "nao_vai" })} />
        <Numero rotulo="Sem convite" valor={resumo.semConvite} tom={resumo.semConvite > 0 ? "alerta" : "oliva"} ativo={status === "nao_contatado"} aoClicar={() => recortarPor({ status: "nao_contatado" })} />
        {resumo.excederam > 0 && <Numero rotulo="Passaram do previsto" valor={resumo.excederam} tom="alerta" ativo={excederam} aoClicar={() => recortarPor({ excederam: true })} />}
      </div>

      {/* ---------- Convites: a fila e os códigos, numa faixa ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-sm border border-oliva/25 bg-oliva/5 px-5 py-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => recortarPor({ codigo: "enviado" })}
            aria-pressed={filtroCodigo === "enviado"}
            className={`titulo-serif text-left text-xl text-oliva underline-offset-4 hover:underline ${filtroCodigo === "enviado" ? "underline" : ""}`}
          >
            {resumo.codigoEnviado} de {resumo.total} convites entregues
          </button>
          <p className="mt-0.5 text-sm text-terra">
            {resumo.semAcesso > 0 && (
              <>
                <button type="button" onClick={() => recortarPor({ codigo: "sem_acesso" })} aria-pressed={filtroCodigo === "sem_acesso"} className={`underline-offset-4 hover:underline ${filtroCodigo === "sem_acesso" ? "underline" : ""}`}>
                  {resumo.semAcesso} criança{resumo.semAcesso === 1 ? "" : "s"} sem acesso
                </button>
                {" · "}
              </>
            )}
            {resumo.semCodigo > 0 && (
              <>
                <button type="button" onClick={() => recortarPor({ codigo: "sem_codigo" })} aria-pressed={filtroCodigo === "sem_codigo"} className={`underline-offset-4 hover:underline ${filtroCodigo === "sem_codigo" ? "underline" : ""}`}>
                  {resumo.semCodigo} sem código
                </button>
                {" · "}
              </>
            )}
            <button type="button" onClick={() => recortarPor({ codigo: "cadastrado" })} aria-pressed={filtroCodigo === "cadastrado"} className={`underline-offset-4 hover:underline ${filtroCodigo === "cadastrado" ? "underline" : ""}`}>
              {resumo.jaEntraram} já se cadastraram no site
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {resumo.semCodigo > 0 && (
            <Botao type="button" variante="contorno" onClick={gerarCodigosFaltantes} disabled={gerando}>
              {gerando ? "Gerando…" : `Gerar os ${resumo.semCodigo} códigos`}
            </Botao>
          )}
          <Botao type="button" onClick={() => setFilaAberta(true)}>
            Enviar convites
          </Botao>
        </div>
      </div>

      <RetratoConvidados convidados={convidados} aoFiltrar={filtrarPeloRetrato} />

      <div ref={listaRef} className="scroll-mt-24">
      <Bloco
        titulo="Lista de convidados"
        descricao={
          visao === "familias"
            ? "Cada família com os seus. É este agrupamento que o mapa de mesas usa para sentar gente junta."
            : "Busque, filtre e toque em qualquer linha para abrir a ficha."
        }
        acao={
          <div
            role="group"
            aria-label="Como ver a lista"
            className="inline-flex rounded-sm border border-terra/30 p-0.5"
          >
            {VISOES.map((v) => (
              <button
                key={v.valor}
                type="button"
                onClick={() => setVisao(v.valor)}
                aria-pressed={visao === v.valor}
                className={`versalete min-h-10 rounded-sm px-3.5 text-xs transition-colors ${
                  visao === v.valor
                    ? "bg-oliva text-creme-claro"
                    : "text-terra hover:text-oliva"
                }`}
              >
                {v.rotulo}
              </button>
            ))}
          </div>
        }
      >
        {/* ---------- Busca sempre à mão; o resto dos filtros, num painel ---------- */}
        <div className="mb-4 flex gap-2.5">
          <div className="relative min-w-0 flex-1">
            <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terra/85" />
            <input
              id="busca"
              className="campo pl-10"
              placeholder="Nome, telefone, família, papel…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar convidado"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            aria-controls="painel-filtros"
            className={`versalete titulo-serif inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border px-4 text-xs transition-colors ${
              filtrosAbertos || recortes.length > 0
                ? "border-oliva bg-oliva text-creme-claro"
                : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
            }`}
          >
            Filtros
            {recortes.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-creme-claro px-1.5 text-[0.7rem] text-oliva tabular-nums">
                {recortes.length}
              </span>
            )}
          </button>
        </div>

        <div
          id="painel-filtros"
          hidden={!filtrosAbertos}
          className="mb-5 grid grid-cols-1 gap-4 rounded-sm border border-terra/20 bg-creme p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <Rotulo htmlFor="f-status">Status</Rotulo>
            <select id="f-status" className="campo" value={status} onChange={(e) => setStatus(e.target.value as FiltroStatus)}>
              <option value="todos">Todos</option>
              <option value="em_espera">Aguardando resposta (os três)</option>
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
              <option value="cadastrado">Já se cadastraram</option>
              <option value="sem_acesso">Crianças sem acesso (menos de 10)</option>
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

          <div className="flex flex-wrap items-center gap-2.5 sm:col-span-2 lg:col-span-4">
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
          </div>
        </div>

        {/* O que está filtrando, em chips — visível mesmo com o painel fechado,
            para desfazer num toque. */}
        {recortes.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="versalete text-xs text-terra">Recorte</span>
            {recortes.map((r) => (
              <button
                key={r.rotulo}
                type="button"
                onClick={r.limpar}
                className="versalete inline-flex min-h-9 items-center gap-2 rounded-full border border-lavanda/40 bg-lavanda/10 px-3 text-xs text-lavanda transition-colors hover:border-lavanda"
              >
                {r.rotulo}
                <Icone nome="fechar" className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}

        <p className="mb-4 text-right text-sm text-terra">
          {visiveis.length} de {convidados.length}
        </p>

        {/* ---------- Ações em massa ---------- */}
        {selecionados.size > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-oliva/30 bg-oliva/10 px-5 py-4">
            <span className="titulo-serif text-base text-oliva">
              {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
            </span>
            <label className="versalete flex min-h-11 items-center text-xs text-terra sm:ml-auto">
              Mover para{" "}
              <select
                className="ml-1 min-h-11 rounded-sm border border-terra/30 bg-creme-claro px-2 py-1 text-sm normal-case tracking-normal text-oliva"
                value=""
                disabled={salvandoLote}
                onChange={(e) => e.target.value && mudarStatusEmLote(e.target.value as StatusConvite)}
              >
                <option value="">status…</option>
                {ETAPAS_CONVITE.map((s) => (
                  <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
                ))}
              </select>
            </label>
            <label className="versalete flex min-h-11 items-center text-xs text-terra">
              Família{" "}
              <select
                className="ml-1 min-h-11 rounded-sm border border-terra/30 bg-creme-claro px-2 py-1 text-sm normal-case tracking-normal text-oliva"
                value=""
                disabled={salvandoLote}
                onChange={(e) => {
                  if (e.target.value === "") return;
                  void moverParaFamilia(e.target.value === "__nenhuma" ? null : e.target.value);
                }}
              >
                <option value="">mover para…</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
                <option value="__nenhuma">Tirar da família</option>
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
            <button
              type="button"
              onClick={excluirSelecionados}
              disabled={salvandoLote}
              className="versalete inline-flex min-h-11 items-center text-xs text-red-800 underline underline-offset-4 disabled:opacity-50 sm:ml-auto"
            >
              Excluir selecionados
            </button>
          </div>
        )}

        {/* ---------- Lista ---------- */}
        {visiveis.length === 0 && visao !== "familias" ? (
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

            {visao === "familias" ? (
              <Familias
                grupos={grupos}
                convidados={visiveis}
                pessoasDe={(c) => 1 + c.companions_planned}
                linha={linha}
              />
            ) : (
              <ul className="space-y-2.5">{visiveis.map((c) => linha(c))}</ul>
            )}
          </>
        )}
      </Bloco>
      </div>

      {detalhe && !editando && (
        <DetalheConvidado
          convidado={detalhe}
          acompanhantes={porTitular.get(detalhe.id) ?? []}
          familia={
            detalhe.group_id
              ? convidados.filter((x) => x.group_id === detalhe.group_id && x.id !== detalhe.id)
              : []
          }
          titular={detalhe.invited_by ? (convidados.find((x) => x.id === detalhe.invited_by) ?? null) : null}
          copiado={copiado === detalhe.id}
          gerando={gerando}
          aoFechar={() => setDetalheId(null)}
          aoEditar={(aba) => setEditando({ convidado: detalhe, aba: aba ?? "convite" })}
          aoRemover={() => {
            void remover(detalhe).then((removeu) => removeu && setDetalheId(null));
          }}
          aoAbrirOutro={(outro) => setDetalheId(outro.id)}
          aoGerar={() => gerarCodigo(detalhe.id)}
          aoCopiar={() => copiarCodigo(detalhe)}
          aoMarcar={(enviado) => marcarEnviado([detalhe.id], enviado)}
        />
      )}

      {filaAberta && (
        <FilaDeConvites
          convidados={convidados}
          aoFechar={() => {
            setFilaAberta(false);
            router.refresh();
          }}
          aoAtualizar={() => router.refresh()}
        />
      )}

      {(editando || novo) && (
        <FichaConvidado
          convidado={editando?.convidado ?? null}
          abaInicial={editando?.aba}
          grupos={grupos}
          mesas={mesas}
          aoFechar={() => {
            setEditando(null);
            setNovo(false);
          }}
          aoSalvar={() => {
            setEditando(null);
            setNovo(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Um número da faixa do topo, que também é o filtro dele: clicar mostra na
 * lista exatamente quem está sendo contado; clicar de novo desfaz.
 */
function Numero({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  ativo,
  aoClicar,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  tom?: "neutro" | "oliva" | "lavanda" | "alerta";
  ativo: boolean;
  aoClicar: () => void;
}) {
  const cores = { neutro: "text-oliva", oliva: "text-oliva", lavanda: "text-lavanda", alerta: "text-red-800" } as const;
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`rounded-sm border-b-2 px-2 py-1.5 text-left transition-colors hover:bg-oliva/10 ${
        ativo ? "border-oliva bg-oliva/10" : "border-transparent"
      }`}
    >
      <span className="versalete block text-xs text-terra">{rotulo}</span>
      <span className={`titulo-serif block text-2xl leading-tight tabular-nums lining-nums ${cores[tom]}`}>
        {valor}
        {detalhe && <span className="ml-1.5 font-sans text-xs text-terra">{detalhe}</span>}
      </span>
    </button>
  );
}

/**
 * O cartão da lista é só o resumo: nome, papel, uma linha de contexto e o
 * status. Tudo o mais — código, acompanhantes, família — mora na ficha.
 * A caixinha de seleção fica fora do botão que abre a ficha, porque botão
 * dentro de botão não existe.
 */
function LinhaConvidado({
  convidado: c,
  titular,
  visao,
  acompanhantes,
  selecionado,
  aoSelecionar,
  aoAbrir,
  aoMudarStatus,
}: {
  convidado: ConvidadoCompleto;
  /** Nome de quem trouxe, quando o cadastro nasceu de um acompanhante. */
  titular: string | null;
  visao: Visao;
  acompanhantes: Acompanhante[];
  selecionado: boolean;
  aoSelecionar: () => void;
  aoAbrir: () => void;
  aoMudarStatus: (status: StatusConvite) => void;
}) {
  const passou = acompanhantes.length > c.companions_planned;

  const veioCom = titular ? `veio com ${titular.split(" ")[0]}` : null;
  const contexto =
    visao === "ficha"
      ? [c.grupo?.name, veioCom, c.relationship, c.phone].filter(Boolean).join(" · ") || "—"
      : visao === "familias"
        ? [c.relationship, c.attends ? ROTULOS_PRESENCA_CURTO[c.attends] : "sem resposta", c.mesa?.name]
            .filter(Boolean)
            .join(" · ")
        : resumoDaResposta(c, acompanhantes);

  return (
    <li
      className={`flex items-center gap-3 rounded-sm border px-4 py-3.5 transition-colors sm:gap-4 ${
        selecionado ? "border-oliva/50 bg-oliva/5" : "border-terra/20 bg-creme hover:border-oliva/40"
      }`}
    >
      <label className="-my-3 flex shrink-0 cursor-pointer items-center py-3">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={aoSelecionar}
          aria-label={`Selecionar ${c.full_name}`}
          className="h-5 w-5 accent-[var(--color-oliva)]"
        />
      </label>

      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Abrir ${c.full_name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
      >
        <Avatar nome={c.full_name} url={urlDoSite(c.avatar_path)} tamanho="sm" />
        <span className="min-w-0 flex-1">
          <span className="titulo-serif block text-lg leading-snug text-oliva">
            {c.full_name}
            {c.ceremony_role && (
              <span className="versalete ml-2 text-xs text-lavanda">{c.ceremony_role}</span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-terra">
            <span className="min-w-0 truncate">{contexto}</span>
            {visao === "ficha" && !temAcessoAoSite(c) && (
              <span className="versalete text-xs text-terra/85">sem acesso · criança</span>
            )}
            {visao === "ficha" && temAcessoAoSite(c) && (
              c.access_code ? (
                <span
                  className={`versalete text-xs ${c.code_sent_at ? "text-oliva" : "text-terra/85"}`}
                  title={c.code_sent_at ? "código entregue" : "código ainda não entregue"}
                >
                  {c.code_sent_at ? "✓ código entregue" : "código não entregue"}
                </span>
              ) : (
                <span className="versalete text-xs text-red-800">sem código</span>
              )
            )}
            {visao === "respostas" && passou && (
              <span className="versalete text-xs text-red-800">passou do previsto</span>
            )}
          </span>
        </span>
      </button>

      {/* O status é um select vestido de selo: troca direto na linha. Fica
          fora do botão da ficha, porque controle dentro de botão não existe. */}
      <select
        value={c.invite_status}
        onChange={(e) => aoMudarStatus(e.target.value as StatusConvite)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Status do convite de ${c.full_name}`}
        title="Mudar o status do convite"
        className={`versalete min-h-8 shrink-0 cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-oliva/40 ${TONS_STATUS[TOM_STATUS[c.invite_status]]}`}
      >
        {ETAPAS_CONVITE.map((s) => (
          <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
        ))}
      </select>
    </li>
  );
}

/** As mesmas cores do Selo, para o select do status parecer um selo. */
const TONS_STATUS = {
  neutro: "bg-terra/15 text-terra",
  oliva: "bg-oliva text-creme-claro",
  lavanda: "bg-lavanda text-creme-claro",
  alerta: "bg-red-800/15 text-red-900",
  apagado: "bg-creme-escuro text-terra/85",
} as const;

/** A segunda linha da visão "Respostas": o essencial sem abrir a ficha. */
function resumoDaResposta(convidado: ConvidadoCompleto, acompanhantes: Acompanhante[]) {
  const partes = [
    convidado.relationship_kind ? ROTULOS_VINCULO[convidado.relationship_kind] : null,
    convidado.attends ? ROTULOS_PRESENCA_CURTO[convidado.attends] : "sem resposta",
    acompanhantes.length > 0
      ? `+${acompanhantes.length} ${acompanhantes.length > 1 ? "pessoas" : "pessoa"}`
      : null,
    convidado.mesa?.name ?? null,
  ];
  return partes.filter(Boolean).join(" · ");
}
