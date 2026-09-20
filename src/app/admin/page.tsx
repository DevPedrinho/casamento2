import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type {
  Despesa,
  Fornecedor,
  LocalEvento,
  StatusConvite,
  Tarefa,
} from "@/lib/tipos";
import {
  ROTULOS_CONVITE,
  ROTULOS_LOCAL,
} from "@/lib/tipos";
import { CASAMENTO, DATA_CASAMENTO } from "@/lib/config";
import { diasAte, reais } from "@/lib/formato";
import { contaNoTotal } from "@/lib/idade";
import { AnelCompacto, Bloco, Indicador, Vazio } from "@/components/painel";
import { faseDoMes, MesAMes, type ItemDoMes } from "./MesAMes";
import { BarrasInterativas } from "@/components/graficos";
import { Icone, type NomeIcone } from "@/components/Icones";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await criarClienteServidor();

  const [convidados, tarefas, despesas, fornecedores, presentes, posts, config, locais] =
    await Promise.all([
      supabase.from("guests").select(
        `id, full_name, invite_status, companions_planned, group_id, next_action,
         next_action_at, attends, gender, age, age_range, relationship_kind, side`,
      ),
      supabase.from("tasks").select("*").order("phase_order").order("sort_order"),
      supabase.from("expenses").select("*, payments(*)"),
      supabase.from("vendors").select("*"),
      supabase.from("gifts").select("id, is_active"),
      supabase.from("posts").select("id, kind, created_at, caption").order("created_at", { ascending: false }).limit(5),
      supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
      supabase.from("event_venues").select("*").order("sort_order"),
    ]);

  // Acompanhante já é cadastro próprio; criança de colo fica fora das contas.
  const listaConvidados = (convidados.data ?? []).filter(contaNoTotal);
  const noColo = (convidados.data ?? []).length - listaConvidados.length;
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
    .slice(0, 8)
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
              <p className={`rounded-sm border px-3 py-2.5 text-sm ${sobraDoOrcamento < 0 ? "border-red-800/30 bg-red-50/60 text-red-900" : "border-terra/20 bg-creme text-terra"}`}>
                {sobraDoOrcamento < 0
                  ? `Orçamento estourado em ${reais(-sobraDoOrcamento)}.`
                  : `Orçamento no limite: sobram ${reais(sobraDoOrcamento)}.`}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Atalho href="/admin/convidados" icone="convidados">Convidados</Atalho>
              <Atalho href="/admin/financeiro" icone="financeiro">Financeiro</Atalho>
              <Atalho href="/admin/checklist" icone="tarefas">Tarefas</Atalho>
            </div>
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

      {/* ---------- Gastos por categoria (fechado por padrão) ---------- */}
      <details className="group rounded-sm border border-terra/20 bg-creme-claro">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="titulo-serif block text-2xl text-oliva">Gastos por categoria</span>
            <span className="mt-1 block text-sm text-terra">
              O orçamento por área, e os números do financeiro.
            </span>
          </span>
          <span className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-oliva">
            <span className="group-open:hidden">abrir</span>
            <span className="hidden group-open:inline">fechar</span>
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
          </span>
        </summary>

        <div className="space-y-6 border-t border-terra/15 px-6 py-6 sm:px-8">
          <Bloco
            titulo="Gastos por categoria"
            descricao="Toque numa categoria para ver as despesas dela."
          >
            {porCategoria.length === 0 ? (
              <Vazio>Nenhum valor lançado no orçamento ainda.</Vazio>
            ) : (
              <BarrasInterativas itens={porCategoria} tom={2} moeda />
            )}
          </Bloco>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Indicador rotulo="Orçamento" valor={reais(orcamentoTotal)} />
            <Indicador rotulo="Comprometido" valor={reais(comprometido)} tom="lavanda" />
            <Indicador rotulo="Contratado" valor={reais(contratado)} tom="lavanda" />
            <Indicador rotulo="Pago" valor={reais(pago)} tom="oliva" />
            <Indicador rotulo="Pendente" valor={reais(pendente)} tom={pendente > 0 ? "alerta" : "oliva"} />
          </div>
        </div>
      </details>
    </div>
  );
}

/** Atalho pequeno para um módulo, com o ícone dele. */
function Atalho({ href, icone, children }: { href: string; icone: NomeIcone; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="titulo-serif inline-flex min-h-11 items-center gap-2 rounded-sm border border-terra/25 bg-creme px-3.5 text-base text-oliva transition-colors hover:border-oliva/50"
    >
      <Icone nome={icone} className="h-4 w-4" />
      {children}
    </Link>
  );
}
