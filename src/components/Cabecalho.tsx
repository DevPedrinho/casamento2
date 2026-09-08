"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { CASAMENTO } from "@/lib/config";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/nossa-historia", rotulo: "Nossa História" },
  { href: "/mural", rotulo: "Mural" },
  { href: "/presentes", rotulo: "Presentes" },
  { href: "/confirmar", rotulo: "Confirmar Presença" },
];

export function Cabecalho() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const supabase = criarClienteNavegador();

    async function carregar(userId: string | undefined) {
      if (!userId) {
        setLogado(false);
        setAdmin(false);
        return;
      }
      setLogado(true);
      const { data } = await supabase
        .from("guests")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();
      setAdmin(Boolean(data?.is_admin));
    }

    supabase.auth.getUser().then(({ data }) => carregar(data.user?.id));

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      carregar(sessao?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fecha o menu mobile ao trocar de página.
  useEffect(() => setAberto(false), [caminho]);

  return (
    <header className="sticky top-0 z-50 border-b border-terra/15 bg-creme/92 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Início">
          <Image
            src="/img/monograma-dp.png"
            alt=""
            width={80}
            height={77}
            priority
            className="h-10 w-auto"
          />
          <span className="titulo-serif versalete hidden text-sm text-oliva sm:block">
            {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
          </span>
        </Link>

        <ul className="hidden items-center gap-5 lg:gap-7 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`titulo-serif whitespace-nowrap text-sm transition-colors hover:text-oliva ${
                  caminho === link.href ? "text-oliva" : "text-terra"
                }`}
              >
                {link.rotulo}
              </Link>
            </li>
          ))}
          <li>
            {logado === null ? (
              <span className="block h-8 w-24" aria-hidden="true" />
            ) : logado ? (
              <Link
                href={admin ? "/admin" : "/area-do-convidado"}
                className="titulo-serif versalete rounded-sm border border-oliva/40 px-4 py-2 text-xs text-oliva transition-colors hover:bg-oliva hover:text-creme-claro"
              >
                {admin ? "Painel" : "Minha área"}
              </Link>
            ) : (
              <Link
                href="/entrar"
                className="titulo-serif versalete rounded-sm border border-oliva/40 px-4 py-2 text-xs text-oliva transition-colors hover:bg-oliva hover:text-creme-claro"
              >
                Entrar
              </Link>
            )}
          </li>
        </ul>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="p-2 text-oliva md:hidden"
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
            {aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      <div id="menu-mobile" hidden={!aberto} className="border-t border-terra/15 md:hidden">
        <ul className="mx-auto max-w-6xl px-5 py-3">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="titulo-serif block py-3 text-base text-terra transition-colors hover:text-oliva"
              >
                {link.rotulo}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={logado ? (admin ? "/admin" : "/area-do-convidado") : "/entrar"}
              className="titulo-serif block py-3 text-base text-oliva"
            >
              {logado ? (admin ? "Painel dos noivos" : "Minha área") : "Entrar / Cadastrar"}
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
