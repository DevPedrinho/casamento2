"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  ROTULOS_PRIORIDADE,
  ROTULOS_TAREFA,
  type Prioridade,
  type StatusTarefa,
  type Tarefa,
} from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Icone } from "@/components/Icones";
import { QuadroRolavel } from "@/components/QuadroRolavel";
import { Bloco, Indicador, Progresso, Selo, Vazio } from "@/components/painel";
import { FichaTarefa, PROXIMO, TOM_TAREFA } from "./FichaTarefa";

const FILTROS = ["Tudo", "A fazer", "Em andamento", "Concluído"] as const;
type Filtro = (typeof FILTROS)[number];

const PRAZOS = ["Qualquer prazo", "Hoje", "Esta semana", "Atrasadas", "Próximas"] as const;
type Prazo = (typeof PRAZOS)[number];

/** Duas formas de olhar o mesmo checklist. A lista é a padrão; o quadro, opção. */
const VISOES = ["lista", "kanban"] as const;
type Visao = (typeof VISOES)[number];
const ROTULOS_VISAO: Record<Visao, string> = { lista: "Lista", kanban: "Kanban" };

/** Colunas do quadro, na ordem do fluxo. */
const COLUNAS: StatusTarefa[] = ["pendente", "fazendo", "feito"];

/** Aplica o filtro de prazo sobre uma tarefa. */
function noPrazo(tarefa: Tarefa, prazo: Prazo): boolean {
  if (prazo === "Qualquer prazo") return true;
  const dias = diasAte(tarefa.due_date);
  if (dias === null) return false;
  if (prazo === "Hoje") return dias === 0;
  if (prazo === "Esta semana") return dias >= 0 && dias <= 7;
  if (prazo === "Atrasadas") return dias < 0 && tarefa.status !== "feito";
  return dias > 0;
}

