import "server-only";

import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import { reais } from "@/lib/formato";

/**
 * O que cada assistente pode enxergar.
 *
 * Os dois contextos são montados com o cliente da SESSÃO de quem está
 * perguntando, nunca com uma chave de serviço. Assim as políticas do
 * banco continuam valendo dentro do chat: se o convidado não pode ler a
 * tabela de despesas no site, a IA também não lê — não existe caminho
 * por onde vazar o orçamento para quem não é dos noivos.
 */

const hoje = () => new Date().toISOString().slice(0, 10);

function diasAteOCasamento(dataISO: string): number {
  return Math.max(0, Math.ceil((new Date(dataISO).getTime() - Date.now()) / 86_400_000));
}

/** Junta linhas não vazias — o contexto é lido por um modelo, não por humanos. */
function bloco(titulo: string, linhas: (string | null | undefined | false)[]): string {
  const conteudo = linhas.filter(Boolean).join("\n");
  return conteudo ? `## ${titulo}\n${conteudo}` : "";
}

/* =====================================================================
   Painel dos noivos — a cerimonialista vê o planejamento inteiro
   ===================================================================== */

export async function contextoDoPainel(): Promise<string> {
  const supabase = await criarClienteServidor();
  const casamento = await carregarCasamento();
  const dia = hoje();

  const [convidados, grupos, tarefas, despesas, fornecedores, cronograma, presentes, orcamento] =
    await Promise.all([
      supabase
        .from("guests")
        .select("invite_status, companions_planned, access_code, code_sent_at, user_id, group_id, age, invited_by"),
      supabase.from("guest_groups").select("name, invite_limit"),
      supabase.from("tasks").select("title, status, due_date, phase, priority"),
      supabase.from("expenses").select("description, category, estimated_cents, contracted_cents, status, due_date, payments(amount_cents)"),
      supabase.from("vendors").select("name, category, status, agreed_cents, next_action, next_action_at"),
      supabase.from("day_schedule").select("starts_at, title, audience, owner").order("starts_at"),
      supabase.from("gifts").select("title, price_cents, is_active"),
      supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
    ]);

  const orcamentoTotal = orcamento.data?.budget_total_cents ?? 0;

  const lista = convidados.data ?? [];
  const conta = (s: string) => lista.filter((c) => c.invite_status === s).length;
  const confirmados = lista.filter((c) => c.invite_status === "confirmado");
  // Acompanhante já é cadastro próprio; criança de até 3 anos não conta.
  const pessoasConfirmadas = confirmados.filter((c) => c.age === null || c.age > 3).length;

  const listaTarefas = tarefas.data ?? [];
  const atrasadas = listaTarefas.filter(
    (t) => t.status !== "feito" && t.due_date && t.due_date < dia,
  );
  const proximas = listaTarefas
    .filter((t) => t.status !== "feito" && t.due_date && t.due_date >= dia)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 8);

  const listaDespesas = despesas.data ?? [];
  const pagoDe = (d: (typeof listaDespesas)[number]) =>
    (d.payments ?? []).reduce((s: number, p: { amount_cents: number }) => s + p.amount_cents, 0);
  const referencia = (d: (typeof listaDespesas)[number]) => d.contracted_cents ?? d.estimated_cents;
  const comprometido = listaDespesas.reduce((s, d) => s + referencia(d), 0);
  const pago = listaDespesas.reduce((s, d) => s + pagoDe(d), 0);
  const aVencer = listaDespesas
    .filter((d) => d.due_date && pagoDe(d) < referencia(d))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 6);

  const listaFornecedores = fornecedores.data ?? [];

  return [
    bloco("O casamento", [
      `Noivos: ${casamento.noiva} e ${casamento.noivo}`,
      `Data: ${casamento.dataExtenso} (faltam ${diasAteOCasamento(casamento.dataISO)} dias)`,
      `Cerimônia às ${casamento.horaCerimonia}, recepção às ${casamento.horaRecepcao}`,
      casamento.local.nome && `Local: ${casamento.local.nome} — ${casamento.local.cidade}`,
      `Traje: ${casamento.trajes}`,
      casamento.prazoRsvp && `Prazo para confirmar presença: ${casamento.prazoRsvp}`,
    ]),

    bloco("Convidados", [
      `Total na lista: ${lista.length}`,
      `Confirmados: ${confirmados.length} (${pessoasConfirmadas} pessoas contando para o buffet; acompanhantes já são cadastros próprios)`,
      `Aguardando resposta: ${conta("aguardando") + conta("convite_enviado") + conta("visualizou")}`,
      `Não vão: ${conta("nao_vai")}`,
      `Ainda sem convite enviado: ${conta("nao_contatado")}`,
      `Follow-up pendente: ${conta("follow_up")}`,
      `Já criaram cadastro no site: ${lista.filter((c) => c.user_id).length}`,
      `Códigos gerados: ${lista.filter((c) => c.access_code).length} · entregues: ${lista.filter((c) => c.code_sent_at).length}`,
    ]),

    bloco(
      "Famílias e tamanho do convite",
      (grupos.data ?? [])
        .slice(0, 40)
        .map((g) => `- ${g.name}: ${g.invite_limit ?? "sem limite definido"}`),
    ),

    bloco("Checklist", [
      `Tarefas: ${listaTarefas.length} · concluídas: ${listaTarefas.filter((t) => t.status === "feito").length}`,
      atrasadas.length > 0 && `ATRASADAS (${atrasadas.length}):`,
      ...atrasadas.slice(0, 8).map((t) => `- ${t.title} (venceu ${t.due_date})`),
      proximas.length > 0 && "Próximas:",
      ...proximas.map((t) => `- ${t.title} (até ${t.due_date}, fase ${t.phase})`),
    ]),

    bloco("Financeiro", [
      orcamentoTotal > 0
        ? `Orçamento total planejado: ${reais(orcamentoTotal)}`
        : "Orçamento total ainda não definido no painel.",
      `Comprometido: ${reais(comprometido)}`,
      `Pago: ${reais(pago)} · a pagar: ${reais(Math.max(0, comprometido - pago))}`,
      aVencer.length > 0 && "Próximos pagamentos:",
      ...aVencer.map((d) => `- ${d.description} (${d.category}) ${reais(referencia(d) - pagoDe(d))} até ${d.due_date}`),
    ]),

    bloco("Fornecedores", [
      `Total: ${listaFornecedores.length} · contratados: ${listaFornecedores.filter((f) => f.status === "contratado").length}`,
      ...listaFornecedores
        .slice(0, 25)
        .map((f) => `- ${f.name} (${f.category}): ${f.status}${f.next_action ? ` — próximo passo: ${f.next_action}` : ""}`),
    ]),

    bloco(
      "Cronograma do dia",
      (cronograma.data ?? []).map(
        (m) => `- ${String(m.starts_at).slice(0, 5)} ${m.title}${m.owner ? ` (${m.owner})` : ""} [${m.audience}]`,
      ),
    ),

    bloco("Presentes", [
      `Presentes ativos na lista: ${(presentes.data ?? []).filter((p) => p.is_active).length}`,
    ]),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* =====================================================================
   Site — o guia dos convidados
   ===================================================================== */

export async function contextoDoConvidado(): Promise<string> {
  const supabase = await criarClienteServidor();
  const casamento = await carregarCasamento();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [cronograma, presentes, capitulos, locais] = await Promise.all([
    supabase
      .from("day_schedule")
      .select("starts_at, title, description, location")
      .eq("audience", "convidados")
      .order("starts_at"),
    supabase.from("gifts").select("title, description, price_cents, category").eq("is_active", true),
    supabase.from("timeline_chapters").select("period, title, summary").order("sort_order"),
    supabase.from("event_venues").select("kind, name, address, city, starts_at, maps_url"),
  ]);

  // Só quem está logado tem um "meu convite"; e, mesmo assim, as políticas
  // do banco só devolvem a ficha da própria pessoa.
  let meuConvite = "";
  if (user) {
    const { data: eu } = await supabase
      .from("guests")
      .select("id, full_name, access_code, grupo:guest_groups!guests_group_id_fkey ( name, invite_limit )")
      .eq("user_id", user.id)
      .maybeSingle();

    if (eu) {
      const [{ data: limite }, { data: rsvp }, { data: acompanhantes }] = await Promise.all([
        supabase.rpc("limite_do_convite", { p_guest: eu.id }),
        supabase.from("rsvps").select("status, companions, message").eq("guest_id", eu.id).maybeSingle(),
        supabase.from("rsvp_companions").select("full_name, age").eq("guest_id", eu.id),
      ]);

      const grupoBruto = (eu as { grupo: unknown }).grupo;
      const grupo = (Array.isArray(grupoBruto) ? grupoBruto[0] : grupoBruto) as
        | { name: string }
        | null
        | undefined;

      meuConvite = bloco("Quem está perguntando", [
        `Nome: ${eu.full_name}`,
        grupo?.name && `Família no convite: ${grupo.name}`,
        `O convite dá direito a ${limite ?? 1} pessoa(s), contando com ela`,
        rsvp
          ? `Já respondeu: ${rsvp.status}${rsvp.companions ? ` com ${rsvp.companions} acompanhante(s)` : ""}`
          : "Ainda não confirmou presença",
        (acompanhantes ?? []).length > 0 &&
          `Acompanhantes informados: ${(acompanhantes ?? []).map((a) => `${a.full_name}${a.age ? ` (${a.age})` : ""}`).join(", ")}`,
      ]);
    }
  }

  return [
    bloco("O casamento", [
      `Noivos: ${casamento.noiva} e ${casamento.noivo}`,
      `Lema do casal: ${casamento.lema}`,
      `Frase do convite: ${casamento.frase}`,
      `Data: ${casamento.dataExtenso} (faltam ${diasAteOCasamento(casamento.dataISO)} dias)`,
      `Cerimônia às ${casamento.horaCerimonia}; recepção às ${casamento.horaRecepcao}`,
      `Traje: ${casamento.trajes}`,
      casamento.prazoRsvp && `Prazo para confirmar presença: ${casamento.prazoRsvp}`,
      casamento.regrasAcompanhante && `Regra dos acompanhantes: ${casamento.regrasAcompanhante}`,
      casamento.hashtag && `Hashtag: ${casamento.hashtag}`,
      casamento.instagram && `Instagram: ${casamento.instagram}`,
      casamento.contatoEmail && `E-mail de contato: ${casamento.contatoEmail}`,
    ]),

    bloco(
      "Onde vai ser",
      (locais.data ?? []).map(
        (l) =>
          `- ${l.kind === "cerimonia" ? "Cerimônia" : "Recepção"}: ${l.name}${l.address ? `, ${l.address}` : ""}${l.city ? ` — ${l.city}` : ""}${l.starts_at ? ` às ${l.starts_at}` : ""}`,
      ),
    ),

    bloco(
      "Como vai ser o dia",
      (cronograma.data ?? []).map(
        (m) =>
          `- ${String(m.starts_at).slice(0, 5)} ${m.title}${m.location ? ` (${m.location})` : ""}${m.description ? ` — ${m.description}` : ""}`,
      ),
    ),

    bloco(
      "A história do casal",
      (capitulos.data ?? []).map((c) => `- ${c.period}: ${c.title}${c.summary ? ` — ${c.summary}` : ""}`),
    ),

    bloco(
      "Lista de presentes",
      (presentes.data ?? [])
        .slice(0, 40)
        .map((p) => `- ${p.title} (${p.category})${p.price_cents ? ` ${reais(p.price_cents)}` : ""}`),
    ),

    bloco("Páginas do site", [
      "- /confirmar: confirmar presença e informar acompanhantes",
      "- /presentes: lista de presentes, com botão Presentear",
      "- /nossa-historia: a história do casal, com fotos e música",
      "- /mural: fotos e recados dos convidados (precisa estar logado)",
      "- /area-do-convidado: a resposta da pessoa e os dados do convite",
      "- /cadastrar: criar cadastro usando o código do convite",
    ]),

    meuConvite,
  ]
    .filter(Boolean)
    .join("\n\n");
}
