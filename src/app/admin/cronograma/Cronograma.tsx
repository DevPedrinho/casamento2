"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  ROTULOS_PUBLICO,
  type Fornecedor,
  type MomentoDoDia,
  type PublicoCronograma,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

/** Um dia de casamento típico, para quem está começando do zero. */
const MODELO: { hora: string; titulo: string; publico: PublicoCronograma; onde?: string }[] = [
  { hora: "08:00", titulo: "Café da manhã das noivas", publico: "interno" },
  { hora: "09:00", titulo: "Início do cabelo e maquiagem", publico: "interno" },
  { hora: "11:00", titulo: "Chegada do buffet e da decoração", publico: "interno" },
  { hora: "13:00", titulo: "Chegada do fotógrafo e do vídeo", publico: "interno" },
  { hora: "14:00", titulo: "Making of da noiva", publico: "interno" },
  { hora: "15:00", titulo: "Making of do noivo", publico: "interno" },
  { hora: "15:30", titulo: "Chegada dos convidados", publico: "convidados" },
  { hora: "16:00", titulo: "Cerimônia", publico: "convidados" },
  { hora: "16:10", titulo: "Entrada do cortejo", publico: "convidados" },
  { hora: "17:00", titulo: "Sessão de fotos com as famílias", publico: "convidados" },
  { hora: "18:00", titulo: "Recepção e coquetel", publico: "convidados" },
  { hora: "19:00", titulo: "Jantar", publico: "convidados" },
  { hora: "20:30", titulo: "Valsa e abertura da pista", publico: "convidados" },
  { hora: "21:30", titulo: "Corte do bolo e buquê", publico: "convidados" },
  { hora: "23:30", titulo: "Última música", publico: "convidados" },
];

const VAZIO = {
  starts_at: "16:00",
  ends_at: "",
  title: "",
  description: "",
  location: "",
  owner: "",
  vendor_id: "",
  audience: "interno" as PublicoCronograma,
};

/** "16:00:00" vira "16:00" — o banco guarda com segundos. */
function hhmm(hora: string): string {
  return hora.slice(0, 5);
}

