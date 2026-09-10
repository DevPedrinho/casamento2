"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CapituloTimeline, FotoTimeline } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { UploadImagem } from "@/components/UploadImagem";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

export function EditorTimeline({ capitulos }: { capitulos: CapituloTimeline[] }) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(0);
  const capitulo = capitulos[ativo];

  async function novoCapitulo() {
    const supabase = criarClienteNavegador();
    await supabase.from("timeline_chapters").insert({
      period: `Ano ${capitulos.length + 1}`,
      title: "Novo capítulo",
      sort_order: capitulos.length + 1,
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Nossa história</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Timeline do casal</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-terra">
            Cada capítulo é um ano. O resumo aparece direto; atrás do
            &ldquo;Ver mais&rdquo; cabem até três parágrafos.
          </p>
        </div>
        <Botao type="button" onClick={novoCapitulo}>
          <Icone nome="mais" className="h-4 w-4" />
          Novo capítulo
        </Botao>
      </header>

      {capitulos.length === 0 ? (
        <Vazio>Nenhum capítulo ainda.</Vazio>
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            {capitulos.map((cap, i) => (
              <button
                key={cap.id}
                type="button"
                onClick={() => setAtivo(i)}
                aria-pressed={i === ativo}
                className={`versalete titulo-serif rounded-full border px-5 py-2.5 text-xs transition-colors ${
                  i === ativo
                    ? "border-oliva bg-oliva text-creme-claro"
                    : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
                }`}
              >
                {cap.period}
              </button>
            ))}
          </div>

          {capitulo && <FormCapitulo key={capitulo.id} capitulo={capitulo} />}
        </>
      )}
    </div>
  );
}

function FormCapitulo({ capitulo }: { capitulo: CapituloTimeline }) {
  const router = useRouter();
  const [form, setForm] = useState({
    period: capitulo.period,
    title: capitulo.title,
    summary: capitulo.summary ?? "",
    body: capitulo.body ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOk(false);
    if (!form.title.trim() || !form.period.trim()) {
      setErro("Período e título são obrigatórios.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("timeline_chapters")
      .update({
        period: form.period.trim(),
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body: form.body.trim() || null,
      })
      .eq("id", capitulo.id);
    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  async function removerCapitulo() {
    if (!confirm(`Remover "${capitulo.title}"? As fotos dele também saem.`)) return;
    const supabase = criarClienteNavegador();
    const caminhos = capitulo.fotos.map((f) => f.image_path);
    await supabase.from("timeline_chapters").delete().eq("id", capitulo.id);
    if (caminhos.length > 0) await supabase.storage.from("site").remove(caminhos);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Bloco titulo="Texto do capítulo">
        <form onSubmit={salvar} className="space-y-5">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {ok && <Aviso tipo="ok">Salvo!</Aviso>}

          <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
            <div>
              <Rotulo htmlFor="t-periodo">Período</Rotulo>
              <input id="t-periodo" required className="campo" placeholder="Ano 1"
                value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
            </div>
            <div>
              <Rotulo htmlFor="t-titulo">Título</Rotulo>
              <input id="t-titulo" required className="campo" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>

          <div>
            <Rotulo htmlFor="t-resumo">Resumo (aparece direto)</Rotulo>
            <textarea id="t-resumo" rows={3} className="campo resize-y" value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>

          <div>
            <Rotulo htmlFor="t-corpo">Texto completo (atrás do &ldquo;Ver mais&rdquo;)</Rotulo>
            <textarea id="t-corpo" rows={8} className="campo resize-y"
              placeholder="Separe os parágrafos com uma linha em branco (até três)."
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
            <button type="button" onClick={removerCapitulo}
              className="versalete ml-auto text-xs text-red-800 underline underline-offset-4">
              Remover capítulo
            </button>
          </div>
        </form>
      </Bloco>

      <Galeria capitulo={capitulo} />
    </div>
  );
}

function Galeria({ capitulo }: { capitulo: CapituloTimeline }) {
  const router = useRouter();
  const [adicionando, setAdicionando] = useState(false);

  async function adicionar(caminho: string) {
    const supabase = criarClienteNavegador();
    await supabase.from("timeline_photos").insert({
      chapter_id: capitulo.id,
      image_path: caminho,
      sort_order: capitulo.fotos.length + 1,
      // A primeira foto do capítulo já entra como capa.
      is_cover: capitulo.fotos.length === 0,
    });
    setAdicionando(false);
    router.refresh();
  }

  async function definirCapa(foto: FotoTimeline) {
    const supabase = criarClienteNavegador();
    await supabase.from("timeline_photos").update({ is_cover: false }).eq("chapter_id", capitulo.id);
    await supabase.from("timeline_photos").update({ is_cover: true }).eq("id", foto.id);
    router.refresh();
  }

  async function mover(foto: FotoTimeline, direcao: -1 | 1) {
    const lista = [...capitulo.fotos];
    const i = lista.findIndex((f) => f.id === foto.id);
    const j = i + direcao;
    if (j < 0 || j >= lista.length) return;

    const supabase = criarClienteNavegador();
    // Troca a ordem das duas fotos envolvidas.
    await Promise.all([
      supabase.from("timeline_photos").update({ sort_order: lista[j].sort_order }).eq("id", lista[i].id),
      supabase.from("timeline_photos").update({ sort_order: lista[i].sort_order }).eq("id", lista[j].id),
    ]);
    router.refresh();
  }

  async function remover(foto: FotoTimeline) {
    if (!confirm("Remover esta foto?")) return;
    const supabase = criarClienteNavegador();
    await supabase.from("timeline_photos").delete().eq("id", foto.id);
    await supabase.storage.from("site").remove([foto.image_path]);
    router.refresh();
  }

  async function trocarLegenda(foto: FotoTimeline) {
    const legenda = prompt("Legenda da foto:", foto.caption ?? "");
    if (legenda === null) return;
    const supabase = criarClienteNavegador();
    await supabase.from("timeline_photos").update({ caption: legenda.trim() || null }).eq("id", foto.id);
    router.refresh();
  }

  return (
    <Bloco
      titulo="Galeria do capítulo"
      descricao="A foto marcada como principal aparece maior, no topo da galeria."
      acao={
        <Botao type="button" variante="contorno" onClick={() => setAdicionando((v) => !v)}>
          {adicionando ? "Fechar" : "Adicionar foto"}
        </Botao>
      }
    >
      {adicionando && (
        <div className="mb-7">
          <UploadImagem
            pasta={`timeline/${capitulo.id}`}
            caminhoAtual={null}
            urlAtual={null}
            aoEnviar={adicionar}
            aoRemover={() => setAdicionando(false)}
            rotulo="Nova foto"
          />
        </div>
      )}

      {capitulo.fotos.length === 0 ? (
        <Vazio>Nenhuma foto neste capítulo ainda.</Vazio>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capitulo.fotos.map((foto, i) => (
            <li key={foto.id} className="overflow-hidden rounded-sm border border-terra/20 bg-creme">
              <div className="relative aspect-4/3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt={foto.caption ?? ""} className="h-full w-full object-cover" />
                {foto.is_cover && (
                  <span className="versalete absolute left-0 top-3 bg-oliva/90 px-3 py-1 text-xs text-creme-claro">
                    Principal
                  </span>
                )}
              </div>

              <div className="space-y-2.5 p-4">
                <p className="min-h-6 text-sm text-terra">{foto.caption ?? "Sem legenda"}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {!foto.is_cover && (
                    <button type="button" onClick={() => definirCapa(foto)}
                      className="versalete text-xs text-oliva underline underline-offset-4">
                      Tornar principal
                    </button>
                  )}
                  <button type="button" onClick={() => trocarLegenda(foto)}
                    className="versalete text-xs text-terra underline underline-offset-4">
                    Legenda
                  </button>
                  <button type="button" onClick={() => mover(foto, -1)} disabled={i === 0}
                    aria-label="Mover para trás"
                    className="versalete text-xs text-terra disabled:opacity-30">
                    ←
                  </button>
                  <button type="button" onClick={() => mover(foto, 1)}
                    disabled={i === capitulo.fotos.length - 1} aria-label="Mover para frente"
                    className="versalete text-xs text-terra disabled:opacity-30">
                    →
                  </button>
                  <button type="button" onClick={() => remover(foto)}
                    className="versalete ml-auto text-xs text-red-800 underline underline-offset-4">
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