export function Checklist({
  tarefas: doServidor,
  filtroInicial,
  prazoInicial,
}: {
  tarefas: Tarefa[];
  /** Vindos do dashboard pela URL: a lista já abre no recorte do gráfico. */
  filtroInicial?: string;
  prazoInicial?: string;
}) {
  const router = useRouter();
  const [visao, setVisao] = useState<Visao>("lista");
  const [filtro, setFiltro] = useState<Filtro>(() =>
    FILTROS.includes(filtroInicial as Filtro) ? (filtroInicial as Filtro) : "Tudo",
  );
  const [prazo, setPrazo] = useState<Prazo>(() =>
    PRAZOS.includes(prazoInicial as Prazo) ? (prazoInicial as Prazo) : "Qualquer prazo",
  );
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  // Movimentos que a tela já mostra enquanto o servidor não responde.
  // Cada um lembra de onde saiu: quando o dado do servidor muda, o registro
  // deixa de valer sozinho, sem precisar limpar nada.
  const [movidas, setMovidas] = useState<Record<string, { de: StatusTarefa; para: StatusTarefa }>>({});

  const tarefas = useMemo(
    () =>
      doServidor.map((t) => {
        const m = movidas[t.id];
        return m && m.de === t.status ? { ...t, status: m.para } : t;
      }),
    [doServidor, movidas],
  );

  const detalhe = tarefas.find((t) => t.id === detalheId) ?? null;

  const resumo = useMemo(() => {
    const feitas = tarefas.filter((t) => t.status === "feito").length;
    const fazendo = tarefas.filter((t) => t.status === "fazendo").length;
    const atrasadas = tarefas.filter((t) => {
      if (t.status === "feito") return false;
      const dias = diasAte(t.due_date);
      return dias !== null && dias < 0;
    }).length;
    return { feitas, fazendo, atrasadas, total: tarefas.length };
  }, [tarefas]);

  const visiveis = useMemo(() => {
    // No quadro as colunas já são os status; o filtro só faz sentido na lista.
    const alvo: StatusTarefa | null =
      visao === "kanban" || filtro === "Tudo" ? null
      : filtro === "A fazer" ? "pendente"
      : filtro === "Em andamento" ? "fazendo" : "feito";

    return tarefas.filter(
      (t) => (alvo === null || t.status === alvo) && noPrazo(t, prazo),
    );
  }, [filtro, prazo, tarefas, visao]);

  // Agrupa por fase preservando a ordem cronológica que veio do banco.
  const fases = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of visiveis) {
      const lista = mapa.get(t.phase);
      if (lista) lista.push(t);
      else mapa.set(t.phase, [t]);
    }
    return [...mapa.entries()];
  }, [visiveis]);

  /** Muda o status na hora na tela e depois no banco; se falhar, volta. */
  async function mover(tarefa: Tarefa, para: StatusTarefa) {
    if (tarefa.status === para) return;
    const original = doServidor.find((t) => t.id === tarefa.id)?.status ?? tarefa.status;
    setMovidas((m) => ({ ...m, [tarefa.id]: { de: original, para } }));
    setSalvandoId(tarefa.id);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("tasks").update({ status: para }).eq("id", tarefa.id);
    setSalvandoId(null);
    if (error) {
      setMovidas((m) => {
        const { [tarefa.id]: _desfeita, ...resto } = m;
        return resto;
      });
      return;
    }
    router.refresh();
  }

  async function remover(tarefa: Tarefa): Promise<boolean> {
    if (!confirm(`Remover "${tarefa.title}" do checklist?`)) return false;
    const supabase = criarClienteNavegador();
    await supabase.from("tasks").delete().eq("id", tarefa.id);
    router.refresh();
    return true;
  }

  function abrirForm(tarefa: Tarefa | null) {
    setEditando(tarefa);
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fecharForm() {
    setFormAberto(false);
    setEditando(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Tarefas" valor={resumo.total} />
        <Indicador rotulo="Concluídas" valor={resumo.feitas} tom="oliva" />
        <Indicador rotulo="Em andamento" valor={resumo.fazendo} tom="lavanda" />
        <Indicador
          rotulo="Atrasadas"
          valor={resumo.atrasadas}
          tom={resumo.atrasadas > 0 ? "alerta" : "neutro"}
          aoClicar={
            resumo.atrasadas > 0
              ? () => {
                  setVisao("lista");
                  setFiltro("Tudo");
                  setPrazo("Atrasadas");
                  document.getElementById("lista-tarefas")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              : undefined
          }
        />
      </div>

      <div className="rounded-sm border border-terra/20 bg-creme-claro px-6 py-5">
        <Progresso
          atual={resumo.feitas}
          total={resumo.total}
          rotulo={`${resumo.feitas} de ${resumo.total} concluídas`}
        />
      </div>

      <div id="lista-tarefas" className="scroll-mt-4" />
      <Bloco
        titulo="Checklist do casamento"
        descricao={
          visao === "kanban"
            ? "Arraste o cartão para outra coluna — no celular, use as setas. Toque no título para abrir a ficha."
            : "Toque na tarefa para abrir a ficha. O selo de status avança a tarefa: a fazer → em andamento → concluído."
        }
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Forma de ver as tarefas"
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
                  <Icone nome={v === "lista" ? "tarefas" : "kanban"} className="h-4 w-4" />
                  {ROTULOS_VISAO[v]}
                </button>
              ))}
            </div>
            <Botao
              type="button"
              variante="contorno"
              onClick={() => (formAberto ? fecharForm() : abrirForm(null))}
            >
              {formAberto ? "Fechar" : "Nova tarefa"}
            </Botao>
          </div>
        }
      >
        {formAberto && (
          <FormTarefa
            key={editando?.id ?? "nova"}
            tarefa={editando}
            aoSalvar={() => {
              fecharForm();
              router.refresh();
            }}
            aoCancelar={fecharForm}
          />
        )}

        <div className={`flex flex-wrap gap-2.5 ${visao === "lista" ? "mb-4" : "mb-7"}`}>
          {PRAZOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrazo(p)}
              aria-pressed={prazo === p}
              className={`versalete titulo-serif inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors ${
                prazo === p
                  ? "border-lavanda bg-lavanda text-creme-claro"
                  : "border-terra/30 text-terra hover:border-lavanda hover:text-lavanda"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {visao === "lista" && (
          <div className="mb-7 flex flex-wrap gap-2.5">
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={`versalete titulo-serif inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors ${
                  filtro === f
                    ? "border-oliva bg-oliva text-creme-claro"
                    : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {visiveis.length === 0 ? (
          <Vazio>Nenhuma tarefa nesse filtro.</Vazio>
        ) : visao === "kanban" ? (
          <QuadroTarefas
            tarefas={visiveis}
            salvandoId={salvandoId}
            aoMover={mover}
            aoAbrir={(t) => setDetalheId(t.id)}
          />
        ) : (
          <div className="space-y-9">
            {fases.map(([fase, itens]) => (
              <section key={fase}>
                <h3 className="versalete titulo-serif mb-4 border-b border-terra/20 pb-2 text-xs text-lavanda">
                  {fase} · {itens.length}
                </h3>
                <ul className="space-y-2.5">
                  {itens.map((tarefa) => (
                    <LinhaTarefa
                      key={tarefa.id}
                      tarefa={tarefa}
                      salvando={salvandoId === tarefa.id}
                      aoAvancar={() => mover(tarefa, PROXIMO[tarefa.status])}
                      aoAbrir={() => setDetalheId(tarefa.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Bloco>

      {detalhe && (
        <FichaTarefa
          tarefa={detalhe}
          salvando={salvandoId === detalhe.id}
          aoFechar={() => setDetalheId(null)}
          aoEditar={() => {
            setDetalheId(null);
            abrirForm(detalhe);
          }}
          aoMover={(para) => mover(detalhe, para)}
          aoRemover={() => {
            void remover(detalhe).then((removeu) => removeu && setDetalheId(null));
          }}
          aoAtualizar={() => router.refresh()}
        />
      )}
    </div>
  );
}

/**
 * O cartão da lista é só o resumo: título, onde está, prazo. O selo de
 * status é um botão à parte — avança sem abrir a ficha — e o resto da linha
 * abre a ficha. Botão dentro de botão não existe, por isso são irmãos.
 */
function LinhaTarefa({
  tarefa,
  salvando,
  aoAvancar,
  aoAbrir,
}: {
  tarefa: Tarefa;
  salvando: boolean;
  aoAvancar: () => void;
  aoAbrir: () => void;
}) {
  const dias = diasAte(tarefa.due_date);
  const feita = tarefa.status === "feito";
  const atrasada = !feita && dias !== null && dias < 0;
  const subtarefas = tarefa.itens ?? [];
  const feitos = subtarefas.filter((i) => i.done).length;

  return (
    <li
      className={`flex items-start gap-3 rounded-sm border px-4 py-3.5 transition-colors ${
        feita ? "border-terra/15 bg-creme/60" : "border-terra/20 bg-creme hover:border-oliva/40"
      }`}
    >
      <button
        type="button"
        onClick={aoAvancar}
        disabled={salvando}
        aria-label={`Marcar ${tarefa.title} como ${ROTULOS_TAREFA[PROXIMO[tarefa.status]].toLowerCase()}`}
        className="-my-2 inline-flex min-h-11 shrink-0 items-center py-2 disabled:opacity-50"
      >
        <Selo tom={TOM_TAREFA[tarefa.status]}>{ROTULOS_TAREFA[tarefa.status]}</Selo>
      </button>

      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Abrir ${tarefa.title}`}
        className="min-w-0 flex-1 text-left"
      >
        <p className={`titulo-serif text-lg leading-snug ${feita ? "text-terra/85 line-through" : "text-oliva"}`}>
          {tarefa.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-terra/85">
          {tarefa.priority === "alta" && !feita && <span className="font-medium text-red-800">Alta</span>}
          <span>{tarefa.category}</span>
          {tarefa.owner && <span>· {tarefa.owner}</span>}
          {tarefa.due_date && (
            <span className={atrasada ? "font-medium text-red-800" : ""}>
              · {formatarData(tarefa.due_date)}
              {atrasada && ` (atrasada ${Math.abs(dias!)}d)`}
            </span>
          )}
          {subtarefas.length > 0 && (
            <span>· {feitos}/{subtarefas.length} subtarefas</span>
          )}
        </p>
      </button>
    </li>
  );
}

/**
 * As mesmas tarefas em três colunas, uma por status. Arrastar e soltar
 * muda o status no desktop; as setas do cartão fazem o mesmo no toque.
 */
function QuadroTarefas({
  tarefas,
  salvandoId,
  aoMover,
  aoAbrir,
}: {
  tarefas: Tarefa[];
  salvandoId: string | null;
  aoMover: (tarefa: Tarefa, para: StatusTarefa) => void;
  aoAbrir: (tarefa: Tarefa) => void;
}) {
  const [colunaAlvo, setColunaAlvo] = useState<StatusTarefa | null>(null);

  function soltar(evento: DragEvent<HTMLElement>, status: StatusTarefa) {
    evento.preventDefault();
    setColunaAlvo(null);
    const id = evento.dataTransfer.getData("text/plain");
    const tarefa = tarefas.find((t) => t.id === id);
    if (tarefa) aoMover(tarefa, status);
  }

  return (
    <QuadroRolavel>
      <div className="flex w-max gap-4">
        {COLUNAS.map((status) => {
          const itens = tarefas.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-label={ROTULOS_TAREFA[status]}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setColunaAlvo(status);
              }}
              onDragLeave={() => setColunaAlvo((atual) => (atual === status ? null : atual))}
              onDrop={(e) => soltar(e, status)}
              className={`flex w-72 shrink-0 flex-col rounded-sm border p-3 transition-colors ${
                colunaAlvo === status ? "border-oliva bg-oliva/5" : "border-terra/20 bg-creme-claro/60"
              }`}
            >
              <h3 className="versalete titulo-serif mb-3 flex items-center justify-between px-1 text-xs text-lavanda">
                <span>{ROTULOS_TAREFA[status]}</span>
                <span className="text-terra/85">{itens.length}</span>
              </h3>

              {itens.length === 0 ? (
                <p className="px-1 py-8 text-center text-sm text-terra/85">Solte uma tarefa aqui.</p>
              ) : (
                <ul className="space-y-2.5">
                  {itens.map((tarefa) => (
                    <CartaoTarefa
                      key={tarefa.id}
                      tarefa={tarefa}
                      salvando={salvandoId === tarefa.id}
                      aoMover={(para) => aoMover(tarefa, para)}
                      aoAbrir={() => aoAbrir(tarefa)}
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

function CartaoTarefa({
  tarefa,
  salvando,
  aoMover,
  aoAbrir,
}: {
  tarefa: Tarefa;
  salvando: boolean;
  aoMover: (para: StatusTarefa) => void;
  aoAbrir: () => void;
}) {
  const dias = diasAte(tarefa.due_date);
  const feita = tarefa.status === "feito";
  const atrasada = !feita && dias !== null && dias < 0;
  const posicao = COLUNAS.indexOf(tarefa.status);
  const anterior = COLUNAS[posicao - 1] as StatusTarefa | undefined;
  const proxima = COLUNAS[posicao + 1] as StatusTarefa | undefined;
  const subtarefas = tarefa.itens ?? [];
  const feitos = subtarefas.filter((i) => i.done).length;

  const seta =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-terra/30 text-terra transition-colors hover:border-oliva hover:text-oliva disabled:opacity-30 disabled:hover:border-terra/30 disabled:hover:text-terra";

  return (
    <li>
      <article
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", tarefa.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`cursor-grab rounded-sm border bg-creme px-4 py-3 active:cursor-grabbing ${
          feita ? "border-terra/15" : "border-terra/20"
        } ${salvando ? "opacity-50" : ""}`}
      >
        <button type="button" onClick={aoAbrir} className="block w-full text-left">
          <p className={`titulo-serif text-base leading-snug ${feita ? "text-terra/85 line-through" : "text-oliva"}`}>
            {tarefa.title}
          </p>
          <p className="versalete mt-1 text-xs text-terra/85">{tarefa.phase}</p>

          <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-terra/85">
            {tarefa.priority === "alta" && <Selo tom="alerta">{ROTULOS_PRIORIDADE.alta}</Selo>}
            <span>{tarefa.category}</span>
            {tarefa.owner && <span>· {tarefa.owner}</span>}
            {tarefa.due_date && (
              <span className={atrasada ? "font-medium text-red-800" : ""}>
                · {formatarData(tarefa.due_date)}
                {atrasada && ` (atrasada ${Math.abs(dias!)}d)`}
              </span>
            )}
            {subtarefas.length > 0 && (
              <span>
                · {feitos}/{subtarefas.length} subtarefas
              </span>
            )}
          </span>
        </button>

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            disabled={!anterior || salvando}
            onClick={() => anterior && aoMover(anterior)}
            aria-label={anterior ? `Mover para ${ROTULOS_TAREFA[anterior]}` : "Já está na primeira coluna"}
            className={seta}
          >
            ←
          </button>
          <button
            type="button"
            disabled={!proxima || salvando}
            onClick={() => proxima && aoMover(proxima)}
            aria-label={proxima ? `Mover para ${ROTULOS_TAREFA[proxima]}` : "Já está na última coluna"}
            className={seta}
          >
            →
          </button>
        </div>
      </article>
    </li>
  );
}

const FASES = [
  "12+ meses antes",
  "9 a 12 meses antes",
  "6 a 9 meses antes",
  "3 a 6 meses antes",
  "1 a 3 meses antes",
  "Último mês",
  "Última semana",
  "No dia",
  "Depois do casamento",
  "Sem prazo",
];

/** Cria ou edita uma tarefa. Com `tarefa`, vem preenchido e salva por cima. */
function FormTarefa({
  tarefa,
  aoSalvar,
  aoCancelar,
}: {
  tarefa: Tarefa | null;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [title, setTitle] = useState(tarefa?.title ?? "");
  const [category, setCategory] = useState(tarefa?.category ?? "Geral");
  const [phase, setPhase] = useState(tarefa?.phase ?? FASES[0]);
  const [owner, setOwner] = useState(tarefa?.owner ?? "");
  const [dueDate, setDueDate] = useState(tarefa?.due_date ?? "");
  const [priority, setPriority] = useState<Prioridade>(tarefa?.priority ?? "media");
  const [notes, setNotes] = useState(tarefa?.notes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!title.trim()) {
      setErro("Dê um nome à tarefa.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      title: title.trim(),
      category: category.trim() || "Geral",
      phase,
      phase_order: FASES.includes(phase) ? FASES.indexOf(phase) + 1 : (tarefa?.phase_order ?? 99),
      owner: owner.trim() || null,
      due_date: dueDate || null,
      priority,
      notes: notes.trim() || null,
    };
    const { error } = tarefa
      ? await supabase.from("tasks").update(dados).eq("id", tarefa.id)
      : await supabase.from("tasks").insert(dados);
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    aoSalvar();
  }

  // Uma fase antiga que não está na lista continua selecionável.
  const fases = FASES.includes(phase) ? FASES : [phase, ...FASES];

  return (
    <form onSubmit={enviar} className="mb-8 space-y-5 rounded-sm border border-terra/20 bg-creme p-6">
      <h3 className="titulo-serif text-xl text-oliva">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h3>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="t-title">Tarefa</Rotulo>
          <input id="t-title" required className="campo" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="t-cat">Categoria</Rotulo>
          <input id="t-cat" className="campo" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Rotulo htmlFor="t-fase">Fase</Rotulo>
          <select id="t-fase" className="campo" value={phase} onChange={(e) => setPhase(e.target.value)}>
            {fases.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <Rotulo htmlFor="t-owner">Responsável</Rotulo>
          <input id="t-owner" className="campo" placeholder="Pedro, Deysiane, os dois…" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="t-data">Prazo</Rotulo>
          <input id="t-data" type="date" className="campo" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="t-prio">Prioridade</Rotulo>
          <select id="t-prio" className="campo" value={priority} onChange={(e) => setPriority(e.target.value as Prioridade)}>
            {(Object.keys(ROTULOS_PRIORIDADE) as Prioridade[]).map((p) => (
              <option key={p} value={p}>{ROTULOS_PRIORIDADE[p]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Rotulo htmlFor="t-notes">Observações</Rotulo>
        <textarea id="t-notes" rows={2} className="campo resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : tarefa ? "Salvar alterações" : "Adicionar tarefa"}
        </Botao>
        <Botao type="button" variante="contorno" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
