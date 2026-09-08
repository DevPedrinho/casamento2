"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GrupoStory } from "@/lib/tipos";
import { tempoRestante } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";

/** Quanto tempo cada story fica na tela antes de passar sozinho. */
const DURACAO_MS = 5000;

export function BarraStories({
  grupos,
  meuId,
  aoAbrir,
}: {
  grupos: GrupoStory[];
  meuId: string;
  aoAbrir: (indice: number) => void;
}) {
  if (grupos.length === 0) {
    return (
      <p className="titulo-serif text-center text-base text-terra italic">
        Ninguém postou story ainda. Que tal começar?
      </p>
    );
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-2">
      <ul className="flex w-max gap-5">
        {grupos.map((grupo, indice) => (
          <li key={grupo.autor.id}>
            <button
              type="button"
              onClick={() => aoAbrir(indice)}
              className="flex w-20 flex-col items-center gap-2"
            >
              {/* O anel cheio marca story ainda não visto. */}
              <span
                className={`rounded-full p-0.5 ${
                  grupo.todos_vistos ? "bg-terra/25" : "bg-lavanda"
                }`}
              >
                <span className="block rounded-full border-2 border-creme">
                  <Avatar nome={grupo.autor.full_name} tamanho="lg" />
                </span>
              </span>
              <span className="w-full truncate text-center text-xs text-terra">
                {grupo.autor.id === meuId ? "Você" : grupo.autor.full_name.split(" ")[0]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VisualizadorStories({
  grupos,
  indiceInicial,
  meuId,
  souAdmin,
  aoFechar,
}: {
  grupos: GrupoStory[];
  indiceInicial: number;
  meuId: string;
  souAdmin: boolean;
  aoFechar: () => void;
}) {
  const [indiceGrupo, setIndiceGrupo] = useState(indiceInicial);
  const [indiceStory, setIndiceStory] = useState(0);
  const [pausado, setPausado] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);

  const grupo = grupos[indiceGrupo];
  const story = grupo?.stories[indiceStory];

  const avancar = useCallback(() => {
    const atual = grupos[indiceGrupo];
    if (!atual) return aoFechar();

    if (indiceStory + 1 < atual.stories.length) {
      setIndiceStory((i) => i + 1);
    } else if (indiceGrupo + 1 < grupos.length) {
      setIndiceGrupo((g) => g + 1);
      setIndiceStory(0);
    } else {
      aoFechar();
    }
  }, [aoFechar, grupos, indiceGrupo, indiceStory]);

  const voltar = useCallback(() => {
    if (indiceStory > 0) {
      setIndiceStory((i) => i - 1);
    } else if (indiceGrupo > 0) {
      const anterior = grupos[indiceGrupo - 1];
      setIndiceGrupo((g) => g - 1);
      setIndiceStory(Math.max(0, anterior.stories.length - 1));
    }
  }, [grupos, indiceGrupo, indiceStory]);

  // Registra a visualização (uma vez por story, sem travar a navegação).
  useEffect(() => {
    if (!story || story.author_id === meuId) return;
    const supabase = criarClienteNavegador();
    void supabase
      .from("story_views")
      .upsert({ post_id: story.id, guest_id: meuId }, { onConflict: "post_id,guest_id" });
  }, [meuId, story]);

  // Avanço automático, pausado enquanto o dedo está na tela.
  useEffect(() => {
    if (pausado || !story) return;
    const id = setTimeout(avancar, DURACAO_MS);
    return () => clearTimeout(id);
  }, [avancar, pausado, story]);

  // Teclado, foco e trava de rolagem.
  useEffect(() => {
    fecharRef.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
      if (evento.key === "ArrowRight") avancar();
      if (evento.key === "ArrowLeft") voltar();
    }
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar, avancar, voltar]);

  async function apagar() {
    if (!story) return;
    if (!confirm("Apagar este story?")) return;
    const supabase = criarClienteNavegador();
    await supabase.from("posts").delete().eq("id", story.id);
    if (story.image_path) await supabase.storage.from("mural").remove([story.image_path]);
    aoFechar();
  }

  if (!grupo || !story) return null;

  const meu = story.author_id === meuId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story de ${grupo.autor.full_name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-oliva-escuro p-4"
    >
      <div className="relative flex h-full max-h-[90vh] w-full max-w-md flex-col">
        {/* Barrinhas de progresso, uma por story do autor */}
        <div className="flex gap-1.5" aria-hidden="true">
          {grupo.stories.map((s, i) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-creme/30">
              <span
                className={`block h-full bg-creme-claro ${
                  i < indiceStory ? "w-full" : i === indiceStory ? "animate-[crescer_5s_linear_forwards]" : "w-0"
                }`}
                style={i === indiceStory && pausado ? { animationPlayState: "paused" } : undefined}
              />
            </span>
          ))}
        </div>

        <header className="mt-4 flex items-center gap-3">
          <Avatar nome={grupo.autor.full_name} tamanho="sm" tom="claro" />
          <div className="min-w-0 flex-1">
            <p className="titulo-serif truncate text-base text-creme-claro">
              {meu ? "Você" : grupo.autor.full_name}
            </p>
            {story.expires_at && (
              <p className="text-xs text-creme/70">some em {tempoRestante(story.expires_at)}</p>
            )}
          </div>
          <button
            ref={fecharRef}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar stories"
            className="flex h-10 w-10 items-center justify-center rounded-full text-creme-claro transition-colors hover:bg-creme/15"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div
          className="relative mt-4 flex-1 overflow-hidden rounded-sm bg-oliva-escuro"
          onPointerDown={() => setPausado(true)}
          onPointerUp={() => setPausado(false)}
          onPointerLeave={() => setPausado(false)}
        >
          {story.imagem_url && (
            // Imagem vem de URL assinada e temporária — o next/image não ajuda aqui.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.imagem_url}
              alt={story.caption ?? `Story de ${grupo.autor.full_name}`}
              className="h-full w-full object-contain"
            />
          )}

          {story.caption && (
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-oliva-escuro/90 to-transparent px-5 pb-6 pt-12 text-center text-base text-creme-claro">
              {story.caption}
            </p>
          )}

          {/* Metades invisíveis: toque à esquerda volta, à direita avança. */}
          <button
            type="button"
            onClick={voltar}
            aria-label="Story anterior"
            className="absolute inset-y-0 left-0 w-1/3"
          />
          <button
            type="button"
            onClick={avancar}
            aria-label="Próximo story"
            className="absolute inset-y-0 right-0 w-1/3"
          />
        </div>

        {(meu || souAdmin) && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={apagar}
              className="versalete text-xs text-creme/80 underline underline-offset-4 hover:text-creme-claro"
            >
              Apagar story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
