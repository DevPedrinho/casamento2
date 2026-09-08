"use client";

import type { ReactNode } from "react";
import { reais } from "@/lib/formato";

/** Cartão de destaque numérico usado nos resumos do painel. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  tom?: "neutro" | "oliva" | "lavanda" | "alerta";
}) {
  const tons = {
    neutro: "text-oliva",
    oliva: "text-oliva",
    lavanda: "text-lavanda",
    alerta: "text-red-800",
  } as const;

  return (
    <div className="rounded-sm border border-terra/20 bg-creme-claro px-5 py-6 text-center">
      <span className={`titulo-serif block text-3xl tabular-nums lining-nums ${tons[tom]}`}>{valor}</span>
      <span className="versalete mt-2 block text-xs text-terra">{rotulo}</span>
      {detalhe && <span className="mt-1.5 block text-sm text-terra/85">{detalhe}</span>}
    </div>
  );
}

/** Barra de progresso simples, usada no checklist e no orçamento. */
export function Progresso({
  atual,
  total,
  rotulo,
  tom = "oliva",
}: {
  atual: number;
  total: number;
  rotulo?: string;
  tom?: "oliva" | "lavanda" | "alerta";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
  const cores = { oliva: "bg-oliva", lavanda: "bg-lavanda", alerta: "bg-red-800" } as const;

  return (
    <div>
      {rotulo && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="versalete text-xs text-terra">{rotulo}</span>
          <span className="titulo-serif text-base text-oliva tabular-nums lining-nums">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-creme-escuro"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo ?? "Progresso"}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${cores[tom]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Bloco de conteúdo do painel, com título e ação opcional no canto. */
export function Bloco({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="titulo-serif text-2xl text-oliva">{titulo}</h2>
          {descricao && <p className="mt-1.5 text-sm text-terra">{descricao}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

/** Etiqueta colorida de status. */
export function Selo({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "oliva" | "lavanda" | "alerta" | "apagado";
}) {
  const tons = {
    neutro: "bg-terra/15 text-terra",
    oliva: "bg-oliva text-creme-claro",
    lavanda: "bg-lavanda text-creme-claro",
    alerta: "bg-red-800/15 text-red-900",
    apagado: "bg-creme-escuro text-terra/70",
  } as const;

  return (
    <span className={`versalete inline-block rounded-full px-3 py-1 text-xs ${tons[tom]}`}>
      {children}
    </span>
  );
}

/** Linha "rótulo — valor em R$" usada nos resumos financeiros. */
export function LinhaValor({
  rotulo,
  centavos,
  destaque = false,
}: {
  rotulo: string;
  centavos: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-terra/15 py-2.5 last:border-0">
      <span className={destaque ? "titulo-serif text-base text-oliva" : "text-sm text-terra"}>
        {rotulo}
      </span>
      <span
        className={`tabular-nums lining-nums ${destaque ? "titulo-serif text-xl text-oliva" : "text-base text-terra"}`}
      >
        {reais(centavos)}
      </span>
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="titulo-serif py-8 text-center text-base text-terra italic">{children}</p>;
}
