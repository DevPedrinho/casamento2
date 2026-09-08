import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "solido" | "contorno" | "lavanda";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm px-7 py-3 text-sm versalete titulo-serif transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva";

const VARIANTES: Record<Variante, string> = {
  solido: "bg-oliva text-creme-claro hover:bg-oliva-escuro shadow-sm",
  contorno: "border border-oliva/45 text-oliva hover:bg-oliva hover:text-creme-claro",
  lavanda: "bg-lavanda text-creme-claro hover:bg-lavanda/85 shadow-sm",
};

export function Botao({
  variante = "solido",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; children: ReactNode }) {
  return (
    <button className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "solido",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; children: ReactNode }) {
  return (
    <Link className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/** Link externo (usado no botão Presentear, que sai do site). */
export function BotaoExterno({
  variante = "solido",
  className = "",
  children,
  ...props
}: ComponentProps<"a"> & { variante?: Variante; children: ReactNode }) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={`${BASE} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
