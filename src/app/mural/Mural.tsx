"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GrupoStory, Publicacao } from "@/lib/tipos";
import { Divisor, FaixaVersalete } from "@/components/Ornamentos";
import { Publicar } from "./Publicar";
import { BarraStories, VisualizadorStories } from "./Stories";
import { Feed } from "./Feed";

export function Mural({
  meuId,
  meuNome,
  souAdmin,
  feedInicial,
  gruposIniciais,
}: {
  meuId: string;
  meuNome: string;
  souAdmin: boolean;
  feedInicial: Publicacao[];
  gruposIniciais: GrupoStory[];
}) {
  const router = useRouter();
  const [grupoAberto, setGrupoAberto] = useState<number | null>(null);

  return (
    <div className="bg-creme px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <FaixaVersalete>Mural dos convidados</FaixaVersalete>
          <h1 className="titulo-serif mt-7 text-4xl text-oliva sm:text-5xl">Nosso mural</h1>
          <Divisor className="mt-7" />
          <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-terra">
            Poste suas fotos, deixe um recado e veja o casamento pelos olhos de
            quem estava lá. Os stories somem em 24 horas; o que vai para o feed
            fica para sempre.
          </p>
        </header>

        <div className="mt-12">
          <BarraStories
            grupos={gruposIniciais}
            meuId={meuId}
            aoAbrir={(indice) => setGrupoAberto(indice)}
          />
        </div>

        <div className="mt-10">
          <Publicar meuId={meuId} meuNome={meuNome} aoPublicar={() => router.refresh()} />
        </div>

        <div className="mt-12">
          <Feed
            publicacoes={feedInicial}
            meuId={meuId}
            souAdmin={souAdmin}
            aoMudar={() => router.refresh()}
          />
        </div>
      </div>

      {grupoAberto !== null && gruposIniciais[grupoAberto] && (
        <VisualizadorStories
          grupos={gruposIniciais}
          indiceInicial={grupoAberto}
          meuId={meuId}
          souAdmin={souAdmin}
          aoFechar={() => {
            setGrupoAberto(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
