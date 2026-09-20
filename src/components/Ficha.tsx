"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icone } from "@/components/Icones";

/**
 * A ficha que abre por cima da lista — a mesma em todos os módulos.
 *
 * No celular sobe do rodapé e ocupa quase a tela toda; no computador abre
 * como gaveta lateral. O cartão da lista fica só com o resumo, e tudo o que
 * pede espaço (detalhes, ações, histórico) mora aqui.
 *
 * Fecha no Esc, no clique fora e no X; trava a rolagem da página atrás.
 */
export function Ficha({
  rotuloAria,
  aoFechar,
  cabecalho,
  abaixoDoCabecalho,
  rodape,
  children,
}: {
  rotuloAria: string;
  aoFechar: () => void;
  /** Título e o que fica ao lado do X. */
  cabecalho: ReactNode;
  /** Linha de destaque logo abaixo (um valor grande, um selo…). */
  abaixoDoCabecalho?: ReactNode;
  /** Os botões de ação; ficam presos no rodapé. */
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-oliva-escuro/50 sm:items-stretch sm:justify-end"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={rotuloAria}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full flex-col overflow-y-auto rounded-t-xl border-t border-terra/20 bg-creme-claro shadow-2xl sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0"
      >
        <header className="sticky top-0 z-10 border-b border-terra/20 bg-creme-claro px-5 pb-5 pt-4 sm:px-6">
          {/* O puxador que todo celular espera numa folha que sobe. */}
          <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-terra/30 sm:hidden" />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">{cabecalho}</div>
            <button
              ref={fecharRef}
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-terra transition-colors hover:text-oliva"
            >
              <Icone nome="fechar" />
            </button>
          </div>

          {abaixoDoCabecalho}
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>

        {rodape && (
          <footer className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-3 border-t border-terra/20 bg-creme-claro px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {rodape}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Um bloco da ficha: título em versalete, conteúdo dentro. */
export function CartaoFicha({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-terra/20 bg-creme px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="versalete text-xs text-lavanda">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Rótulo à esquerda, valor à direita. */
export function LinhaFicha({
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string | null;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-sm text-terra">{rotulo}</span>
      <span className="min-w-0 text-right">
        <span className={`block text-sm ${alerta ? "font-medium text-red-800" : "text-oliva"}`}>
          {valor}
        </span>
        {detalhe && (
          <span className={`block text-xs ${alerta ? "text-red-800" : "text-terra/80"}`}>{detalhe}</span>
        )}
      </span>
    </div>
  );
}

/** Um número grande com rótulo em cima, para o par "já pago / falta". */
export function NumeroFicha({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom: "oliva" | "lavanda";
}) {
  return (
    <div>
      <span className="versalete block text-xs text-terra">{rotulo}</span>
      <span
        className={`titulo-serif block text-2xl tabular-nums lining-nums ${
          tom === "oliva" ? "text-oliva" : "text-lavanda"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}

/** O link de ação em versalete que as fichas usam no rodapé e nos blocos. */
export const ACAO_FICHA =
  "versalete inline-flex min-h-11 items-center gap-1.5 text-xs underline underline-offset-4 transition-colors";
