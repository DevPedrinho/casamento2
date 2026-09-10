"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Icone, type NomeIcone } from "@/components/Icones";
import { Avatar } from "@/components/Avatar";
import { CASAMENTO } from "@/lib/config";

export type Pendencias = {
  convidados?: number;
  crm?: number;
  tarefas?: number;
  financeiro?: number;
  mural?: number;
};

type Item = { href: string; rotulo: string; icone: NomeIcone; chave?: keyof Pendencias };

/** Os que ficam sempre à vista na barra. */
const PRINCIPAIS: Item[] = [
  { href: "/admin", rotulo: "Dashboard", icone: "dashboard" },
  { href: "/admin/convidados", rotulo: "Convidados", icone: "convidados", chave: "convidados" },
  { href: "/admin/crm", rotulo: "CRM", icone: "crm", chave: "crm" },
  { href: "/admin/checklist", rotulo: "Tarefas", icone: "tarefas", chave: "tarefas" },
  { href: "/admin/kanban", rotulo: "Kanban", icone: "kanban" },
  { href: "/admin/financeiro", rotulo: "Financeiro", icone: "financeiro", chave: "financeiro" },
];

/** Os demais entram no menu "Mais" — 11 itens inline não cabem sem cortar. */
const SECUNDARIOS: Item[] = [
  { href: "/admin/fornecedores", rotulo: "Fornecedores", icone: "fornecedores" },
  { href: "/admin/timeline", rotulo: "Timeline", icone: "timeline" },
  { href: "/admin/mural", rotulo: "Mural", icone: "mural", chave: "mural" },
  { href: "/admin/presentes", rotulo: "Presentes", icone: "presentes" },
  { href: "/admin/locais", rotulo: "Local do evento", icone: "local" },
];

const ITENS: Item[] = [...PRINCIPAIS, ...SECUNDARIOS];

/** /admin só casa exato; os demais pegam as subrotas. */
function estaAtivo(caminho: string, href: string) {
  return href === "/admin" ? caminho === "/admin" : caminho.startsWith(href);
}

