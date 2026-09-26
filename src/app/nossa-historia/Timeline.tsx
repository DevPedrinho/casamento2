"use client";

import { useEffect, useRef, useState } from "react";
import type { CapituloTimeline, FotoTimeline } from "@/lib/tipos";
import { Coracao, Divisor } from "@/components/Ornamentos";
import { Icone } from "@/components/Icones";

/**
 * Linha do tempo em fio vertical, como era no começo do site: um traço
 * costurando os capítulos, coração em cada marco e os textos alternando
 * de lado no desktop. Por cima disso ficam os incrementos que vieram
 * depois — navegação por ano, galeria de fotos, "Ver mais" com o texto
 * longo e a foto ampliada.
 */
export function Timeline({ capitulos }: { capitulos: CapituloTimeline[] }) {
  /** As fotos do capítulo tocado e qual delas está aberta. */
  const [ampliada, setAmpliada] = useState<{ fotos: FotoTimeline[]; indice: number } | null>(null);
  const [ativo, setAtivo] = useState(0);
  const itensRef = useRef<(HTMLLIElement | null)[]>([]);

  // Destaca no menu de anos o capítulo que está passando pela tela.
  useEffect(() => {
    const itens = itensRef.current.filter(Boolean) as HTMLLIElement[];
    if (itens.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visivel) return;
        const i = itens.indexOf(visivel.target as HTMLLIElement);
        if (i >= 0) setAtivo(i);
      },
      // A faixa estreita no meio da tela evita que dois capítulos disputem
      // o destaque quando os dois estão visíveis ao mesmo tempo.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    itens.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [capitulos.length]);

  function irPara(i: number) {
    itensRef.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    <section className="bg-creme-claro px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center sm:mb-14">
          <p className="versalete titulo-serif mb-4 text-xs text-terra">Capítulo por capítulo</p>
          <h2 className="titulo-serif text-3xl leading-tight text-oliva sm:text-4xl md:text-5xl">
            Do encontro ao altar
          </h2>
          <Divisor className="mt-7" />
        </header>

        {/* ---------- Atalhos por ano ---------- */}
        {capitulos.length > 1 && (
          <nav
            aria-label="Anos da nossa história"
            className="-mx-5 mb-14 overflow-x-auto px-5 pb-1 sm:mb-16"
          >
            <ul className="mx-auto flex w-max gap-2 sm:gap-2.5">
              {capitulos.map((cap, i) => {
                const atual = i === ativo;
                return (
                  <li key={cap.id}>
                    <button
                      type="button"
                      onClick={() => irPara(i)}
                      aria-current={atual ? "step" : undefined}
                      className={`versalete titulo-serif min-h-11 rounded-full border px-5 text-xs transition-colors ${
                        atual
                          ? "border-oliva bg-oliva text-creme-claro"
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
        )}

        {/* ---------- O fio ---------- */}
        <ol className="relative">
          <span
            aria-hidden="true"
            className="absolute left-2.5 top-2 bottom-2 w-px bg-terra/25 sm:left-1/2"
          />

          {capitulos.map((capitulo, i) => (
            <Capitulo
              key={capitulo.id}
              capitulo={capitulo}
              esquerda={i % 2 === 0}
              ref={(el) => {
                itensRef.current[i] = el;
              }}
              aoAmpliar={(fotos, indice) => setAmpliada({ fotos, indice })}
            />
          ))}
        </ol>
      </div>

      {ampliada && (
        <FotoAmpliada
          fotos={ampliada.fotos}
          indice={ampliada.indice}
          aoMudar={(indice) => setAmpliada({ ...ampliada, indice })}
          aoFechar={() => setAmpliada(null)}
        />
      )}
    </section>
  );
}

function Capitulo({
  capitulo,
  esquerda,
  ref,
  aoAmpliar,
}: {
  capitulo: CapituloTimeline;
  esquerda: boolean;
  ref: (el: HTMLLIElement | null) => void;
  aoAmpliar: (fotos: FotoTimeline[], indice: number) => void;
}) {
  const [expandido, setExpandido] = useState(false);

  // Cada linha em branco vira um parágrafo do "Ver mais" (até três, é o
  // que os noivos costumam escrever por capítulo).
  const paragrafos = (capitulo.body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <li
      ref={ref}
      className={`relative scroll-mt-28 pb-14 pl-10 last:pb-0 sm:w-1/2 sm:pl-0 ${
        esquerda ? "sm:mr-auto sm:pr-12 sm:text-right" : "sm:ml-auto sm:pl-12 sm:text-left"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-creme-claro ring-1 ring-terra/30 ${
          esquerda ? "sm:-right-2.5 sm:left-auto" : "sm:-left-2.5"
        }`}
      >
        <Coracao className="w-2.5 text-lavanda" />
      </span>

      <p className="versalete titulo-serif text-xs text-lavanda">{capitulo.period}</p>
      <h3 className="titulo-serif mt-2 text-2xl text-oliva sm:text-3xl">{capitulo.title}</h3>

      {capitulo.summary && (
        <p className="mt-3 text-base leading-relaxed text-terra sm:text-lg">{capitulo.summary}</p>
      )}

      {paragrafos.length > 0 && (
        <>
          <div
            className={`grid transition-[grid-template-rows] duration-500 ease-out ${
              expandido ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-4">
                {paragrafos.map((paragrafo, i) => (
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
            className="versalete titulo-serif mt-4 inline-flex min-h-11 items-center gap-2 text-xs text-oliva"
          >
            <span className="border-b border-oliva/40 pb-1">
              {expandido ? "Ver menos" : "Ver mais"}
            </span>
          </button>
        </>
      )}

      {capitulo.fotos.length > 0 && (
        <Galeria capitulo={capitulo} esquerda={esquerda} aoAmpliar={aoAmpliar} />
      )}
    </li>
  );
}

/** Miniaturas do capítulo: a capa maior e as demais em tiras. */
function Galeria({
  capitulo,
  esquerda,
  aoAmpliar,
}: {
  capitulo: CapituloTimeline;
  esquerda: boolean;
  aoAmpliar: (fotos: FotoTimeline[], indice: number) => void;
}) {
  const [capa, ...resto] = capitulo.fotos;

  return (
    <div className="mt-6 space-y-2">
      <button
        type="button"
        onClick={() => aoAmpliar(capitulo.fotos, 0)}
        className="group relative block aspect-16/10 w-full overflow-hidden rounded-sm border border-terra/20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capa.url}
          alt={capa.caption ?? `Foto de ${capitulo.title}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {capa.caption && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-oliva-escuro/85 to-transparent px-3 pb-2.5 pt-8 text-left text-sm text-creme-claro">
            {capa.caption}
          </span>
        )}
      </button>

      {resto.length > 0 && (
        <div
          className={`flex flex-wrap gap-2 ${esquerda ? "sm:justify-end" : ""}`}
        >
          {resto.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => aoAmpliar(capitulo.fotos, i + 1)}
              className="group relative aspect-square w-[calc((100%-1rem)/3)] overflow-hidden rounded-sm border border-terra/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt={foto.caption ?? `Foto de ${capitulo.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A foto ampliada, com as outras fotos do mesmo capítulo a um toque:
 * botões nas laterais, setas do teclado e o arrastar do dedo no celular.
 * Não dá a volta — na última foto o capítulo acaba, e o botão some.
 */
function FotoAmpliada({
  fotos,
  indice,
  aoMudar,
  aoFechar,
}: {
  fotos: FotoTimeline[];
  indice: number;
  aoMudar: (indice: number) => void;
  aoFechar: () => void;
}) {
  const foto = fotos[indice];
  const temAnterior = indice > 0;
  const temProxima = indice < fotos.length - 1;
  const inicioDoToque = useRef<number | null>(null);

  // Fecha no Esc, troca nas setas e tranca a rolagem do fundo.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
      if (evento.key === "ArrowLeft" && temAnterior) aoMudar(indice - 1);
      if (evento.key === "ArrowRight" && temProxima) aoMudar(indice + 1);
    }
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar, aoMudar, indice, temAnterior, temProxima]);

  const botaoLateral =
    "absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-oliva-escuro/60 text-creme-claro ring-1 ring-creme/30 transition-colors hover:bg-creme/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-creme";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-oliva-escuro/90 p-4 sm:p-5"
      onClick={aoFechar}
      onTouchStart={(e) => {
        inicioDoToque.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const inicio = inicioDoToque.current;
        inicioDoToque.current = null;
        const fim = e.changedTouches[0]?.clientX;
        if (inicio === null || fim === undefined) return;
        const distancia = fim - inicio;
        if (distancia <= -50 && temProxima) aoMudar(indice + 1);
        if (distancia >= 50 && temAnterior) aoMudar(indice - 1);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={foto.caption ?? "Foto ampliada"}
    >
      <div className="absolute right-4 top-4 flex items-center gap-3">
        {fotos.length > 1 && (
          <span className="versalete text-xs text-creme-claro/90 tabular-nums lining-nums" aria-live="polite">
            {indice + 1} de {fotos.length}
          </span>
        )}
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-creme-claro transition-colors hover:bg-creme/15"
        >
          <Icone nome="fechar" className="h-6 w-6" />
        </button>
      </div>

      {temAnterior && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            aoMudar(indice - 1);
          }}
          aria-label="Foto anterior"
          className={`${botaoLateral} left-3 sm:left-6`}
        >
          <Icone nome="recolher" className="h-6 w-6" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={foto.id}
        src={foto.url}
        alt={foto.caption ?? ""}
        className="max-h-[80vh] max-w-full rounded-sm object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {temProxima && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            aoMudar(indice + 1);
          }}
          aria-label="Próxima foto"
          className={`${botaoLateral} right-3 sm:right-6`}
        >
          <Icone nome="recolher" className="h-6 w-6 rotate-180" />
        </button>
      )}

      {foto.caption && (
        <p className="absolute inset-x-0 bottom-6 px-6 text-center text-base text-creme-claro">
          {foto.caption}
        </p>
      )}
    </div>
  );
}
