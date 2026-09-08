"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECOES = [
  { href: "/admin", rotulo: "Visão geral" },
  { href: "/admin/checklist", rotulo: "Checklist" },
  { href: "/admin/fornecedores", rotulo: "Fornecedores" },
  { href: "/admin/financeiro", rotulo: "Financeiro" },
  { href: "/admin/presentes", rotulo: "Presentes" },
  { href: "/admin/convidados", rotulo: "Convidados" },
];

export function NavAdmin() {
  const caminho = usePathname();

  return (
    <nav className="mt-9 -mx-5 overflow-x-auto px-5" aria-label="Seções do painel">
      <ul className="flex w-max min-w-full items-center justify-start gap-2.5 sm:justify-center">
        {SECOES.map((secao) => {
          const ativa = caminho === secao.href;
          return (
            <li key={secao.href}>
              <Link
                href={secao.href}
                aria-current={ativa ? "page" : undefined}
                className={`versalete titulo-serif block whitespace-nowrap rounded-full border px-5 py-2.5 text-xs transition-colors ${
                  ativa
                    ? "border-oliva bg-oliva text-creme-claro"
                    : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
                }`}
              >
                {secao.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
