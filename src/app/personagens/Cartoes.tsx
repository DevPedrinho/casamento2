"use client";

import { useMemo, useState } from "react";
import type { PersonagemCerimonia } from "@/lib/tipos";
import { Raminho } from "@/components/Ornamentos";

export type PessoaNaPagina = PersonagemCerimonia & { url: string | null };

/** A foto quadrada com o raminho lilás no canto — ou as iniciais, sem foto. */
function Retrato({ pessoa, className = "" }: { pessoa: PessoaNaPagina; className?: string }) {
  const iniciais = pessoa.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="aspect-square overflow-hidden rounded-sm border border-terra/20 bg-creme-escuro">
        {pessoa.url ? (
          // URL pública do storage; o otimizador do next/image não se aplica.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pessoa.url} alt={pessoa.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="titulo-serif text-3xl text-oliva/70">{iniciais}</span>
          </div>
        )}
      </div>
      <Raminho className="pointer-events-none absolute -bottom-3 -left-3 w-12 text-lavanda/80" />
    </div>
  );
}

/** Cartão pequeno (raízes, madrinhas) ou largo (cortejo). */
export function CartaoPessoa({
  pessoa,
  formato = "pequeno",
}: {
  pessoa: PessoaNaPagina;
  formato?: "pequeno" | "largo";
}) {
  if (formato === "largo") {
    return (
      <li className="flex items-center gap-5 rounded-sm border border-terra/20 bg-creme-claro p-5 sm:gap-6 sm:p-6">
        <Retrato pessoa={pessoa} className="w-28 sm:w-36" />
        <div className="min-w-0">
          <p className="versalete text-xs text-lavanda">{pessoa.role_label}</p>
          <h3 className="titulo-serif mt-1 text-2xl text-oliva">{pessoa.name}</h3>
          {pessoa.description && (
            <p className="mt-2 text-sm leading-relaxed text-terra sm:text-base">{pessoa.description}</p>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col items-center rounded-sm border border-terra/20 bg-creme-claro px-4 pb-6 pt-5 text-center sm:px-5">
      <Retrato pessoa={pessoa} className="w-28 sm:w-32" />
      <p className="versalete mt-5 text-xs text-lavanda">{pessoa.role_label}</p>
      <h3 className="titulo-serif mt-1 text-xl text-oliva">{pessoa.name}</h3>
      {pessoa.description && (
        <p className="mt-2 text-sm leading-relaxed text-terra">{pessoa.description}</p>
      )}
    </li>
  );
}

/** Os noivos: cartão grande, com o "Conhecer melhor" que abre o texto longo. */
export function Protagonista({ pessoa }: { pessoa: PessoaNaPagina }) {
  const [aberto, setAberto] = useState(false);

  return (
    <article className="flex flex-col gap-5 rounded-sm border border-terra/20 bg-creme p-5 sm:flex-row sm:gap-7 sm:p-7">
      <Retrato pessoa={pessoa} className="w-40 self-center sm:w-48 sm:self-start" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="versalete text-xs text-lavanda">{pessoa.role_label}</p>
        <h3 className="titulo-serif mt-1 text-3xl text-oliva sm:text-4xl">{pessoa.name}</h3>
        {pessoa.description && (
          <p className="mt-3 text-base leading-relaxed text-terra">{pessoa.description}</p>
        )}
        {pessoa.long_text && (
          <>
            {aberto && (
              <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-terra">{pessoa.long_text}</p>
            )}
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              className="titulo-serif mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-lavanda/40 bg-lavanda/10 px-5 text-sm text-oliva transition-colors hover:bg-lavanda/20"
            >
              {aberto ? "Fechar" : "Conhecer melhor"}
              <span aria-hidden="true">{aberto ? "↑" : "→"}</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/** Madrinhas, padrinhos e quem mais os noivos agruparem, em abas. */
export function AoNossoLado({ pessoas }: { pessoas: PessoaNaPagina[] }) {
  const grupos = useMemo(() => {
    const vistos: string[] = [];
    for (const p of pessoas) {
      const g = p.group_label?.trim();
      if (g && !vistos.includes(g)) vistos.push(g);
    }
    return vistos;
  }, [pessoas]);

  const [grupo, setGrupo] = useState<string>(grupos[0] ?? "Todos");
  const visiveis = grupo === "Todos" ? pessoas : pessoas.filter((p) => p.group_label?.trim() === grupo);

  return (
    <div>
      {grupos.length > 1 && (
        <div
          role="group"
          aria-label="Escolher grupo"
          className="mx-auto mb-10 flex w-fit max-w-full flex-wrap justify-center rounded-full border border-terra/30 bg-creme p-1"
        >
          {[...grupos, "Todos"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrupo(g)}
              aria-pressed={grupo === g}
              className={`titulo-serif inline-flex min-h-10 items-center rounded-full px-5 text-sm transition-colors ${
                grupo === g ? "bg-lavanda/25 text-oliva" : "text-terra hover:text-oliva"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {visiveis.map((p) => (
          <CartaoPessoa key={p.id} pessoa={p} />
        ))}
      </ul>
    </div>
  );
}
