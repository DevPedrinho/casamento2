import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Despesa, Fornecedor, Tarefa } from "@/lib/tipos";
import { CASAMENTO, DATA_CASAMENTO } from "@/lib/config";
import { diasAte, formatarData, reais } from "@/lib/formato";
import { Bloco, Indicador, Progresso, Selo, Vazio } from "@/components/painel";
import { BotaoSair } from "@/components/BotaoSair";

export const dynamic = "force-dynamic";

export default async function VisaoGeral() {
  const supabase = await criarClienteServidor();

  const [tarefas, rsvps, despesas, fornecedores, config] = await Promise.all([
    supabase.from("tasks").select("*").order("phase_order").order("sort_order"),
    supabase.from("rsvps").select("status, companions"),
    supabase.from("expenses").select("*, payments(*)"),
    supabase.from("vendors").select("*"),
    supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
  ]);

  const listaTarefas = (tarefas.data ?? []) as Tarefa[];
  const listaDespesas = (despesas.data ?? []) as Despesa[];
  const listaFornecedores = (fornecedores.data ?? []) as Fornecedor[];
  const orcamentoTotal = config.data?.budget_total_cents ?? 0;

  // ---------- Checklist ----------
  const feitas = listaTarefas.filter((t) => t.status === "feito").length;
  const atrasadas = listaTarefas.filter((t) => {
    if (t.status === "feito") return false;
    const dias = diasAte(t.due_date);
    return dias !== null && dias < 0;
  });

  // ---------- Convidados ----------
  const confirmados = (rsvps.data ?? []).filter((r) => r.status === "confirmado");
  const pessoas = confirmados.reduce((s, r) => s + 1 + (r.companions ?? 0), 0);

  // ---------- Financeiro ----------
  const pago = listaDespesas.reduce(
    (s, d) => s + (d.payments ?? []).reduce((t, p) => t + p.amount_cents, 0),
    0,
  );
  const comprometido = listaDespesas.reduce(
    (s, d) => s + (d.contracted_cents ?? d.estimated_cents),
    0,
  );

  // ---------- Fornecedores ----------
  const contratados = listaFornecedores.filter((f) => f.status === "contratado").length;

  // ---------- Agenda: o que exige atenção agora ----------
  const proximasTarefas = listaTarefas
    .filter((t) => t.status !== "feito" && t.due_date)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

  const proximosPagamentos = listaDespesas
    .filter((d) => {
      const totalPago = (d.payments ?? []).reduce((t, p) => t + p.amount_cents, 0);
      return d.due_date && totalPago < (d.contracted_cents ?? d.estimated_cents);
    })
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

  const retornos = listaFornecedores
    .filter(
      (f) => f.next_action_at && f.status !== "contratado" && f.status !== "descartado",
    )
    .sort((a, b) => (a.next_action_at ?? "").localeCompare(b.next_action_at ?? ""))
    .slice(0, 5);

  const diasParaOCasamento = Math.max(
    0,
    Math.ceil((DATA_CASAMENTO.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="space-y-8">
      <div className="rounded-sm border border-terra/20 bg-creme-claro px-6 py-7 text-center">
        <p className="versalete text-xs text-terra">Faltam</p>
        <p className="titulo-serif mt-2 text-5xl text-oliva tabular-nums lining-nums">{diasParaOCasamento}</p>
        <p className="versalete mt-2 text-xs text-terra">
          dias para {CASAMENTO.dataCurta}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Checklist"
          valor={`${feitas}/${listaTarefas.length}`}
          detalhe={atrasadas.length > 0 ? `${atrasadas.length} atrasada(s)` : "em dia"}
          tom={atrasadas.length > 0 ? "alerta" : "oliva"}
        />
        <Indicador rotulo="Convidados confirmados" valor={pessoas} tom="oliva" />
        <Indicador rotulo="Fornecedores fechados" valor={contratados} tom="lavanda" />
        <Indicador rotulo="Já pago" valor={reais(pago)} tom="oliva" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloco titulo="Andamento do checklist">
          {listaTarefas.length === 0 ? (
            <Vazio>Nenhuma tarefa cadastrada.</Vazio>
          ) : (
            <>
              <Progresso
                atual={feitas}
                total={listaTarefas.length}
                rotulo={`${feitas} de ${listaTarefas.length} concluídas`}
              />
              <Link
                href="/admin/checklist"
                className="versalete mt-6 inline-block text-xs text-oliva underline underline-offset-4"
              >
                Abrir o checklist
              </Link>
            </>
          )}
        </Bloco>

        <Bloco titulo="Orçamento">
          {orcamentoTotal === 0 ? (
            <>
              <Vazio>Orçamento total ainda não definido.</Vazio>
              <Link
                href="/admin/financeiro"
                className="versalete inline-block text-xs text-oliva underline underline-offset-4"
              >
                Definir agora
              </Link>
            </>
          ) : (
            <>
              <Progresso
                atual={comprometido}
                total={orcamentoTotal}
                rotulo={`${reais(comprometido)} de ${reais(orcamentoTotal)}`}
                tom={comprometido > orcamentoTotal ? "alerta" : "oliva"}
              />
              <Link
                href="/admin/financeiro"
                className="versalete mt-6 inline-block text-xs text-oliva underline underline-offset-4"
              >
                Abrir o financeiro
              </Link>
            </>
          )}
        </Bloco>
      </div>

      <Bloco titulo="O que pede atenção" descricao="Prazos, pagamentos e retornos mais próximos.">
        <div className="grid gap-8 lg:grid-cols-3">
          <ListaAgenda
            titulo="Próximas tarefas"
            vazio="Nenhuma tarefa com prazo."
            itens={proximasTarefas.map((t) => ({
              chave: t.id,
              texto: t.title,
              data: t.due_date,
            }))}
          />
          <ListaAgenda
            titulo="Pagamentos a vencer"
            vazio="Nenhum pagamento com vencimento."
            itens={proximosPagamentos.map((d) => ({
              chave: d.id,
              texto: d.description,
              data: d.due_date,
            }))}
          />
          <ListaAgenda
            titulo="Retornar para fornecedor"
            vazio="Nenhum retorno agendado."
            itens={retornos.map((f) => ({
              chave: f.id,
              texto: `${f.name}${f.next_action ? ` — ${f.next_action}` : ""}`,
              data: f.next_action_at,
            }))}
          />
        </div>
      </Bloco>

      <div className="text-center">
        <BotaoSair />
      </div>
    </div>
  );
}

function ListaAgenda({
  titulo,
  itens,
  vazio,
}: {
  titulo: string;
  itens: { chave: string; texto: string; data: string | null }[];
  vazio: string;
}) {
  return (
    <section>
      <h3 className="versalete titulo-serif mb-4 border-b border-terra/20 pb-2 text-xs text-lavanda">
        {titulo}
      </h3>
      {itens.length === 0 ? (
        <p className="text-sm text-terra/70">{vazio}</p>
      ) : (
        <ul className="space-y-3">
          {itens.map((item) => {
            const dias = diasAte(item.data);
            const atrasado = dias !== null && dias < 0;
            return (
              <li key={item.chave} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 text-sm text-terra">{item.texto}</span>
                {atrasado ? (
                  <Selo tom="alerta">{formatarData(item.data)}</Selo>
                ) : (
                  <span className="text-sm text-terra/80 tabular-nums lining-nums">
                    {formatarData(item.data)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
