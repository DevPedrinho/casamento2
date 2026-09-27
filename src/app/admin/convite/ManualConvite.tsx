"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ICONES_MANUAL, iconeDoManual } from "@/lib/conviteDigital";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { ItemManual } from "@/lib/tipos";
import { Botao } from "@/components/Botao";
import { Icone } from "@/components/Icones";
import { Ajuda, RotuloConfig, SecaoConfig } from "../configuracoes/ui";

type Rascunho = Pick<ItemManual, "title" | "body" | "icon" | "visible">;

const NOVO: Rascunho = { title: "", body: "", icon: "coracao", visible: true };

/**
 * As orientações do Manual do Convidado: criar, editar, ocultar, excluir e
 * mudar de lugar. Cada ação grava na hora — não há um "salvar tudo".
 */
export function ManualConvite({ itensIniciais }: { itensIniciais: ItemManual[] }) {
  const router = useRouter();
  const [itens, setItens] = useState(itensIniciais);
  /** O item aberto para edição: um id, "novo", ou nada. */
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => PromiseLike<{ error: { message: string } | null }>) {
    setErro(null);
    setOcupado(true);
    const { error } = await acao();
    setOcupado(false);
    if (error) {
      setErro(`Não deu para salvar: ${error.message}`);
      return false;
    }
    router.refresh();
    return true;
  }

  const tabela = () => criarClienteNavegador().from("invitation_guide_items");

  async function criar(rascunho: Rascunho) {
    const ordem = Math.max(0, ...itens.map((i) => i.sort_order)) + 10;
    let criado: ItemManual | null = null;
    const ok = await executar(async () => {
      const resposta = await tabela()
        .insert({ ...rascunho, sort_order: ordem })
        .select()
        .single();
      criado = resposta.data as ItemManual | null;
      return resposta;
    });
    if (ok && criado) {
      setItens((lista) => [...lista, criado as ItemManual]);
      setEditando(null);
    }
  }

  async function atualizar(id: string, patch: Partial<ItemManual>) {
    const ok = await executar(() => tabela().update(patch).eq("id", id));
    if (ok) setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    return ok;
  }

  async function excluir(item: ItemManual) {
    if (!window.confirm(`Excluir a orientação “${item.title}”? Não dá para desfazer.`)) return;
    const ok = await executar(() => tabela().delete().eq("id", item.id));
    if (ok) {
      setItens((lista) => lista.filter((i) => i.id !== item.id));
      setEditando(null);
    }
  }

  /** Troca de lugar com o vizinho e regrava a ordem de 10 em 10. */
  async function mover(indice: number, passo: -1 | 1) {
    const alvo = indice + passo;
    if (alvo < 0 || alvo >= itens.length) return;
    const lista = [...itens];
    [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
    const renumerada = lista.map((item, i) => ({ ...item, sort_order: (i + 1) * 10 }));
    const mudaram = renumerada.filter((item) => itens.find((i) => i.id === item.id)?.sort_order !== item.sort_order);

    setItens(renumerada);
    await executar(async () => {
      for (const item of mudaram) {
        const resposta = await tabela().update({ sort_order: item.sort_order }).eq("id", item.id);
        if (resposta.error) return resposta;
      }
      return { error: null };
    });
  }

  return (
    <SecaoConfig
      id="manual-itens"
      titulo="Orientações do manual"
      descricao="Traje, horário, fotos, crianças, estacionamento… o que vocês quiserem contar. Cada uma com ícone, e na ordem que escolherem."
    >
      {erro && (
        <p role="alert" className="mb-4 text-sm font-medium text-red-800">
          {erro}
        </p>
      )}

      <ol className="space-y-3">
        {itens.map((item, i) =>
          editando === item.id ? (
            <li key={item.id}>
              <FormItem
                inicial={item}
                ocupado={ocupado}
                aoSalvar={async (r) => {
                  if (await atualizar(item.id, r)) setEditando(null);
                }}
                aoCancelar={() => setEditando(null)}
                aoExcluir={() => excluir(item)}
              />
            </li>
          ) : (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-sm border px-4 py-3 ${
                item.visible ? "border-terra/20 bg-creme" : "border-dashed border-terra/25"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavanda/10 text-lavanda">
                <Icone nome={iconeDoManual(item.icon)} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`titulo-serif text-lg leading-snug break-words ${item.visible ? "text-oliva" : "text-terra"}`}>
                  {item.title}
                  {!item.visible && <span className="ml-2 text-sm text-terra italic">(oculta)</span>}
                </p>
                <p className="truncate text-sm text-terra">{item.body}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => atualizar(item.id, { visible: !item.visible })}
                  disabled={ocupado}
                  className="hidden min-h-10 items-center rounded-full px-3 text-sm text-terra hover:bg-oliva/10 hover:text-oliva sm:inline-flex"
                >
                  {item.visible ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(item.id)}
                  className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-oliva hover:bg-oliva/10"
                >
                  Editar
                </button>
                <Seta rotulo={`Subir ${item.title}`} direcao="cima" disabled={i === 0 || ocupado} onClick={() => mover(i, -1)} />
                <Seta
                  rotulo={`Descer ${item.title}`}
                  direcao="baixo"
                  disabled={i === itens.length - 1 || ocupado}
                  onClick={() => mover(i, 1)}
                />
              </div>
            </li>
          ),
        )}
      </ol>

      {itens.length === 0 && editando !== "novo" && (
        <p className="titulo-serif py-4 text-center text-lg text-terra italic">
          Nenhuma orientação ainda — sem elas, a seção do manual não aparece no convite.
        </p>
      )}

      <div className="mt-5">
        {editando === "novo" ? (
          <FormItem inicial={NOVO} ocupado={ocupado} aoSalvar={criar} aoCancelar={() => setEditando(null)} />
        ) : (
          <Botao type="button" variante="contorno" onClick={() => setEditando("novo")}>
            <Icone nome="mais" className="h-4 w-4" />
            Adicionar orientação
          </Botao>
        )}
      </div>
    </SecaoConfig>
  );
}

