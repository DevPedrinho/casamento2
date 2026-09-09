"use client";

import { useEffect, useState } from "react";
import type { CapituloTimeline, FotoTimeline } from "@/lib/tipos";
import { Divisor } from "@/components/Ornamentos";
import { Icone } from "@/components/Icones";

/**
 * Linha do tempo por ano: à esquerda o texto, à direita a galeria.
 * Trocar de ano não remonta o player de música, que vive na página.
 */
export function Timeline({ capitulos }: { capitulos: CapituloTimeline[] }) {
  const [ativo, setAtivo] = useState(0);
  const [expandido, setExpandido] = useState(false);
  const [ampliada, setAmpliada] = useState<FotoTimeline | null>(null);

  const capitulo = capitulos[ativo];

  // Trocar de capítulo recolhe o texto longo do anterior.
  useEffect(() => setExpandido(false), [ativo]);

  if (capitulos.length === 0) {
    return (
      <section className="bg-creme-claro px-5 py-24 text-center">
        <p className="titulo-serif text-xl text-terra italic">
          A nossa história está sendo escrita. Volte em breve.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-creme-claro px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        {/* ---------- Navegação por ano ---------- */}
        <nav aria-label="Anos da nossa história" className="-mx-5 overflow-x-auto px-5">
          <ul className="mx-auto flex w-max gap-3">
            {capitulos.map((cap, i) => {
              const atual = i === ativo;
              return (
                <li key={cap.id}>
                  <button
                    type="button"
                    onClick={() => setAtivo(i)}
                    aria-current={atual ? "step" : undefined}
                    className={`versalete titulo-serif rounded-full border px-6 py-3 text-xs transition-all ${
                      atual
                        ? "border-oliva bg-oliva text-creme-claro shadow-sm"
                        : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
                    }`}
                  >
                    {cap.period}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* O fio que liga os anos, como numa linha do tempo mesmo */}
        <div className="relative mx-auto mt-8 h-px max-w-3xl bg-terra/25" aria-hidden="true">
          <span
            className="absolute -top-1 h-2.5 w-2.5 rounded-full bg-lavanda transition-all duration-500"
            style={{
              left: `${capitulos.length > 1 ? (ativo / (capitulos.length - 1)) * 100 : 50}%`,
              transform: "translateX(-50%)",
            }}
          />
        </div>

        {/* ---------- Capítulo ---------- */}
        <article
          key={capitulo.id}
          className="mt-14 grid animate-[surgir_0.5s_ease-out] gap-12 lg:grid-cols-2 lg:gap-16"
        >
          <div>
            <p className="versalete titulo-serif text-xs text-lavanda">{capitulo.period}</p>
            <h2 className="titulo-serif mt-3 text-3xl text-oliva sm:text-4xl">
              {capitulo.title}
            </h2>
            <Divisor className="mt-7 justify-start" />

            {capitulo.summary && (
              <p className="mt-7 text-lg leading-relaxed text-terra">{capitulo.summary}</p>
            )}

            {capitulo.body && (
              <>
                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                    expandido ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4 pt-6">
                      {capitulo.body.split("\n\n").map((paragrafo, i) => (
                        <p key={i} className="text-base leading-relaxed text-terra">
                          {paragrafo}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandido((v) => !v)}
                  aria-expanded={expandido}
                  className="versalete titulo-serif mt-6 inline-flex items-center gap-2 border-b border-oliva/40 pb-1 text-xs text-oliva transition-colors hover:border-oliva"
                >
                  {expandido ? "Ver menos" : "+ Ver mais"}
                </button>
              </>
            )}
          </div>

          {/* ---------- Galeria ---------- */}
          <div>
            {capitulo.fotos.length === 0 ? (
              <div className="flex h-full min-h-64 items-center justify-center rounded-sm border border-dashed border-terra/30 px-8 py-12 text-center">
                <p className="titulo-serif text-base text-terra italic">
                  As fotos deste capítulo ainda estão sendo escolhidas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {capitulo.fotos.map((foto, i) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => setAmpliada(foto)}
                    className={`group relative overflow-hidden rounded-sm border border-terra/20 ${
                      // A foto principal ocupa a largura toda, como capa.
                      i === 0 && foto.is_cover ? "col-span-2 aspect-16/10" : "aspect-square"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={foto.caption ?? `Foto de ${capitulo.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {foto.caption && (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-oliva-escuro/85 to-transparent px-3 pb-2.5 pt-8 text-left text-sm text-creme-claro">
                        {foto.caption}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* ---------- Passar de ano ---------- */}
        <div className="mt-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setAtivo((i) => Math.max(0, i - 1))}
            disabled={ativo === 0}
            className="versalete titulo-serif inline-flex items-center gap-2 text-xs text-terra transition-colors hover:text-oliva disabled:opacity-40"
          >
            <Icone nome="recolher" className="h-4 w-4" />
            Anterior
          </button>

          <span className="versalete text-xs text-terra tabular-nums lining-nums">
            {ativo + 1} de {capitulos.length}
          </span>

          <button
            type="button"
            onClick={() => setAtivo((i) => Math.min(capitulos.length - 1, i + 1))}
            disabled={ativo === capitulos.length - 1}
            className="versalete titulo-serif inline-flex items-center gap-2 text-xs text-terra transition-colors hover:text-oliva disabled:opacity-40"
          >
            Próximo
            <Icone nome="recolher" className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* ---------- Foto ampliada ---------- */}
      {ampliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-oliva-escuro/90 p-5"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-modal="true"
          aria-label={ampliada.caption ?? "Foto ampliada"}
        >
          <button
            type="button"
            onClick={() => setAmpliada(null)}
            aria-label="Fechar"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full text-creme-claro transition-colors hover:bg-creme/15"
          >
            <Icone nome="fechar" className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada.url}
            alt={ampliada.caption ?? ""}
            className="max-h-[85vh] max-w-full rounded-sm object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {ampliada.caption && (
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 text-center text-base text-creme-claro">
              {ampliada.caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