export function BarraTopo({ nome, pendencias }: { nome: string; pendencias: Pendencias }) {
  const caminho = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [contaAberta, setContaAberta] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const contaRef = useRef<HTMLDivElement>(null);
  const maisRef = useRef<HTMLLIElement>(null);

  // Navegar fecha os menus abertos.
  useEffect(() => {
    setMenuAberto(false);
    setMaisAberto(false);
    setContaAberta(false);
  }, [caminho]);

  // Clique fora fecha o menu da conta.
  useEffect(() => {
    if (!contaAberta) return;
    function aoClicar(evento: MouseEvent) {
      if (contaRef.current && !contaRef.current.contains(evento.target as Node)) {
        setContaAberta(false);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [contaAberta]);

  // Idem para o menu "Mais".
  useEffect(() => {
    if (!maisAberto) return;
    function aoClicar(evento: MouseEvent) {
      if (maisRef.current && !maisRef.current.contains(evento.target as Node)) {
        setMaisAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [maisAberto]);

  async function sair() {
    setSaindo(true);
    await criarClienteNavegador().auth.signOut();
    // replace: o botão voltar não retorna à área logada.
    router.replace("/entrar");
    router.refresh();
  }

  const itemAtivo = ITENS.find((i) => estaAtivo(caminho, i.href));

  return (
    <header className="sticky top-0 z-40 border-b border-terra/15 bg-creme-claro/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        {/* ---------- Marca, no canto superior esquerdo ---------- */}
        <Link href="/admin" className="flex shrink-0 items-center gap-3">
          <Image
            src="/img/monograma-dp.png"
            alt=""
            width={80}
            height={77}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden min-w-0 sm:block">
            <span className="versalete titulo-serif block truncate text-xs text-oliva">
              {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
            </span>
            <span className="block truncate text-xs text-terra">Painel dos noivos</span>
          </span>
        </Link>

        <span className="hidden h-8 w-px shrink-0 bg-terra/20 lg:block" aria-hidden="true" />

        {/* ---------- Navegação, rolando na horizontal quando aperta ---------- */}
        <nav aria-label="Módulos" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {PRINCIPAIS.map((item) => {
              const ativo = estaAtivo(caminho, item.href);
              const badge = item.chave ? pendencias[item.chave] : undefined;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 transition-colors ${
                      ativo
                        ? "bg-oliva text-creme-claro"
                        : "text-terra hover:bg-creme-escuro/60 hover:text-oliva"
                    }`}
                  >
                    <Icone nome={item.icone} className="h-4 w-4 shrink-0" />
                    <span className="titulo-serif hidden text-sm xl:inline">{item.rotulo}</span>
                    {badge !== undefined && badge > 0 && (
                      <span
                        className={`titulo-serif rounded-full px-1.5 text-xs tabular-nums lining-nums ${
                          ativo ? "bg-creme-claro text-oliva" : "bg-lavanda text-creme-claro"
                        }`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* Os módulos restantes, para a barra não cortar nomes. */}
            <li ref={maisRef} className="relative">
              <button
                type="button"
                onClick={() => setMaisAberto((v) => !v)}
                aria-expanded={maisAberto}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 transition-colors ${
                  SECUNDARIOS.some((i) => estaAtivo(caminho, i.href))
                    ? "bg-oliva text-creme-claro"
                    : "text-terra hover:bg-creme-escuro/60 hover:text-oliva"
                }`}
              >
                <Icone nome="menu" className="h-4 w-4 shrink-0" />
                <span className="titulo-serif text-sm">Mais</span>
              </button>

              {maisAberto && (
                <ul className="absolute left-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-sm border border-terra/20 bg-creme-claro shadow-lg">
                  {SECUNDARIOS.map((item) => {
                    const ativo = estaAtivo(caminho, item.href);
                    const badge = item.chave ? pendencias[item.chave] : undefined;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={ativo ? "page" : undefined}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            ativo
                              ? "bg-oliva text-creme-claro"
                              : "text-terra hover:bg-creme-escuro/60 hover:text-oliva"
                          }`}
                        >
                          <Icone nome={item.icone} className="h-4 w-4 shrink-0" />
                          <span className="titulo-serif flex-1 text-base">{item.rotulo}</span>
                          {badge !== undefined && badge > 0 && (
                            <span className="titulo-serif rounded-full bg-lavanda px-1.5 text-xs text-creme-claro tabular-nums lining-nums">
                              {badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        {/* Nome do módulo atual, quando a navegação está recolhida */}
        {itemAtivo && (
          <span className="titulo-serif min-w-0 flex-1 truncate text-lg text-oliva lg:hidden">
            {itemAtivo.rotulo}
          </span>
        )}

        {/* ---------- Conta ---------- */}
        <div ref={contaRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setContaAberta((v) => !v)}
            aria-expanded={contaAberta}
            aria-label="Menu da conta"
            className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-creme-escuro/60"
          >
            <Avatar nome={nome} tamanho="sm" />
          </button>

          {contaAberta && (
            <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-sm border border-terra/20 bg-creme-claro shadow-lg">
              <p className="truncate border-b border-terra/15 px-4 py-3 text-sm text-terra" title={nome}>
                {nome}
              </p>
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 text-terra transition-colors hover:bg-creme-escuro/60 hover:text-oliva"
              >
                <Icone nome="local" className="h-4 w-4" />
                <span className="titulo-serif text-base">Ver o site</span>
              </Link>
              <button
                type="button"
                onClick={sair}
                disabled={saindo}
                className="flex w-full items-center gap-3 px-4 py-3 text-terra transition-colors hover:bg-red-800/10 hover:text-red-800 disabled:opacity-50"
              >
                <Icone nome="sair" className="h-4 w-4" />
                <span className="titulo-serif text-base">{saindo ? "Saindo…" : "Sair"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ---------- Menu compacto ---------- */}
        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          aria-expanded={menuAberto}
          aria-controls="menu-modulos"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center text-oliva lg:hidden"
        >
          <Icone nome={menuAberto ? "fechar" : "menu"} className="h-6 w-6" />
        </button>
      </div>

      {/* Painel de módulos no compacto: some ao navegar, mas a barra fica. */}
      <div id="menu-modulos" hidden={!menuAberto} className="border-t border-terra/15 lg:hidden">
        <ul className="grid grid-cols-1 gap-1 px-3 py-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
          {ITENS.map((item) => {
            const ativo = estaAtivo(caminho, item.href);
            const badge = item.chave ? pendencias[item.chave] : undefined;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-sm px-3 py-3 transition-colors ${
                    ativo ? "bg-oliva text-creme-claro" : "text-terra hover:bg-creme-escuro/60"
                  }`}
                >
                  <Icone nome={item.icone} className="h-5 w-5 shrink-0" />
                  <span className="titulo-serif min-w-0 flex-1 truncate text-base">
                    {item.rotulo}
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`titulo-serif rounded-full px-1.5 text-xs tabular-nums lining-nums ${
                        ativo ? "bg-creme-claro text-oliva" : "bg-lavanda text-creme-claro"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
