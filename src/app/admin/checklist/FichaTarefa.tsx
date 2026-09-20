"use client";

import { useState } from "react";
import { ROTULOS_PRIORIDADE, ROTULOS_TAREFA, type StatusTarefa, type SubTarefa, type Tarefa } from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Progresso, Selo } from "@/components/painel";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha } from "@/components/Ficha";

export const TOM_TAREFA: Record<StatusTarefa, "neutro" | "lavanda" | "oliva"> = {
  pendente: "neutro",
  fazendo: "lavanda",
  feito: "oliva",
};

/** Ciclo do avanço: a fazer → em andamento → concluído → a fazer. */
export const PROXIMO: Record<StatusTarefa, StatusTarefa> = {
  pendente: "fazendo",
  fazendo: "feito",
  feito: "pendente",
};

/**
 * A ficha de uma tarefa. O cartão da lista (e do quadro) é só o resumo;
 * subtarefas, prazo, responsável e observações ficam aqui, com espaço.
 */
export function FichaTarefa({
  tarefa,
  salvando,
  aoFechar,
  aoEditar,
  aoMover,
  aoRemover,
  aoAtualizar,
}: {
  tarefa: Tarefa;
  salvando: boolean;
  aoFechar: () => void;
  aoEditar: () => void;
  aoMover: (para: StatusTarefa) => void;
  aoRemover: () => void;
  /** Depois de mexer nas subtarefas: a lista recarrega e o cartão reflete. */
  aoAtualizar: () => void;
}) {
  const dias = diasAte(tarefa.due_date);
  const feita = tarefa.status === "feito";
  const atrasada = !feita && dias !== null && dias < 0;

  const prazo = (() => {
    if (!tarefa.due_date) return null;
    if (feita) return "concluída";
    if (dias === null) return null;
    if (dias < 0) return `atrasada há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
    if (dias === 0) return "é hoje";
    return `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`;
  })();

  return (
    <Ficha
      rotuloAria={`Tarefa: ${tarefa.title}`}
      aoFechar={aoFechar}
      cabecalho={
        <>
          <p className="versalete text-xs text-terra">{tarefa.phase}</p>
          <h2 className={`titulo-serif mt-1 text-2xl leading-tight ${feita ? "text-terra/85 line-through" : "text-oliva"}`}>
            {tarefa.title}
          </h2>
        </>
      }
      abaixoDoCabecalho={
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Selo tom={TOM_TAREFA[tarefa.status]}>{ROTULOS_TAREFA[tarefa.status]}</Selo>
          {tarefa.priority === "alta" && <Selo tom="alerta">Prioridade {ROTULOS_PRIORIDADE.alta}</Selo>}
          {atrasada && <Selo tom="alerta">atrasada</Selo>}
        </div>
      }
      rodape={
        <>
          <Botao type="button" onClick={() => aoMover(PROXIMO[tarefa.status])} disabled={salvando} className="flex-1 sm:flex-none">
            {salvando ? "Salvando…" : `Marcar ${ROTULOS_TAREFA[PROXIMO[tarefa.status]].toLowerCase()}`}
          </Botao>
          <Botao type="button" variante="contorno" onClick={aoEditar}>
            Editar
          </Botao>
          <button type="button" onClick={aoRemover} className={`${ACAO_FICHA} ml-auto px-3 text-red-800`}>
            Remover
          </button>
        </>
      }
    >
      <CartaoFicha titulo="Detalhes">
        <LinhaFicha rotulo="Categoria" valor={tarefa.category} />
        <LinhaFicha rotulo="Responsável" valor={tarefa.owner ?? "—"} />
        <LinhaFicha rotulo="Fase" valor={tarefa.phase} />
        <LinhaFicha rotulo="Prioridade" valor={ROTULOS_PRIORIDADE[tarefa.priority ?? "media"]} />
        <LinhaFicha
          rotulo="Prazo"
          valor={tarefa.due_date ? formatarData(tarefa.due_date) ?? "—" : "sem data"}
          detalhe={prazo}
          alerta={atrasada}
        />
      </CartaoFicha>

      <SubTarefas tarefa={tarefa} aoMudar={aoAtualizar} />

      {tarefa.notes && (
        <CartaoFicha titulo="Observações">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-terra">{tarefa.notes}</p>
        </CartaoFicha>
      )}
    </Ficha>
  );
}

/** Checklist interno da tarefa, com progresso. */
function SubTarefas({ tarefa, aoMudar }: { tarefa: Tarefa; aoMudar: () => void }) {
  const [itens, setItens] = useState<SubTarefa[]>(tarefa.itens ?? []);
  const [novo, setNovo] = useState("");

  const feitos = itens.filter((i) => i.done).length;

  async function alternar(id: string, done: boolean) {
    setItens((l) => l.map((i) => (i.id === id ? { ...i, done: !done } : i)));
    const supabase = criarClienteNavegador();
    await supabase.from("task_items").update({ done: !done }).eq("id", id);
    aoMudar();
  }

  async function adicionar() {
    const titulo = novo.trim();
    if (!titulo) return;
    const supabase = criarClienteNavegador();
    const { data } = await supabase
      .from("task_items")
      .insert({ task_id: tarefa.id, title: titulo, sort_order: itens.length + 1 })
      .select()
      .single();
    if (data) setItens((l) => [...l, data as SubTarefa]);
    setNovo("");
    aoMudar();
  }

  async function remover(id: string) {
    setItens((l) => l.filter((i) => i.id !== id));
    const supabase = criarClienteNavegador();
    await supabase.from("task_items").delete().eq("id", id);
    aoMudar();
  }

  return (
    <CartaoFicha
      titulo="Subtarefas"
      acao={
        itens.length > 0 ? (
          <span className="text-xs text-terra">
            {feitos} de {itens.length}
          </span>
        ) : null
      }
    >
      {itens.length > 0 && (
        <div className="mb-3">
          <Progresso atual={feitos} total={itens.length} tom={feitos === itens.length ? "oliva" : "lavanda"} />
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-terra">Quebre a tarefa em passos menores, se ajudar.</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => alternar(item.id, item.done)}
                className="h-5 w-5 shrink-0 accent-[var(--color-oliva)]"
                aria-label={item.title}
              />
              <span className={`min-w-0 flex-1 text-sm ${item.done ? "text-terra/85 line-through" : "text-terra"}`}>
                {item.title}
              </span>
              <button
                type="button"
                onClick={() => remover(item.id)}
                aria-label={`Remover ${item.title}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-terra/85 hover:text-red-800"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="campo"
          placeholder="Nova subtarefa…"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void adicionar();
            }
          }}
          aria-label="Nova subtarefa"
        />
        <button
          type="button"
          onClick={adicionar}
          className="versalete titulo-serif min-h-11 shrink-0 rounded-sm border border-oliva/40 px-3 text-xs text-oliva"
        >
          Add
        </button>
      </div>
    </CartaoFicha>
  );
}
