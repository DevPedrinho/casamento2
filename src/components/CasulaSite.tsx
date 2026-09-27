"use client";

import { usePathname } from "next/navigation";

/**
 * Esconde o rodapé do site dentro do painel, que tem navegação própria.
 * O Rodape em si continua sendo um componente de servidor.
 *
 * `ocultarEm` troca a lista: o assistente também sai do convite digital,
 * onde o botão flutuante disputaria o canto com o controle da música.
 */
export function SomenteNoSite({
  ocultarEm = ["/admin"],
  children,
}: {
  ocultarEm?: string[];
  children: React.ReactNode;
}) {
  const caminho = usePathname();
  if (ocultarEm.some((rota) => caminho.startsWith(rota))) return null;
  return <>{children}</>;
}
