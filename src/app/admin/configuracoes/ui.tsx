"use client";

import type { ReactNode } from "react";
import { Botao } from "@/components/Botao";

/**
 * As peças visuais da página de Configurações.
 *
 * Cada seção salva sozinha, no próprio botão: não existe mais "Salvar
 * tudo". Rótulos e textos de apoio são um degrau maiores e mais escuros
 * que o padrão do painel — é uma página de formulário longo, lida com
 * calma, e a versalete de 13px em terra cansava a vista.
 */

export function SecaoConfig({
  id,
  titulo,
  descricao,
  children,
  rodape,
  onSubmit,
}: {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  /** Com isto, a seção vira um formulário próprio. */
  onSubmit?: (evento: React.FormEvent) => void;
}) {
  const corpo = (
    <>
      <header className="border-b border-terra/15 px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="titulo-serif text-2xl text-oliva sm:text-3xl">{titulo}</h2>
        {descricao && <p className="mt-2 max-w-3xl text-base leading-relaxed text-terra">{descricao}</p>}
      </header>
      <div className="px-5 py-6 sm:px-8 sm:py-7">{children}</div>
      {rodape}
    </>
  );

  const classe =
    "scroll-mt-40 overflow-hidden rounded-sm border border-terra/20 bg-creme-claro shadow-[0_1px_0_rgba(94,74,59,0.04)]";

  return onSubmit ? (
    <form id={id} onSubmit={onSubmit} className={classe}>
      {corpo}
    </form>
  ) : (
    <section id={id} className={classe}>
      {corpo}
    </section>
  );
}

/** Rótulo de campo desta página: versalete maior e mais escura. */
export function RotuloConfig({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="versalete mb-2 block text-sm text-oliva-escuro">
      {children}
    </label>
  );
}

/** Texto de apoio abaixo de um campo ou de um grupo. */
export function Ajuda({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-terra">{children}</p>;
}

export type EstadoSalvar = { tipo: "ok" } | { tipo: "erro"; mensagem: string } | null;

/**
 * O rodapé de cada seção: à esquerda, o que está acontecendo; à direita,
 * o botão. "Salvar" só acende quando há o que salvar.
 */
export function RodapeSalvar({
  sujo,
  salvando,
  estado,
}: {
  sujo: boolean;
  salvando: boolean;
  estado: EstadoSalvar;
}) {
  let aviso: ReactNode = <span className="text-terra">Tudo salvo.</span>;
  if (estado?.tipo === "erro") {
    aviso = (
      <span role="alert" className="font-medium text-red-800">
        {estado.mensagem}
      </span>
    );
  } else if (sujo) {
    aviso = <span className="font-medium text-lavanda">Alterações não salvas</span>;
  } else if (estado?.tipo === "ok") {
    aviso = (
      <span role="status" className="font-medium text-oliva">
        ✓ Salvo — o site já mostra
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-terra/15 bg-creme/50 px-5 py-4 sm:px-8">
      <p className="text-sm">{aviso}</p>
      <Botao type="submit" disabled={salvando || !sujo}>
        {salvando ? "Salvando…" : "Salvar"}
      </Botao>
    </div>
  );
}
