"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@ark-ui/react/collapsible";
import { ChevronDownIcon } from "lucide-react";

/**
 * Item que abre e fecha (o "Collapsible" da Ark UI), vestido com a
 * identidade do casamento: creme, oliva, lavanda, a serifada nos títulos.
 *
 * A abertura é animada pela altura real do conteúdo (a Ark expõe
 * --height) — ver .colapsavel-conteudo em globals.css. Com "reduzir
 * movimento", abre na hora.
 */
export function Colapsavel({
  titulo,
  icone,
  children,
  abertoDeInicio = false,
  className = "",
}: {
  titulo: ReactNode;
  /** Algo à esquerda do título, como o ícone de um item do manual. */
  icone?: ReactNode;
  children: ReactNode;
  abertoDeInicio?: boolean;
  className?: string;
}) {
  return (
    <Collapsible.Root
      defaultOpen={abertoDeInicio}
      className={`group/colapsavel overflow-hidden rounded-sm border border-terra/15 bg-creme-claro/70 transition-colors data-[state=open]:border-lavanda/35 data-[state=open]:bg-creme-claro ${className}`}
    >
      <Collapsible.Trigger className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-lavanda/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-oliva sm:px-6">
        {icone}
        <span className="titulo-serif min-w-0 flex-1 text-lg leading-snug text-oliva sm:text-xl">{titulo}</span>
        <Collapsible.Indicator className="shrink-0 text-lavanda transition-transform duration-300 data-[state=open]:rotate-180">
          <ChevronDownIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </Collapsible.Indicator>
      </Collapsible.Trigger>
      <Collapsible.Content className="colapsavel-conteudo">
        <div className="border-t border-terra/10 px-5 py-4 sm:px-6">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
