import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type {
  Despesa,
  Fornecedor,
  LocalEvento,
  StatusConvite,
  StatusFornecedor,
  StatusTarefa,
  Tarefa,
} from "@/lib/tipos";
import {
  ETAPAS_FUNIL,
  ROTULOS_FORNECEDOR,
  ROTULOS_LOCAL,
  ROTULOS_TAREFA,
} from "@/lib/tipos";
import { CASAMENTO, DATA_CASAMENTO } from "@/lib/config";
import { diasAte, reais } from "@/lib/formato";
import { contaNoTotal, ehDeColo, ehNoivo } from "@/lib/idade";
import { AnelCompacto, Bloco } from "@/components/painel";
import { faseDoMes, MesAMes, type ItemDoMes } from "./MesAMes";
import { ResumoModulos, type DadosResumo, type NumeroChave } from "./ResumoModulos";
import type { Fatia, Semana } from "@/components/graficos";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await criarClienteServidor();

  const [convidados, tarefas, despesas, fornecedores, posts, comentarios, denuncias, config, locais] =
    await Promise.all([
      supabase.from("guests").select(
        `id, full_name, invite_status, companions_planned, group_id, invited_by, next_action,
         next_action_at, attends, gender, age, age_range, relationship_kind, side, is_admin, ceremony_role`,
      ),
      supabase.from("tasks").select("*").order("phase_order").order("sort_order"),
      supabase.from("expenses").select("*, payments(*)"),
      supabase.from("vendors").select("*"),
      supabase.from("posts").select("id, kind, created_at, is_hidden, expires_at"),
      supabase.from("post_comments").select("id", { count: "exact", head: true }),
      supabase.from("post_reports").select("id", { count: "exact", head: true }),
      supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
      supabase.from("event_venues").select("*").order("sort_order"),
    ]);

  // Acompanhante já é cadastro próprio; criança de colo e os noivos ficam fora das contas.
  const listaConvidados = (convidados.data ?? []).filter(contaNoTotal);
  const noColo = (convidados.data ?? []).filter((c) => !ehNoivo(c) && ehDeColo(c)).length;
  const listaTarefas = (tarefas.data ?? []) as Tarefa[];
  const listaDespesas = (despesas.data ?? []) as Despesa[];
  const listaFornecedores = (fornecedores.data ?? []) as Fornecedor[];
  const orcamentoTotal = config.data?.budget_total_cents ?? 0;

  // ---------- Convidados ----------
  const conta = (s: StatusConvite) => listaConvidados.filter((c) => c.invite_status === s).length;
  const confirmados = listaConvidados.filter((c) => c.invite_status === "confirmado");
  const familiasComGrupo = new Set(listaConvidados.map((c) => c.group_id).filter(Boolean)).size;

  // ---------- Tarefas ----------
  const feitas = listaTarefas.filter((t) => t.status === "feito").length;
  const atrasadas = listaTarefas.filter((t) => {
    if (t.status === "feito") return false;
    const d = diasAte(t.due_date);
    return d !== null && d < 0;
  });

  // ---------- Financeiro ----------
  const pagoDe = (d: Despesa) => (d.payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const refDe = (d: Despesa) => d.contracted_cents ?? d.estimated_cents;
  const pago = listaDespesas.reduce((s, d) => s + pagoDe(d), 0);
  const contratado = listaDespesas.reduce((s, d) => s + (d.contracted_cents ?? 0), 0);
  const comprometido = listaDespesas.reduce((s, d) => s + refDe(d), 0);
  const pendente = Math.max(0, comprometido - pago);

  const porCategoria = [...listaDespesas.reduce((mapa, d) => {
    const atual = mapa.get(d.category) ?? { previsto: 0, pago: 0 };
    mapa.set(d.category, {
      previsto: atual.previsto + d.estimated_cents,
      pago: atual.pago + pagoDe(d),
    });
    return mapa;
  }, new Map<string, { previsto: number; pago: number }>())]
    .filter(([, v]) => v.previsto > 0 || v.pago > 0)
    .sort((a, b) => b[1].previsto - a[1].previsto)
    .slice(0, 6)
    .map(([rotulo, v]) => ({
      chave: rotulo,
      rotulo,
      valor: v.previsto,
      href: `/admin/financeiro?categoria=${encodeURIComponent(rotulo)}`,
      detalhe: `${reais(v.pago)} já pagos`,
    }));

  const diasRestantes = Math.max(
    0,
    Math.ceil((DATA_CASAMENTO.getTime() - Date.now()) / 86_400_000),
  );
  const hoje = new Date().toISOString().slice(0, 10);
  const diaDoCasamento = CASAMENTO.dataISO.slice(0, 10);
  const mesesAntes = Math.floor(diasRestantes / 30);
  const fase =
    diasRestantes === 0 ? "No dia"
    : diasRestantes <= 7 ? "Última semana"
    : diasRestantes <= 30 ? "Último mês"
    : faseDoMes(mesesAntes);

  // ---------- Mês a mês: tudo que tem data, de hoje até o casamento ----------
  const listaLocais = (locais.data ?? []) as LocalEvento[];
  const semPrazo = listaTarefas.filter((t) => t.status !== "feito" && !t.due_date).length;

  const itensDoMes: ItemDoMes[] = [
    ...listaDespesas
      .filter((d) => d.due_date && pagoDe(d) < refDe(d) && d.status !== "cancelado")
      .map((d) => ({
        data: d.due_date,
        titulo: `${d.description} — ${reais(refDe(d) - pagoDe(d))}`,
        detalhe: pagoDe(d) > 0 ? `${reais(pagoDe(d))} já pagos de ${reais(refDe(d))}` : d.category,
        tipo: "financeiro" as const,
        href: `/admin/financeiro?categoria=${encodeURIComponent(d.category)}`,
      })),
    ...listaTarefas
      .filter((t) => t.status !== "feito" && t.due_date)
      .map((t) => ({
        data: t.due_date,
        titulo: t.title,
        detalhe: [t.category, t.owner].filter(Boolean).join(" · "),
        tipo: "tarefa" as const,
        href: "/admin/checklist",
        alta: t.priority === "alta",
      })),
    ...listaFornecedores
      .filter((f) => f.next_action_at && f.status !== "contratado" && f.status !== "descartado")
      .map((f) => ({
        data: f.next_action_at,
        titulo: `${f.next_action ?? "Retornar"} — ${f.name}`,
        detalhe: f.category,
        tipo: "fornecedor" as const,
        href: "/admin/fornecedores",
      })),
  ];
  if (conta("nao_contatado") > 0) {
    itensDoMes.push({
      data: null,
      titulo: `Enviar o convite: ${conta("nao_contatado")} convidados sem contato`,
      detalhe: "Nenhum foi contatado ainda",
      tipo: "convites",
      href: "/admin/convidados?status=nao_contatado",
    });
  }
  if (conta("follow_up") > 0) {
    itensDoMes.push({
      data: null,
      titulo: `Retomar contato com ${conta("follow_up")} convidados`,
      detalhe: "Marcados como follow-up",
      tipo: "convites",
      href: "/admin/convidados?status=follow_up",
    });
  }
  if (orcamentoTotal === 0) {
    itensDoMes.push({
      data: null,
      titulo: "Definir o orçamento total do casamento",
      detalhe: "Sem ele, não dá para saber se o planejamento cabe",
      tipo: "financeiro",
      href: "/admin/financeiro",
    });
  }
  itensDoMes.push({
    data: diaDoCasamento,
    titulo: `${CASAMENTO.noiva} & ${CASAMENTO.noivo}`,
    detalhe:
      listaLocais.length > 0
        ? listaLocais.map((l) => `${ROTULOS_LOCAL[l.kind].toLowerCase()} · ${l.name}`).join(" — ")
        : "cerimônia e festa",
    tipo: "dia",
    href: "/admin/cronograma",
  });

  const sobraDoOrcamento = orcamentoTotal - comprometido;

  // ---------- Resumo por módulo ----------
  const emEspera: StatusConvite[] = ["aguardando", "convite_enviado", "visualizou", "follow_up"];
  const acompanhantesCadastrados = listaConvidados.filter((c) => c.invited_by).length;
  const acompanhantesPrevistos = listaConvidados.reduce(
    (s, c) => s + (c.invited_by ? 0 : c.companions_planned ?? 0),
    0,
  );
  const resumoConvidados: DadosResumo["convidados"] = {
    total: listaConvidados.length,
    fatias: [
      { chave: "confirmado", rotulo: "Confirmados", valor: confirmados.length, href: "/admin/convidados?status=confirmado" },
      { chave: "em_espera", rotulo: "Aguardando resposta", valor: listaConvidados.filter((c) => emEspera.includes(c.invite_status)).length, href: "/admin/convidados?status=em_espera" },
      { chave: "nao_vai", rotulo: "Não irão", valor: conta("nao_vai"), href: "/admin/convidados?status=nao_vai" },
      { chave: "nao_contatado", rotulo: "Sem convite", valor: conta("nao_contatado"), href: "/admin/convidados?status=nao_contatado" },
    ],
    numeros: [
      { rotulo: "Famílias", valor: familiasComGrupo },
      { rotulo: "Acompanhantes", valor: `${acompanhantesCadastrados} de ${acompanhantesPrevistos}`, tom: "lavanda" },
      ...(noColo > 0 ? [{ rotulo: "No colo", valor: noColo } satisfies NumeroChave] : []),
    ],
  };

  const contaTarefa = (st: StatusTarefa) => listaTarefas.filter((t) => t.status === st).length;
  const fases = new Map<string, { ordem: number; total: number; feitas: number }>();
  for (const t of listaTarefas) {
    const atual = fases.get(t.phase) ?? { ordem: t.phase_order, total: 0, feitas: 0 };
    atual.total += 1;
    if (t.status === "feito") atual.feitas += 1;
    fases.set(t.phase, atual);
  }
  const altaPendente = listaTarefas.filter((t) => t.status !== "feito" && t.priority === "alta").length;
  const resumoTarefas: DadosResumo["tarefas"] = {
    status: (["pendente", "fazendo", "feito"] as StatusTarefa[]).map((st) => ({
      chave: st,
      rotulo: ROTULOS_TAREFA[st],
      valor: contaTarefa(st),
      href: `/admin/checklist?filtro=${encodeURIComponent(ROTULOS_TAREFA[st])}`,
    })),
    fases: [...fases.entries()]
      .filter(([, v]) => v.total > v.feitas)
      .sort((a, b) => a[1].ordem - b[1].ordem)
      .slice(0, 6)
      .map(([fase, v]) => ({
        chave: fase,
        rotulo: fase,
        valor: v.total - v.feitas,
        detalhe: `${v.feitas} de ${v.total} feitas`,
        href: "/admin/checklist?filtro=A%20fazer",
      })),
    numeros: [
      { rotulo: "Atrasadas", valor: atrasadas.length, tom: atrasadas.length > 0 ? "alerta" : "oliva" },
      { rotulo: "Sem prazo", valor: semPrazo },
      { rotulo: "Alta prioridade", valor: altaPendente, tom: altaPendente > 0 ? "lavanda" : "oliva" },
    ],
  };

  const contaFornecedor = (st: StatusFornecedor) => listaFornecedores.filter((f) => f.status === st).length;
  const contratados = listaFornecedores.filter((f) => f.status === "contratado");
  const totalFechado = contratados.reduce((s, f) => s + (f.agreed_cents ?? 0), 0);
  const retornosVencidos = listaFornecedores.filter(
    (f) => f.next_action_at && f.next_action_at < hoje && f.status !== "contratado" && f.status !== "descartado",
  ).length;
  const categoriasFornecedor = new Set(listaFornecedores.map((f) => f.category));
  const categoriasSemContrato = [...categoriasFornecedor].filter(
    (cat) => !contratados.some((f) => f.category === cat),
  ).length;
  const resumoFornecedores: DadosResumo["fornecedores"] = {
    funil: ETAPAS_FUNIL.map((st) => ({
      chave: st,
      rotulo: ROTULOS_FORNECEDOR[st],
      valor: contaFornecedor(st),
      href: `/admin/fornecedores?etapa=${st}`,
    })),
    numeros: [
      { rotulo: "Contratados", valor: contratados.length, tom: "oliva" },
      { rotulo: "Total fechado", valor: reais(totalFechado), tom: "oliva" },
      { rotulo: "Retornos vencidos", valor: retornosVencidos, tom: retornosVencidos > 0 ? "alerta" : "oliva" },
      { rotulo: "Áreas sem contrato", valor: categoriasSemContrato, tom: categoriasSemContrato > 0 ? "lavanda" : "oliva" },
    ],
  };

  const contasAtrasadas = listaDespesas.filter((d) => {
    if (d.status === "cancelado" || pagoDe(d) >= refDe(d)) return false;
    const dias = diasAte(d.due_date);
    return dias !== null && dias < 0;
  }).length;
  const contasVencendo = listaDespesas.filter((d) => {
    if (d.status === "cancelado" || pagoDe(d) >= refDe(d)) return false;
    const dias = diasAte(d.due_date);
    return dias !== null && dias >= 0 && dias <= 30;
  }).length;
  const orcamentoFatias: Fatia[] = [
    { chave: "pago", rotulo: "Já pago", valor: pago, href: "/admin/financeiro" },
    { chave: "a_pagar", rotulo: "Falta pagar", valor: pendente, href: "/admin/financeiro" },
  ];
  if (orcamentoTotal > 0) {
    orcamentoFatias.push(
      sobraDoOrcamento >= 0
        ? { chave: "livre", rotulo: "Ainda cabe", valor: sobraDoOrcamento, href: "/admin/financeiro" }
        : { chave: "estouro", rotulo: "Passou do orçamento", valor: -sobraDoOrcamento, href: "/admin/financeiro" },
    );
  }
  const resumoFinanceiro: DadosResumo["financeiro"] = {
    orcamento: orcamentoFatias,
    orcamentoTotal: sobraDoOrcamento < 0 ? comprometido : orcamentoTotal,
    categorias: porCategoria,
    numeros: [
      { rotulo: "Comprometido", valor: reais(comprometido), tom: "lavanda" },
      { rotulo: "Em atraso", valor: contasAtrasadas, tom: contasAtrasadas > 0 ? "alerta" : "oliva" },
      { rotulo: "Vencem em 30 dias", valor: contasVencendo, tom: contasVencendo > 0 ? "lavanda" : "oliva" },
    ],
  };

  const listaPosts = posts.data ?? [];
  const agora = Date.now();
  const inicioDaSemana = (d: Date) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // segunda-feira
    return s;
  };
  const semanas: Semana[] = Array.from({ length: 8 }, (_, i) => {
    const inicio = inicioDaSemana(new Date(agora - (7 - i) * 7 * 86_400_000));
    const fim = inicio.getTime() + 7 * 86_400_000;
    return {
      rotulo: inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: listaPosts.filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= inicio.getTime() && t < fim;
      }).length,
    };
  });
  const storiesNoAr = listaPosts.filter(
    (p) => p.kind === "story" && !p.is_hidden && (!p.expires_at || new Date(p.expires_at).getTime() > agora),
  ).length;
  const ocultas = listaPosts.filter((p) => p.is_hidden).length;
  const totalDenuncias = denuncias.count ?? 0;
  const resumoMural: DadosResumo["mural"] = {
    semanas,
    numeros: [
      { rotulo: "No feed", valor: listaPosts.filter((p) => p.kind === "feed" && !p.is_hidden).length, tom: "oliva" },
      { rotulo: "Stories no ar", valor: storiesNoAr, tom: "lavanda" },
      { rotulo: "Comentários", valor: comentarios.count ?? 0 },
      { rotulo: "Denúncias", valor: totalDenuncias, tom: totalDenuncias > 0 ? "alerta" : "oliva" },
      ...(ocultas > 0 ? [{ rotulo: "Ocultas", valor: ocultas } satisfies NumeroChave] : []),
    ],
  };

  const dadosResumo: DadosResumo = {
    convidados: resumoConvidados,
    tarefas: resumoTarefas,
    fornecedores: resumoFornecedores,
    financeiro: resumoFinanceiro,
    mural: resumoMural,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Central de controle</p>
          <h1 className="titulo-serif mt-2 text-3xl text-oliva sm:text-4xl lg:text-5xl">
            {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
          </h1>
        </div>
        <p className="max-w-md text-sm text-terra">
          Tudo o que tem data, mês a mês, até o dia. O que já venceu fica marcado no mês
          atual; os meses vazios lembram onde faltam prazos.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------- O termômetro ---------- */}
        <Bloco titulo="Onde estamos">
          <div className="space-y-6">
            <div>
              <p className="versalete text-xs text-terra">{CASAMENTO.dataCurta}</p>
              <p className="titulo-serif mt-1 text-6xl leading-none text-oliva tabular-nums lining-nums">
                {diasRestantes}
              </p>
              <p className="mt-1 text-sm text-terra">
                {diasRestantes === 1 ? "dia" : "dias"} · fase {fase.toLowerCase()}
              </p>
            </div>

            <AnelCompacto
              valor={confirmados.length}
              total={listaConvidados.length}
              rotulo="Confirmações"
              legenda={`${confirmados.length} de ${listaConvidados.length}${conta("nao_contatado") > 0 ? ` · ${conta("nao_contatado")} sem convite` : ""}${noColo > 0 ? ` · ${noColo} no colo` : ""}`}
              tom="lavanda"
            />
            <AnelCompacto
              valor={pago}
              total={orcamentoTotal || comprometido}
              rotulo="Orçamento pago"
              legenda={
                orcamentoTotal > 0
                  ? `${reais(pago)} de ${reais(orcamentoTotal)} · ${Math.round((comprometido / orcamentoTotal) * 100)}% comprometido`
                  : `${reais(pago)} pagos · sem orçamento definido`
              }
              tom="terra"
            />
            <AnelCompacto
              valor={feitas}
              total={listaTarefas.length}
              rotulo="Checklist"
              legenda={`${feitas} de ${listaTarefas.length}${atrasadas.length > 0 ? ` · ${atrasadas.length} atrasada${atrasadas.length === 1 ? "" : "s"}` : ` · ${listaTarefas.filter((t) => t.status === "fazendo").length} em andamento`}`}
            />

            {orcamentoTotal > 0 && sobraDoOrcamento < orcamentoTotal * 0.05 && (
              <Link
                href="/admin/financeiro"
                className={`block rounded-sm border px-3 py-2.5 text-sm underline-offset-4 transition-colors hover:underline ${sobraDoOrcamento < 0 ? "border-red-800/30 bg-red-50/60 text-red-900 hover:border-red-800/60" : "border-terra/20 bg-creme text-terra hover:border-oliva/50"}`}
              >
                {sobraDoOrcamento < 0
                  ? `Orçamento estourado em ${reais(-sobraDoOrcamento)}.`
                  : `Orçamento no limite: sobram ${reais(sobraDoOrcamento)}.`}
              </Link>
            )}
          </div>
        </Bloco>

        {/* ---------- Mês a mês ---------- */}
        <div className="lg:col-span-2">
          <Bloco
            titulo="Mês a mês"
            descricao="Pagamentos, tarefas e retornos de fornecedor na ordem em que chegam. Toque para abrir."
          >
            <MesAMes itens={itensDoMes} hoje={hoje} diaDoCasamento={diaDoCasamento} semPrazo={semPrazo} />
          </Bloco>
        </div>
      </div>

      <ResumoModulos dados={dadosResumo} />
    </div>
  );
}
