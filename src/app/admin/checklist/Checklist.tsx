"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ROTULOS_TAREFA, type StatusTarefa, type Tarefa } from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Progresso, Selo, Vazio } from "@/components/painel";

/** Ciclo do clique no status: a fazer → em andamento → concluído → a fazer. */
const PROXIMO: Record<StatusTarefa, StatusTarefa> = {
  pendente: "fazendo",
  fazendo: "feito",
  feito: "pendente",
};

const FILTROS = ["Tudo", "A fazer", "Em andamento", "Concluído"] as const;
type Filtro = (typeof FILTROS)[number];

export function Checklist({ tarefas }: { tarefas: Tarefa[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("Tudo");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);

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
    if (filtro === "Tudo") return tarefas;
    const alvo: StatusTarefa =
      filtro === "A fazer" ? "pendente" : filtro === "Em andamento" ? "fazendo" : "feito";
    return tarefas.filter((t) => t.status === alvo);
  }, [filtro, tarefas]);

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

  async function alternarStatus(tarefa: Tarefa) {
    setSalvandoId(tarefa.id);
    const supabase = criarClienteNavegador();
    await supabase.from("tasks").update({ status: PROXIMO[tarefa.status] }).eq("id", tarefa.id);
    setSalvandoId(null);
    router.refresh();
  }

  async function remover(tarefa: Tarefa) {
    if (!confirm(`Remover "${tarefa.title}" do checklist?`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("tasks").delete().eq("id", tarefa.id);
    router.refresh();
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
        />
      </div>

      <div className="rounded-sm border border-terra/20 bg-creme-claro px-6 py-5">
        <Progresso
          atual={resumo.feitas}
          total={resumo.total}
          rotulo={`${resumo.feitas} de ${resumo.total} concluídas`}
        />
      </div>

      <Bloco
        titulo="Checklist do casamento"
        descricao="Clique no status para avançar: a fazer → em andamento → concluído."
        acao={
          <Botao type="button" variante="contorno" onClick={() => setNovaAberta((v) => !v)}>
            {novaAberta ? "Fechar" : "Nova tarefa"}
          </Botao>
        }
      >
        {novaAberta && (
          <FormNovaTarefa
            aoSalvar={() => {
              setNovaAberta(false);
              router.refresh();
            }}
          />
        )}

        <div className="mb-7 flex flex-wrap gap-2.5">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`versalete titulo-serif rounded-full border px-4 py-2 text-xs transition-colors ${
                filtro === f
                  ? "border-oliva bg-oliva text-creme-claro"
                  : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {fases.length === 0 ? (
          <Vazio>Nenhuma tarefa nesse filtro.</Vazio>
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
                      aoAlternar={() => alternarStatus(tarefa)}
                      aoRemover={() => remover(tarefa)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Bloco>
    </div>
  );
}

function LinhaTarefa({
  tarefa,
  salvando,
  aoAlternar,
  aoRemover,
}: {
  tarefa: Tarefa;
  salvando: boolean;
  aoAlternar: () => void;
  aoRemover: () => void;
}) {
  const dias = diasAte(tarefa.due_date);
  const atrasada = tarefa.status !== "feito" && dias !== null && dias < 0;
  const feita = tarefa.status === "feito";

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-4 rounded-sm border px-5 py-4 transition-colors ${
        feita ? "border-terra/15 bg-creme/60" : "border-terra/20 bg-creme"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoAlternar}
            disabled={salvando}
            aria-label={`Mudar status de ${tarefa.title}`}
            className="disabled:opacity-50"
          >
            <Selo tom={feita ? "oliva" : tarefa.status === "fazendo" ? "lavanda" : "neutro"}>
              {ROTULOS_TAREFA[tarefa.status]}
            </Selo>
          </button>
          <p className={`titulo-serif text-lg ${feita ? "text-terra/60 line-through" : "text-oliva"}`}>
            {tarefa.title}
          </p>
        </div>

        {tarefa.notes && <p className="mt-2 text-sm leading-relaxed text-terra">{tarefa.notes}</p>}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-terra/85">
          <span>{tarefa.category}</span>
          {tarefa.owner && <span>· {tarefa.owner}</span>}
          {tarefa.due_date && (
            <span className={atrasada ? "font-medium text-red-800" : ""}>
              · {formatarData(tarefa.due_date)}
              {atrasada && ` (atrasada ${Math.abs(dias!)}d)`}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={aoRemover}
        className="versalete shrink-0 text-xs text-red-800 underline underline-offset-4"
      >
        Remover
      </button>
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

function FormNovaTarefa({ aoSalvar }: { aoSalvar: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Geral");
  const [phase, setPhase] = useState(FASES[0]);
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
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
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      category: category.trim() || "Geral",
      phase,
      phase_order: FASES.indexOf(phase) + 1,
      owner: owner.trim() || null,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    });
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    aoSalvar();
  }

  return (
    <form onSubmit={enviar} className="mb-8 space-y-5 rounded-sm border border-terra/20 bg-creme p-6">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="t-title">Tarefa</Rotulo>
          <input id="t-title" required className="campo" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="t-cat">Categoria</Rotulo>
          <input id="t-cat" className="campo" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Rotulo htmlFor="t-fase">Fase</Rotulo>
          <select id="t-fase" className="campo" value={phase} onChange={(e) => setPhase(e.target.value)}>
            {FASES.map((f) => (
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
      </div>

      <div>
        <Rotulo htmlFor="t-notes">Observações</Rotulo>
        <textarea id="t-notes" rows={2} className="campo resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Botao type="submit" disabled={salvando}>
        {salvando ? "Salvando…" : "Adicionar tarefa"}
      </Botao>
    </form>
  );
}
