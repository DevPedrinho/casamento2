"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CATEGORIAS_KANBAN,
  ROTULOS_PRIORIDADE,
  type CardKanban,
  type ColunaKanban,
  type Fornecedor,
  type ItemCard,
  type Prioridade,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Progresso } from "@/components/painel";
import { Icone } from "@/components/Icones";

export function CardDetalhe({
  card,
  colunaInicial,
  colunas,
  fornecedores,
  aoFechar,
  aoSalvar,
}: {
  card: CardKanban | null;
  colunaInicial: string;
  colunas: ColunaKanban[];
  fornecedores: Pick<Fornecedor, "id" | "name">[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [form, setForm] = useState({
    title: card?.title ?? "",
    description: card?.description ?? "",
    category: card?.category ?? "Outros",
    owner: card?.owner ?? "",
    vendor_id: card?.vendor_id ?? "",
    priority: (card?.priority ?? "media") as Prioridade,
    due_date: card?.due_date ?? "",
    column_id: card?.column_id ?? colunaInicial,
  });
  const [itens, setItens] = useState<ItemCard[]>(card?.itens ?? []);
  const [novoItem, setNovoItem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function alternarItem(item: ItemCard) {
    setItens((lista) =>
      lista.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
    );
    const supabase = criarClienteNavegador();
    await supabase.from("kanban_card_items").update({ done: !item.done }).eq("id", item.id);
  }

  async function adicionarItem(evento: FormEvent) {
    evento.preventDefault();
    const titulo = novoItem.trim();
    if (!titulo || !card) return;

    const supabase = criarClienteNavegador();
    const { data } = await supabase
      .from("kanban_card_items")
      .insert({ card_id: card.id, title: titulo, sort_order: itens.length + 1 })
      .select()
      .single();

    if (data) setItens((l) => [...l, data as ItemCard]);
    setNovoItem("");
  }

  async function removerItem(id: string) {
    setItens((l) => l.filter((i) => i.id !== id));
    const supabase = criarClienteNavegador();
    await supabase.from("kanban_card_items").delete().eq("id", id);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!form.title.trim()) {
      setErro("Dê um título ao card.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      owner: form.owner.trim() || null,
      vendor_id: form.vendor_id || null,
      priority: form.priority,
      due_date: form.due_date || null,
      column_id: form.column_id,
    };

    const { error } = card
      ? await supabase.from("kanban_cards").update(dados).eq("id", card.id)
      : await supabase.from("kanban_cards").insert(dados);

    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    aoSalvar();
  }

  async function remover() {
    if (!card) return;
    if (!confirm(`Remover "${card.title}" do quadro?`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("kanban_cards").delete().eq("id", card.id);
    aoSalvar();
  }

  const feitos = itens.filter((i) => i.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-oliva-escuro/50" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card ? card.title : "Novo card"}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-terra/20 bg-creme-claro shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-terra/20 bg-creme-claro px-6 py-5">
          <h2 className="titulo-serif min-w-0 flex-1 truncate text-2xl text-oliva">
            {card ? "Editar card" : "Novo card"}
          </h2>
          <button ref={fecharRef} type="button" onClick={aoFechar} aria-label="Fechar"
            className="p-2 text-terra transition-colors hover:text-oliva">
            <Icone nome="fechar" />
          </button>
        </header>

        <form onSubmit={salvar} className="flex-1 space-y-5 px-6 py-6">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <div>
            <Rotulo htmlFor="k-titulo">Título</Rotulo>
            <input id="k-titulo" required className="campo" value={form.title}
              onChange={(e) => set("title", e.target.value)} />
          </div>

          <div>
            <Rotulo htmlFor="k-desc">Descrição</Rotulo>
            <textarea id="k-desc" rows={3} className="campo resize-y" value={form.description}
              onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="k-col">Coluna</Rotulo>
              <select id="k-col" className="campo" value={form.column_id}
                onChange={(e) => set("column_id", e.target.value)}>
                {colunas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Rotulo htmlFor="k-cat">Categoria</Rotulo>
              <select id="k-cat" className="campo" value={form.category}
                onChange={(e) => set("category", e.target.value)}>
                {CATEGORIAS_KANBAN.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <Rotulo htmlFor="k-prio">Prioridade</Rotulo>
              <select id="k-prio" className="campo" value={form.priority}
                onChange={(e) => set("priority", e.target.value as Prioridade)}>
                {(["baixa", "media", "alta"] as Prioridade[]).map((p) => (
                  <option key={p} value={p}>{ROTULOS_PRIORIDADE[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <Rotulo htmlFor="k-resp">Responsável</Rotulo>
              <input id="k-resp" className="campo" value={form.owner}
                onChange={(e) => set("owner", e.target.value)} />
            </div>
            <div>
              <Rotulo htmlFor="k-data">Data limite</Rotulo>
              <input id="k-data" type="date" className="campo" value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)} />
            </div>
          </div>

          <div>
            <Rotulo htmlFor="k-forn">Fornecedor relacionado</Rotulo>
            <select id="k-forn" className="campo" value={form.vendor_id}
              onChange={(e) => set("vendor_id", e.target.value)}>
              <option value="">Nenhum</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Checklist só depois que o card existe — os itens precisam do card_id. */}
          {card ? (
            <div className="rounded-sm border border-terra/20 bg-creme p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <p className="versalete text-xs text-terra">Checklist</p>
                {itens.length > 0 && (
                  <span className="text-sm text-terra tabular-nums lining-nums">
                    {feitos} de {itens.length}
                  </span>
                )}
              </div>

              {itens.length > 0 && (
                <>
                  <Progresso atual={feitos} total={itens.length} />
                  <ul className="mt-4 space-y-2">
                    {itens.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => alternarItem(item)}
                          className="h-4 w-4 shrink-0 accent-[var(--color-oliva)]"
                          aria-label={item.title}
                        />
                        <span className={`min-w-0 flex-1 text-base ${item.done ? "text-terra/60 line-through" : "text-terra"}`}>
                          {item.title}
                        </span>
                        <button type="button" onClick={() => removerItem(item.id)}
                          aria-label={`Remover ${item.title}`}
                          className="shrink-0 p-1 text-terra/60 transition-colors hover:text-red-800">
                          <Icone nome="fechar" className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  className="campo"
                  placeholder="Adicionar item…"
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void adicionarItem(e);
                    }
                  }}
                  aria-label="Novo item do checklist"
                />
                <button type="button" onClick={adicionarItem}
                  className="versalete titulo-serif shrink-0 rounded-sm bg-oliva px-4 text-xs text-creme-claro">
                  Add
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-sm border border-terra/20 bg-creme px-5 py-4 text-sm text-terra">
              Salve o card para começar a montar o checklist dele.
            </p>
          )}
        </form>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-terra/20 bg-creme-claro px-6 py-4">
          <Botao type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : card ? "Salvar" : "Criar card"}
          </Botao>
          <Botao type="button" variante="contorno" onClick={aoFechar}>Cancelar</Botao>
          {card && (
            <button type="button" onClick={remover}
              className="versalete ml-auto text-xs text-red-800 underline underline-offset-4">
              Remover
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
