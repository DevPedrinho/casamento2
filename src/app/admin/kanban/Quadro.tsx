"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import {
  CATEGORIAS_KANBAN,
  ROTULOS_PRIORIDADE,
  type CardKanban,
  type ColunaKanban,
  type Fornecedor,
  type Prioridade,
} from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { CardDetalhe } from "./CardDetalhe";

const TOM_PRIORIDADE: Record<Prioridade, "neutro" | "lavanda" | "alerta"> = {
  baixa: "neutro",
  media: "lavanda",
  alta: "alerta",
};

type Fornecedores = Pick<Fornecedor, "id" | "name">[];

export function Quadro({
  colunas,
  cards,
  fornecedores,
}: {
  colunas: ColunaKanban[];
  cards: CardKanban[];
  fornecedores: Fornecedores;
}) {
  const router = useRouter();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);
  const [otimista, setOtimista] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<CardKanban | null>(null);
  const [novoNaColuna, setNovoNaColuna] = useState<string | null>(null);
  const [categoria, setCategoria] = useState("todas");

  const colunaDe = (c: CardKanban) => otimista[c.id] ?? c.column_id;

  const visiveis = useMemo(
    () => (categoria === "todas" ? cards : cards.filter((c) => c.category === categoria)),
    [cards, categoria],
  );

  const porColuna = useMemo(
    () =>
      colunas.map((col) => ({
        coluna: col,
        itens: visiveis.filter((c) => colunaDe(c) === col.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colunas, visiveis, otimista],
  );

  const concluidos = porColuna.find((c) => c.coluna.is_done)?.itens.length ?? 0;
  const atrasados = cards.filter((c) => {
    const col = colunas.find((k) => k.id === colunaDe(c));
    if (col?.is_done) return false;
    const d = diasAte(c.due_date);
    return d !== null && d < 0;
  }).length;

  async function mover(card: CardKanban, colunaId: string) {
    if (colunaDe(card) === colunaId) return;
    const anterior = colunaDe(card);
    setOtimista((o) => ({ ...o, [card.id]: colunaId }));

    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("kanban_cards")
      .update({ column_id: colunaId })
      .eq("id", card.id);

    if (error) {
      setOtimista((o) => ({ ...o, [card.id]: anterior }));
      return;
    }
    router.refresh();
  }

  function aoSoltar(evento: DragEvent, colunaId: string) {
    evento.preventDefault();
    setColunaAlvo(null);
    setArrastando(null);
    const id = evento.dataTransfer.getData("text/plain");
    const card = cards.find((c) => c.id === id);
    if (card) void mover(card, colunaId);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Organização do projeto</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Quadro do casamento</h1>
        </div>
        <Botao type="button" onClick={() => setNovoNaColuna(colunas[0]?.id ?? null)}>
          <Icone nome="mais" className="h-4 w-4" />
          Novo card
        </Botao>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Cards" valor={cards.length} />
        <Indicador rotulo="Concluídos" valor={concluidos} tom="oliva" />
        <Indicador rotulo="Em andamento" valor={cards.length - concluidos} tom="lavanda" />
        <Indicador rotulo="Atrasados" valor={atrasados} tom={atrasados > 0 ? "alerta" : "oliva"} />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <FiltroCat ativo={categoria === "todas"} onClick={() => setCategoria("todas")}>
          Todas
        </FiltroCat>
        {CATEGORIAS_KANBAN.map((cat) => (
          <FiltroCat key={cat} ativo={categoria === cat} onClick={() => setCategoria(cat)}>
            {cat}
          </FiltroCat>
        ))}
      </div>

      {colunas.length === 0 ? (
        <Vazio>Nenhuma coluna configurada.</Vazio>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          <div className="flex w-max gap-4">
            {porColuna.map(({ coluna, itens }) => (
              <section
                key={coluna.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setColunaAlvo(coluna.id);
                }}
                onDragLeave={() => setColunaAlvo((c) => (c === coluna.id ? null : c))}
                onDrop={(e) => aoSoltar(e, coluna.id)}
                className={`flex w-72 shrink-0 flex-col rounded-sm border-2 bg-creme-claro transition-colors ${
                  colunaAlvo === coluna.id
                    ? "border-oliva bg-oliva/5"
                    : coluna.is_done
                      ? "border-oliva/40"
                      : "border-terra/25"
                }`}
              >
                <header className="flex items-baseline justify-between gap-2 border-b border-terra/15 px-4 py-3.5">
                  <h2 className="versalete titulo-serif text-xs text-oliva">{coluna.name}</h2>
                  <span className="titulo-serif text-base text-terra tabular-nums lining-nums">
                    {itens.length}
                  </span>
                </header>

                <div className="flex-1 space-y-2.5 p-3">
                  {itens.map((card) => (
                    <CartaoKanban
                      key={card.id}
                      card={card}
                      concluido={coluna.is_done}
                      arrastando={arrastando === card.id}
                      colunas={colunas}
                      aoAbrir={() => setAberto(card)}
                      aoIniciarArraste={(e) => {
                        e.dataTransfer.setData("text/plain", card.id);
                        e.dataTransfer.effectAllowed = "move";
                        setArrastando(card.id);
                      }}
                      aoTerminarArraste={() => setArrastando(null)}
                      aoMover={(colunaId) => mover(card, colunaId)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => setNovoNaColuna(coluna.id)}
                    className="versalete flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-terra/30 py-2.5 text-xs text-terra transition-colors hover:border-oliva hover:text-oliva"
                  >
                    <Icone nome="mais" className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {(aberto || novoNaColuna) && (
        <CardDetalhe
          card={aberto}
          colunaInicial={novoNaColuna ?? colunas[0]?.id ?? ""}
          colunas={colunas}
          fornecedores={fornecedores}
          aoFechar={() => {
            setAberto(null);
            setNovoNaColuna(null);
          }}
          aoSalvar={() => {
            setAberto(null);
            setNovoNaColuna(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FiltroCat({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`versalete titulo-serif rounded-full border px-4 py-2 text-xs transition-colors ${
        ativo
          ? "border-oliva bg-oliva text-creme-claro"
          : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
      }`}
    >
      {children}
    </button>
  );
}

function CartaoKanban({
  card,
  concluido,
  arrastando,
  colunas,
  aoAbrir,
  aoIniciarArraste,
  aoTerminarArraste,
  aoMover,
}: {
  card: CardKanban;
  concluido: boolean;
  arrastando: boolean;
  colunas: ColunaKanban[];
  aoAbrir: () => void;
  aoIniciarArraste: (e: DragEvent) => void;
  aoTerminarArraste: () => void;
  aoMover: (colunaId: string) => void;
}) {
  const dias = diasAte(card.due_date);
  const atrasado = !concluido && dias !== null && dias < 0;
  const feitos = card.itens.filter((i) => i.done).length;

  return (
    <article
      draggable
      onDragStart={aoIniciarArraste}
      onDragEnd={aoTerminarArraste}
      className={`cursor-grab rounded-sm border border-terra/20 bg-creme p-3.5 transition-opacity active:cursor-grabbing ${
        arrastando ? "opacity-40" : ""
      }`}
    >
      <button type="button" onClick={aoAbrir} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className={`titulo-serif text-base ${concluido ? "text-terra/60 line-through" : "text-oliva"}`}>
            {card.title}
          </p>
          {card.priority === "alta" && <Selo tom="alerta">alta</Selo>}
        </div>

        <p className="versalete mt-2 text-xs text-lavanda">{card.category}</p>

        {card.itens.length > 0 && (
          <p className="mt-2 text-sm text-terra tabular-nums lining-nums">
            {feitos} de {card.itens.length} no checklist
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-terra">
          {card.owner && <span>{card.owner}</span>}
          {card.due_date && (
            <span className={atrasado ? "font-medium text-red-800" : ""}>
              {formatarData(card.due_date)}
              {atrasado && " (atrasado)"}
            </span>
          )}
        </div>
      </button>

      {/* No celular não dá para arrastar: o seletor resolve. */}
      <label className="versalete mt-3 block text-xs text-terra lg:hidden">
        Mover
        <select
          value={card.column_id}
          onChange={(e) => aoMover(e.target.value)}
          className="mt-1 w-full rounded-sm border border-terra/30 bg-creme-claro px-2 py-1.5 text-sm normal-case tracking-normal text-oliva"
        >
          {colunas.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

export { ROTULOS_PRIORIDADE, TOM_PRIORIDADE };
