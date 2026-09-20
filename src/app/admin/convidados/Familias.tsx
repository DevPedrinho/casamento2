"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { ConvidadoCompleto, GrupoConvidados } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Selo } from "@/components/painel";

const LADOS = [
  { valor: "", rotulo: "—" },
  { valor: "noiva", rotulo: "Lado da noiva" },
  { valor: "noivo", rotulo: "Lado do noivo" },
  { valor: "ambos", rotulo: "Dos dois" },
];

export const ROTULO_LADO: Record<string, string> = {
  noiva: "lado da noiva",
  noivo: "lado do noivo",
  ambos: "dos dois",
};

/**
 * A lista vista por famílias: cada grupo com os seus, e quem ainda está
 * solto no fim. É daqui que se cria, renomeia e desfaz uma família — e é
 * essa correlação que o mapa de mesas usa para sentar gente junta.
 */
export function Familias({
  grupos,
  convidados,
  pessoasDe,
  linha,
}: {
  grupos: GrupoConvidados[];
  /** Já filtrados pela busca e pelos filtros da tela. */
  convidados: ConvidadoCompleto[];
  /** Quantas pessoas (titular + acompanhantes) um convidado confirmado traz. */
  pessoasDe: (c: ConvidadoCompleto) => number;
  /** Como desenhar cada convidado — a mesma linha das outras visões. */
  linha: (c: ConvidadoCompleto) => ReactNode;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const soltos = convidados.filter((c) => !c.group_id);

  async function remover(grupo: GrupoConvidados, quantos: number) {
    const aviso =
      quantos > 0
        ? `Desfazer a família "${grupo.name}"? ${quantos} convidado${quantos === 1 ? " fica" : "s ficam"} sem família (ninguém é removido da lista).`
        : `Remover a família "${grupo.name}"?`;
    if (!confirm(aviso)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("guest_groups").delete().eq("id", grupo.id);
    router.refresh();
  }

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-terra">
          {grupos.length} família{grupos.length === 1 ? "" : "s"} · {soltos.length} sem família
        </p>
        <Botao type="button" variante="contorno" onClick={() => setCriando((v) => !v)}>
          {criando ? "Fechar" : "Nova família"}
        </Botao>
      </div>

      {criando && (
        <FormFamilia
          aoSalvar={() => {
            setCriando(false);
            router.refresh();
          }}
          aoCancelar={() => setCriando(false)}
        />
      )}

      {grupos.map((g) => {
        const membros = convidados.filter((c) => c.group_id === g.id);
        const confirmados = membros.filter((c) => c.invite_status === "confirmado");
        const pessoas = confirmados.reduce((s, c) => s + pessoasDe(c), 0);

        return (
          <section key={g.id}>
            <header className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-terra/20 pb-2">
              <div className="min-w-0">
                <h3 className="titulo-serif text-xl text-oliva">
                  {g.name}
                  {g.side && <span className="versalete ml-2 text-xs text-lavanda">{ROTULO_LADO[g.side] ?? g.side}</span>}
                </h3>
                <p className="mt-0.5 text-sm text-terra">
                  {membros.length} convidado{membros.length === 1 ? "" : "s"}
                  {confirmados.length > 0 && ` · ${confirmados.length} confirmado${confirmados.length === 1 ? "" : "s"} (${pessoas} pessoa${pessoas === 1 ? "" : "s"})`}
                  {g.notes && ` · ${g.notes}`}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditando(editando === g.id ? null : g.id)}
                  className="versalete inline-flex min-h-11 items-center text-xs text-oliva underline underline-offset-4"
                >
                  {editando === g.id ? "Fechar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => remover(g, membros.length)}
                  className="versalete inline-flex min-h-11 items-center text-xs text-red-800 underline underline-offset-4"
                >
                  Desfazer
                </button>
              </div>
            </header>

            {editando === g.id && (
              <FormFamilia
                grupo={g}
                aoSalvar={() => {
                  setEditando(null);
                  router.refresh();
                }}
                aoCancelar={() => setEditando(null)}
              />
            )}

            {membros.length === 0 ? (
              <p className="text-sm text-terra/70">Ninguém nesta família com os filtros atuais.</p>
            ) : (
              <ul className="space-y-2.5">{membros.map((c) => linha(c))}</ul>
            )}
          </section>
        );
      })}

      <section>
        <header className="mb-3 flex items-end justify-between gap-4 border-b border-terra/20 pb-2">
          <h3 className="titulo-serif text-xl text-oliva">
            Sem família <Selo>{soltos.length}</Selo>
          </h3>
        </header>
        {soltos.length === 0 ? (
          <p className="text-sm text-terra/70">Todo mundo já tem família.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-terra">
              Selecione e use “Mover para família” na barra, ou abra a ficha e edite.
            </p>
            <ul className="space-y-2.5">{soltos.map((c) => linha(c))}</ul>
          </>
        )}
      </section>
    </div>
  );
}

/** Cria ou edita uma família. Com `grupo`, vem preenchido e salva por cima. */
function FormFamilia({
  grupo,
  aoSalvar,
  aoCancelar,
}: {
  grupo?: GrupoConvidados;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [name, setName] = useState(grupo?.name ?? "");
  const [side, setSide] = useState(grupo?.side ?? "");
  const [notes, setNotes] = useState(grupo?.notes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!name.trim()) {
      setErro("Dê um nome à família.");
      return;
    }
    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = { name: name.trim(), side: side || null, notes: notes.trim() || null };
    const { error } = grupo
      ? await supabase.from("guest_groups").update(dados).eq("id", grupo.id)
      : await supabase.from("guest_groups").insert(dados);
    setSalvando(false);
    if (error) {
      setErro(error.code === "23505" ? "Já existe uma família com esse nome." : "Não foi possível salvar. Tente de novo.");
      return;
    }
    aoSalvar();
  }

  return (
    <form onSubmit={enviar} className="mb-5 space-y-4 rounded-sm border border-terra/20 bg-creme p-5">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Rotulo htmlFor={`fam-nome-${grupo?.id ?? "nova"}`}>Nome da família</Rotulo>
          <input id={`fam-nome-${grupo?.id ?? "nova"}`} required className="campo" placeholder="Família Silva, Amigos da faculdade…" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor={`fam-lado-${grupo?.id ?? "nova"}`}>Lado</Rotulo>
          <select id={`fam-lado-${grupo?.id ?? "nova"}`} className="campo" value={side} onChange={(e) => setSide(e.target.value)}>
            {LADOS.map((l) => (
              <option key={l.valor} value={l.valor}>{l.rotulo}</option>
            ))}
          </select>
        </div>
        <div>
          <Rotulo htmlFor={`fam-obs-${grupo?.id ?? "nova"}`}>Observação</Rotulo>
          <input id={`fam-obs-${grupo?.id ?? "nova"}`} className="campo" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : grupo ? "Salvar" : "Criar família"}
        </Botao>
        <Botao type="button" variante="contorno" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