export function Cronograma({
  momentos,
  fornecedores,
}: {
  momentos: MomentoDoDia[];
  fornecedores: Fornecedor[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resumo = useMemo(
    () => ({
      total: momentos.length,
      publicos: momentos.filter((m) => m.audience === "convidados").length,
      primeiro: momentos[0] ? hhmm(momentos[0].starts_at) : "—",
      ultimo: momentos.length ? hhmm(momentos[momentos.length - 1].starts_at) : "—",
    }),
    [momentos],
  );

  function abrirNovo() {
    setForm(VAZIO);
    setEditando(null);
    setAbrindo(true);
  }

  function abrirEdicao(momento: MomentoDoDia) {
    setForm({
      starts_at: hhmm(momento.starts_at),
      ends_at: momento.ends_at ? hhmm(momento.ends_at) : "",
      title: momento.title,
      description: momento.description ?? "",
      location: momento.location ?? "",
      owner: momento.owner ?? "",
      vendor_id: momento.vendor_id ?? "",
      audience: momento.audience,
    });
    setEditando(momento.id);
    setAbrindo(true);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.title.trim()) {
      setErro("Escreva o que acontece nesse horário.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      starts_at: form.starts_at,
      ends_at: form.ends_at || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      owner: form.owner.trim() || null,
      vendor_id: form.vendor_id || null,
      audience: form.audience,
    };

    const { error } = editando
      ? await supabase.from("day_schedule").update(dados).eq("id", editando)
      : await supabase.from("day_schedule").insert(dados);

    setSalvando(false);
    if (error) {
      setErro(`Não deu para salvar: ${error.message}`);
      return;
    }

    setAbrindo(false);
    setEditando(null);
    setForm(VAZIO);
    router.refresh();
  }

  async function remover(id: string) {
    const supabase = criarClienteNavegador();
    await supabase.from("day_schedule").delete().eq("id", id);
    router.refresh();
  }

  /** Preenche o dia inteiro com um roteiro comum, para depois ajustar. */
  async function usarModelo() {
    setSalvando(true);
    const supabase = criarClienteNavegador();
    await supabase.from("day_schedule").insert(
      MODELO.map((m, i) => ({
        starts_at: m.hora,
        title: m.titulo,
        audience: m.publico,
        location: m.onde ?? null,
        sort_order: i,
      })),
    );
    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Organização do dia</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Cronograma</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-terra">
            Do primeiro pincel à última música. O que estiver marcado como
            &ldquo;os convidados veem&rdquo; aparece no site; o resto fica entre
            vocês e a equipe.
          </p>
        </div>
        <Botao type="button" onClick={abrirNovo}>
          <Icone nome="mais" className="h-4 w-4" />
          Novo momento
        </Botao>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Momentos" valor={resumo.total} />
        <Indicador rotulo="No site" valor={resumo.publicos} tom="lavanda" />
        <Indicador rotulo="Começa" valor={resumo.primeiro} />
        <Indicador rotulo="Termina" valor={resumo.ultimo} />
      </div>

      {abrindo && (
        <Bloco titulo={editando ? "Editar momento" : "Novo momento"}>
          <form onSubmit={salvar} className="space-y-5">
            {erro && <Aviso tipo="erro">{erro}</Aviso>}

            <div className="grid gap-4 sm:grid-cols-[8rem_8rem_1fr]">
              <div>
                <Rotulo htmlFor="c-inicio">Começa</Rotulo>
                <input
                  id="c-inicio"
                  type="time"
                  required
                  className="campo"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Rotulo htmlFor="c-fim">Termina</Rotulo>
                <input
                  id="c-fim"
                  type="time"
                  className="campo"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
              <div>
                <Rotulo htmlFor="c-titulo">O que acontece</Rotulo>
                <input
                  id="c-titulo"
                  required
                  className="campo"
                  placeholder="Entrada do cortejo"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Rotulo htmlFor="c-descricao">Detalhes (opcional)</Rotulo>
              <textarea
                id="c-descricao"
                rows={2}
                className="campo resize-y"
                placeholder="Ordem de entrada, música, quem acompanha quem…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="c-local">Onde</Rotulo>
                <input
                  id="c-local"
                  className="campo"
                  placeholder="Salão, jardim, suíte da noiva…"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <Rotulo htmlFor="c-responsavel">Quem cuida</Rotulo>
                <input
                  id="c-responsavel"
                  className="campo"
                  placeholder="Cerimonialista, madrinha, tio…"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>
              <div>
                <Rotulo htmlFor="c-fornecedor">Fornecedor</Rotulo>
                <select
                  id="c-fornecedor"
                  className="campo"
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Rotulo htmlFor="c-publico">Quem vê</Rotulo>
                <select
                  id="c-publico"
                  className="campo"
                  value={form.audience}
                  onChange={(e) =>
                    setForm({ ...form, audience: e.target.value as PublicoCronograma })
                  }
                >
                  {(Object.keys(ROTULOS_PUBLICO) as PublicoCronograma[]).map((p) => (
                    <option key={p} value={p}>
                      {ROTULOS_PUBLICO[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Botao type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </Botao>
              <Botao
                type="button"
                variante="contorno"
                onClick={() => {
                  setAbrindo(false);
                  setEditando(null);
                }}
              >
                Cancelar
              </Botao>
              {editando && (
                <button
                  type="button"
                  onClick={() => {
                    remover(editando);
                    setAbrindo(false);
                    setEditando(null);
                  }}
                  className="versalete ml-auto inline-flex min-h-11 items-center text-xs text-red-800 underline underline-offset-4"
                >
                  Apagar momento
                </button>
              )}
            </div>
          </form>
        </Bloco>
      )}

      <Bloco
        titulo="O dia, hora a hora"
        descricao="Clique em qualquer linha para ajustar."
        acao={
          momentos.length === 0 ? (
            <Botao type="button" variante="contorno" onClick={usarModelo} disabled={salvando}>
              Começar com um roteiro pronto
            </Botao>
          ) : undefined
        }
      >
        {momentos.length === 0 ? (
          <Vazio>
            Nenhum momento no cronograma. Comece pelo roteiro pronto e ajuste o
            que for diferente no casamento de vocês.
          </Vazio>
        ) : (
          <ol className="relative space-y-2.5">
            {momentos.map((momento) => (
              <li key={momento.id}>
                <button
                  type="button"
                  onClick={() => abrirEdicao(momento)}
                  className="flex w-full flex-col gap-2 rounded-sm border border-terra/20 bg-creme px-4 py-3.5 text-left transition-colors hover:border-oliva/40 sm:flex-row sm:items-start sm:gap-4"
                >
                  {/* No celular a hora e o selo dividem a primeira linha;
                      no desktop a hora vira coluna à esquerda. */}
                  <span className="flex items-center justify-between gap-3 sm:w-20 sm:shrink-0 sm:justify-start">
                    <span className="titulo-serif text-lg text-oliva tabular-nums lining-nums">
                      {hhmm(momento.starts_at)}
                      {momento.ends_at && (
                        <span className="text-sm text-terra"> –{hhmm(momento.ends_at)}</span>
                      )}
                    </span>
                    <span className="sm:hidden">
                      <Selo tom={momento.audience === "convidados" ? "lavanda" : "neutro"}>
                        {momento.audience === "convidados" ? "no site" : "interno"}
                      </Selo>
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="titulo-serif block text-lg text-oliva">{momento.title}</span>
                    {momento.description && (
                      <span className="mt-0.5 block text-sm text-terra">
                        {momento.description}
                      </span>
                    )}
                    {(momento.location || momento.owner) && (
                      <span className="mt-0.5 block text-sm text-terra/80">
                        {[momento.location, momento.owner].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>

                  <span className="hidden shrink-0 sm:block">
                    <Selo tom={momento.audience === "convidados" ? "lavanda" : "neutro"}>
                      {momento.audience === "convidados" ? "no site" : "interno"}
                    </Selo>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Bloco>
    </div>
  );
}
