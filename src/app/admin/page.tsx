import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Despesa, Fornecedor, LocalEvento, StatusConvite, Tarefa } from "@/lib/tipos";
import { ROTULOS_CONVITE, ROTULOS_LOCAL } from "@/lib/tipos";
import { CASAMENTO, DATA_CASAMENTO } from "@/lib/config";
import { diasAte, formatarData, reais } from "@/lib/formato";
import { Anel, BarrasCategoria, Bloco, Indicador, Progresso, Selo, Vazio } from "@/components/painel";
import { Icone, type NomeIcone } from "@/components/Icones";

export const dynamic = "force-dynamic";

type Acao = { texto: string; detalhe: string; href: string; urgente: boolean; icone: NomeIcone };

export default async function Dashboard() {
  const supabase = await criarClienteServidor();

  const [convidados, tarefas, despesas, fornecedores, presentes, posts, config, locais] =
    await Promise.all([
      supabase.from("guests").select(
        "id, full_name, invite_status, companions_planned, group_id, next_action, next_action_at",
      ),
      supabase.from("tasks").select("*").order("phase_order").order("sort_order"),
      supabase.from("expenses").select("*, payments(*)"),
      supabase.from("vendors").select("*"),
      supabase.from("gifts").select("id, is_active"),
      supabase.from("posts").select("id, kind, created_at, caption").order("created_at", { ascending: false }).limit(5),
      supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
      supabase.from("event_venues").select("*").order("sort_order"),
    ]);

  const listaConvidados = convidados.data ?? [];
  const listaTarefas = (tarefas.data ?? []) as Tarefa[];
  const listaDespesas = (despesas.data ?? []) as Despesa[];
  const listaFornecedores = (fornecedores.data ?? []) as Fornecedor[];
  const orcamentoTotal = config.data?.budget_total_cents ?? 0;

  // ---------- Convidados ----------
  const conta = (s: StatusConvite) => listaConvidados.filter((c) => c.invite_status === s).length;
  const confirmados = listaConvidados.filter((c) => c.invite_status === "confirmado");
  const pessoas = confirmados.reduce((s, c) => s + 1 + (c.companions_planned ?? 0), 0);
  const familias = new Set(listaConvidados.map((c) => c.group_id).filter(Boolean)).size;

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

  const proximosPagamentos = listaDespesas
    .filter((d) => d.due_date && pagoDe(d) < refDe(d))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

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
    .map(([rotulo, v]) => ({ rotulo, valor: v.pago, secundario: v.previsto }));

  // ---------- Próximas ações ----------
  const acoes: Acao[] = [];
  if (conta("nao_contatado") > 0) {
    acoes.push({
      texto: `Enviar convite para ${conta("nao_contatado")} convidados`,
      detalhe: "Ainda não foram contatados",
      href: "/admin/crm",
      urgente: false,
      icone: "convidados",
    });
  }
  if (conta("follow_up") > 0) {
    acoes.push({
      texto: `Retomar contato com ${conta("follow_up")} convidados`,
      detalhe: "Marcados como follow-up",
      href: "/admin/crm",
      urgente: true,
      icone: "crm",
    });
  }
  for (const t of atrasadas.slice(0, 3)) {
    acoes.push({
      texto: t.title,
      detalhe: `Venceu em ${formatarData(t.due_date)}`,
      href: "/admin/checklist",
      urgente: true,
      icone: "tarefas",
    });
  }
  for (const d of proximosPagamentos.slice(0, 3)) {
    const dias = diasAte(d.due_date);
    acoes.push({
      texto: `Pagar ${d.description}`,
      detalhe: `${reais(refDe(d) - pagoDe(d))} · ${dias !== null && dias < 0 ? "vencido" : `vence ${formatarData(d.due_date)}`}`,
      href: "/admin/financeiro",
      urgente: dias !== null && dias <= 7,
      icone: "financeiro",
    });
  }
  for (const f of listaFornecedores.filter((f) => f.next_action_at && f.status !== "contratado").slice(0, 2)) {
    acoes.push({
      texto: `${f.next_action ?? "Retornar"} — ${f.name}`,
      detalhe: formatarData(f.next_action_at) ?? "",
      href: "/admin/fornecedores",
      urgente: (diasAte(f.next_action_at) ?? 99) <= 3,
      icone: "fornecedores",
    });
  }
  if (orcamentoTotal === 0) {
    acoes.push({
      texto: "Definir o orçamento total do casamento",
      detalhe: "Sem ele, não dá para saber se o planejamento cabe",
      href: "/admin/financeiro",
      urgente: false,
      icone: "financeiro",
    });
  }

  const diasRestantes = Math.max(
    0,
    Math.ceil((DATA_CASAMENTO.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Central de controle</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva sm:text-5xl">
            {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
          </h1>
        </div>
        <div className="rounded-sm border border-terra/20 bg-creme-claro px-7 py-4 text-center">
          <span className="titulo-serif block text-4xl text-oliva tabular-nums lining-nums">
            {diasRestantes}
          </span>
          <span className="versalete mt-1 block text-xs text-terra">
            dias · {CASAMENTO.dataCurta}
          </span>
        </div>
      </header>

      {/* ---------- Convidados ---------- */}
      <section>
        <h2 className="versalete titulo-serif mb-4 text-xs text-lavanda">Convidados</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Indicador rotulo="Total" valor={listaConvidados.length} />
          <Indicador rotulo="Confirmados" valor={confirmados.length} tom="oliva" detalhe={`${pessoas} pessoas`} />
          <Indicador rotulo="Aguardando" valor={conta("aguardando") + conta("convite_enviado") + conta("visualizou")} tom="lavanda" />
          <Indicador rotulo="Não irão" valor={conta("nao_vai")} />
          <Indicador rotulo="Sem convite" valor={conta("nao_contatado")} tom={conta("nao_contatado") > 0 ? "alerta" : "oliva"} />
          <Indicador rotulo="Famílias" valor={familias} />
        </div>
      </section>

      {/* ---------- Organização ---------- */}
      <section>
        <h2 className="versalete titulo-serif mb-4 text-xs text-lavanda">Organização</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Indicador rotulo="Tarefas" valor={listaTarefas.length} />
          <Indicador rotulo="Concluídas" valor={feitas} tom="oliva" />
          <Indicador rotulo="Atrasadas" valor={atrasadas.length} tom={atrasadas.length > 0 ? "alerta" : "oliva"} />
          <Indicador rotulo="Fornecedores" valor={listaFornecedores.length} detalhe={`${listaFornecedores.filter((f) => f.status === "contratado").length} fechados`} />
          <Indicador rotulo="Presentes" valor={(presentes.data ?? []).length} />
          <Indicador rotulo="Mural" valor={(posts.data ?? []).length} detalhe="publicações" />
        </div>
      </section>

      {/* ---------- Financeiro ---------- */}
      <section>
        <h2 className="versalete titulo-serif mb-4 text-xs text-lavanda">Financeiro</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Indicador rotulo="Orçamento" valor={reais(orcamentoTotal)} />
          <Indicador rotulo="Comprometido" valor={reais(comprometido)} tom="lavanda" />
          <Indicador rotulo="Contratado" valor={reais(contratado)} tom="lavanda" />
          <Indicador rotulo="Pago" valor={reais(pago)} tom="oliva" />
          <Indicador rotulo="Pendente" valor={reais(pendente)} tom={pendente > 0 ? "alerta" : "oliva"} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------- Próximas ações ---------- */}
        <div className="lg:col-span-2">
          <Bloco
            titulo="Próximas ações"
            descricao="O que precisa acontecer agora para o casamento seguir organizado."
          >
            {acoes.length === 0 ? (
              <Vazio>Nada pendente. Aproveitem o momento.</Vazio>
            ) : (
              <ul className="space-y-2.5">
                {acoes.slice(0, 8).map((acao, i) => (
                  <li key={`${acao.href}-${i}`}>
                    <Link
                      href={acao.href}
                      className={`flex items-center gap-4 rounded-sm border px-4 py-3.5 transition-colors ${
                        acao.urgente
                          ? "border-red-800/25 bg-red-50/60 hover:border-red-800/50"
                          : "border-terra/20 bg-creme hover:border-oliva/40"
                      }`}
                    >
                      <Icone
                        nome={acao.icone}
                        className={`h-5 w-5 shrink-0 ${acao.urgente ? "text-red-800" : "text-oliva"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="titulo-serif block truncate text-base text-oliva">
                          {acao.texto}
                        </span>
                        <span className="block truncate text-sm text-terra">{acao.detalhe}</span>
                      </span>
                      {acao.urgente && <Selo tom="alerta">urgente</Selo>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        </div>

        {/* ---------- Progresso ---------- */}
        <Bloco titulo="Progresso">
          <div className="space-y-8">
            <Anel
              valor={feitas}
              total={listaTarefas.length}
              rotulo="Checklist"
              legenda={`${feitas} de ${listaTarefas.length} tarefas`}
            />
            <Progresso
              atual={confirmados.length}
              total={listaConvidados.length}
              rotulo="Confirmações"
              tom="lavanda"
            />
            {orcamentoTotal > 0 && (
              <Progresso
                atual={comprometido}
                total={orcamentoTotal}
                rotulo="Orçamento comprometido"
                tom={comprometido > orcamentoTotal ? "alerta" : "oliva"}
              />
            )}
          </div>
        </Bloco>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Gastos por categoria ---------- */}
        <Bloco titulo="Gastos por categoria" descricao="Barra cheia é o pago; a clara, o previsto.">
          {porCategoria.length === 0 ? (
            <Vazio>Nenhum valor lançado no orçamento ainda.</Vazio>
          ) : (
            <BarrasCategoria itens={porCategoria} formatar={reais} />
          )}
        </Bloco>

        {/* ---------- Onde é a festa ---------- */}
        <Bloco titulo="O grande dia">
          <ul className="space-y-5">
            {((locais.data ?? []) as LocalEvento[]).map((local) => (
              <li key={local.id} className="rounded-sm border border-terra/20 bg-creme p-5">
                <p className="versalete text-xs text-lavanda">
                  {ROTULOS_LOCAL[local.kind]}
                  {local.starts_at && ` · ${local.starts_at}`}
                </p>
                <p className="titulo-serif mt-2 text-xl text-oliva">{local.name}</p>
                <p className="mt-1 text-sm text-terra">
                  {[local.address, local.city].filter(Boolean).join(" — ")}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/locais"
            className="versalete mt-5 inline-block text-xs text-oliva underline underline-offset-4"
          >
            Editar informações do evento
          </Link>
        </Bloco>
      </div>
    </div>
  );
}
