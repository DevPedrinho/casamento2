"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Icone, type NomeIcone } from "@/components/Icones";
import { CASAMENTO } from "@/lib/config";

export type Pendencias = {
  convidados?: number;
  crm?: number;
  tarefas?: number;
  financeiro?: number;
  mural?: number;
};

type Item = { href: string; rotulo: string; icone: NomeIcone; chave?: keyof Pendencias };

const SECOES: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Visão",
    itens: [
      { href: "/admin", rotulo: "Dashboard", icone: "dashboard" },
      { href: "/admin/convidados", rotulo: "Convidados", icone: "convidados", chave: "convidados" },
      { href: "/admin/crm", rotulo: "CRM", icone: "crm", chave: "crm" },
    ],
  },
  {
    titulo: "Organização",
    itens: [
      { href: "/admin/checklist", rotulo: "Tarefas", icone: "tarefas", chave: "tarefas" },
      { href: "/admin/financeiro", rotulo: "Financeiro", icone: "financeiro", chave: "financeiro" },
      { href: "/admin/fornecedores", rotulo: "Fornecedores", icone: "fornecedores" },
      { href: "/admin/locais", rotulo: "Local do evento", icone: "local" },
    ],
  },
  {
    titulo: "Convidados",
    itens: [
      { href: "/admin/presentes", rotulo: "Presentes", icone: "presentes" },
      { href: "/admin/mural", rotulo: "Mural", icone: "mural", chave: "mural" },
    ],
  },
];

const CHAVE_RECOLHIDA = "dp-sidebar-recolhida";

export function Sidebar({ nome, pendencias }: { nome: string; pendencias: Pendencias }) {
  const caminho = usePathname();
  const router = useRouter();
  const [recolhida, setRecolhida] = useState(false);
  const [abertaNoMobile, setAbertaNoMobile] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // A preferência de recolher fica no navegador de quem usa.
  useEffect(() => {
    try {
      setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      // Navegador sem storage: segue expandida.
    }
  }, []);

  function alternarRecolhida() {
    setRecolhida((v) => {
      const novo = !v;
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, novo ? "1" : "0");
      } catch {
        // Sem storage, vale só para esta sessão.
      }
      return novo;
    });
  }

  // Trocar de página fecha o menu no celular.
  useEffect(() => setAbertaNoMobile(false), [caminho]);

  async function sair() {
    setSaindo(true);
    const supabase = criarClienteNavegador();
    await supabase.auth.signOut();
    // replace em vez de push: o botão voltar não retorna à área logada.
    router.replace("/entrar");
    router.refresh();
  }

  const largura = recolhida ? "lg:w-20" : "lg:w-64";

  return (
    <>
      {/* Barra superior — só no celular */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-terra/15 bg-creme/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image src="/img/monograma-dp.png" alt="" width={80} height={77} className="h-8 w-auto" />
          <span className="versalete titulo-serif text-xs text-oliva">Painel</span>
        </Link>
        <button
          type="button"
          onClick={() => setAbertaNoMobile(true)}
          aria-label="Abrir menu"
          className="p-2 text-oliva"
        >
          <Icone nome="menu" className="h-6 w-6" />
        </button>
      </div>

      {/* Fundo escuro do menu mobile */}
      {abertaNoMobile && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAbertaNoMobile(false)}
          className="fixed inset-0 z-40 bg-oliva-escuro/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-terra/15 bg-creme-claro transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width] ${largura} ${
          abertaNoMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-terra/15 px-5 py-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <Image
              src="/img/monograma-dp.png"
              alt=""
              width={80}
              height={77}
              className="h-9 w-auto shrink-0"
            />
            {!recolhida && (
              <span className="min-w-0">
                <span className="versalete titulo-serif block truncate text-xs text-oliva">
                  {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
                </span>
                <span className="block truncate text-xs text-terra">{CASAMENTO.dataCurta}</span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setAbertaNoMobile(false)}
            aria-label="Fechar menu"
            className="ml-auto p-1 text-terra lg:hidden"
          >
            <Icone nome="fechar" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {SECOES.map((secao) => (
            <div key={secao.titulo} className="mb-6 last:mb-0">
              {!recolhida && (
                <p className="versalete mb-2 px-3 text-xs text-terra/70">{secao.titulo}</p>
              )}
              <ul className="space-y-1">
                {secao.itens.map((item) => {
                  // /admin só fica ativo na própria rota; os outros pegam subrotas.
                  const ativo =
                    item.href === "/admin"
                      ? caminho === "/admin"
                      : caminho.startsWith(item.href);
                  const badge = item.chave ? pendencias[item.chave] : undefined;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={recolhida ? item.rotulo : undefined}
                        aria-current={ativo ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors ${
                          ativo
                            ? "bg-oliva text-creme-claro"
                            : "text-terra hover:bg-creme-escuro/60 hover:text-oliva"
                        } ${recolhida ? "lg:justify-center" : ""}`}
                      >
                        <Icone nome={item.icone} className="h-5 w-5 shrink-0" />
                        {!recolhida && (
                          <span className="titulo-serif min-w-0 flex-1 truncate text-base">
                            {item.rotulo}
                          </span>
                        )}
                        {badge !== undefined && badge > 0 && (
                          <span
                            className={`titulo-serif shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums lining-nums ${
                              ativo ? "bg-creme-claro text-oliva" : "bg-lavanda text-creme-claro"
                            } ${recolhida ? "lg:absolute lg:ml-7 lg:-mt-6 lg:px-1.5" : ""}`}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-terra/15 px-3 py-4">
          {!recolhida && (
            <p className="mb-3 truncate px-3 text-sm text-terra" title={nome}>
              {nome}
            </p>
          )}

          <Link
            href="/"
            title={recolhida ? "Ver o site" : undefined}
            className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-terra transition-colors hover:bg-creme-escuro/60 hover:text-oliva ${
              recolhida ? "lg:justify-center" : ""
            }`}
          >
            <Icone nome="local" className="h-5 w-5 shrink-0" />
            {!recolhida && <span className="titulo-serif text-base">Ver o site</span>}
          </Link>

          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            title={recolhida ? "Sair" : undefined}
            className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-terra transition-colors hover:bg-red-800/10 hover:text-red-800 disabled:opacity-50 ${
              recolhida ? "lg:justify-center" : ""
            }`}
          >
            <Icone nome="sair" className="h-5 w-5 shrink-0" />
            {!recolhida && (
              <span className="titulo-serif text-base">{saindo ? "Saindo…" : "Sair"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={alternarRecolhida}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            className={`mt-2 hidden w-full items-center gap-3 rounded-sm px-3 py-2 text-terra/70 transition-colors hover:text-oliva lg:flex ${
              recolhida ? "lg:justify-center" : ""
            }`}
          >
            <Icone
              nome="recolher"
              className={`h-5 w-5 shrink-0 transition-transform ${recolhida ? "rotate-180" : ""}`}
            />
            {!recolhida && <span className="text-sm">Recolher</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