function FormItem({
  inicial,
  ocupado,
  aoSalvar,
  aoCancelar,
  aoExcluir,
}: {
  inicial: Rascunho;
  ocupado: boolean;
  aoSalvar: (r: Rascunho) => void;
  aoCancelar: () => void;
  aoExcluir?: () => void;
}) {
  const [r, setR] = useState<Rascunho>({
    title: inicial.title,
    body: inicial.body,
    icon: iconeDoManual(inicial.icon),
    visible: inicial.visible,
  });
  const [aviso, setAviso] = useState<string | null>(null);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!r.title.trim()) {
      setAviso("Dê um título à orientação.");
      return;
    }
    setAviso(null);
    aoSalvar({ ...r, title: r.title.trim(), body: r.body.trim() });
  }

  const prefixo = aoExcluir ? "item" : "novo";

  return (
    <form onSubmit={enviar} className="space-y-5 rounded-sm border border-oliva/40 bg-creme px-4 py-5 sm:px-6">
      <div>
        <RotuloConfig htmlFor={`${prefixo}-titulo`}>Título</RotuloConfig>
        <input
          id={`${prefixo}-titulo`}
          className="campo"
          placeholder="Chegue com antecedência"
          value={r.title}
          onChange={(e) => setR({ ...r, title: e.target.value })}
          autoFocus
        />
      </div>
      <div>
        <RotuloConfig htmlFor={`${prefixo}-texto`}>Descrição</RotuloConfig>
        <textarea
          id={`${prefixo}-texto`}
          rows={3}
          className="campo resize-y"
          value={r.body}
          onChange={(e) => setR({ ...r, body: e.target.value })}
        />
      </div>
      <fieldset>
        <legend className="versalete mb-2 block text-sm text-oliva-escuro">Ícone</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ICONES_MANUAL.map((icone) => {
            const escolhido = r.icon === icone.nome;
            return (
              <label
                key={icone.nome}
                title={icone.rotulo}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-sm border px-1 py-2 text-center text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oliva ${
                  escolhido
                    ? "border-oliva bg-oliva/10 text-oliva"
                    : "border-terra/20 bg-creme-claro text-terra hover:border-oliva/50"
                }`}
              >
                <input
                  type="radio"
                  name={`${prefixo}-icone`}
                  value={icone.nome}
                  checked={escolhido}
                  onChange={() => setR({ ...r, icon: icone.nome })}
                  className="sr-only"
                />
                <Icone nome={icone.nome} className="h-5 w-5" />
                <span className="leading-tight">{icone.rotulo}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3 text-base text-oliva-escuro">
        <input
          type="checkbox"
          checked={r.visible}
          onChange={(e) => setR({ ...r, visible: e.target.checked })}
          className="h-5 w-5 accent-[var(--color-oliva)]"
        />
        Visível no convite
      </label>
      {aviso && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {aviso}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-terra/15 pt-4">
        {aoExcluir ? (
          <button
            type="button"
            onClick={aoExcluir}
            disabled={ocupado}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-red-800 underline underline-offset-4"
          >
            <Icone nome="fechar" className="h-4 w-4" />
            Excluir
          </button>
        ) : (
          <Ajuda>Entra no fim da lista; depois dá para mudar de lugar.</Ajuda>
        )}
        <div className="flex gap-2">
          <Botao type="button" variante="contorno" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={ocupado}>
            {ocupado ? "Salvando…" : "Salvar"}
          </Botao>
        </div>
      </div>
    </form>
  );
}

function Seta({
  rotulo,
  direcao,
  disabled,
  onClick,
}: {
  rotulo: string;
  direcao: "cima" | "baixo";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full text-oliva transition-colors hover:bg-oliva/10 disabled:opacity-25"
    >
      <Icone nome="recolher" className={`h-4 w-4 ${direcao === "cima" ? "rotate-90" : "-rotate-90"}`} />
    </button>
  );
}
