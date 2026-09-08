"use client";

import { usePathname } from "next/navigation";

/**
 * Esconde o rodapé do site dentro do painel, que tem navegação própria.
 * O Rodape em si continua sendo um componente de servidor.
 */
export function SomenteNoSite({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  if (caminho.startsWith("/admin")) return null;
  return <>{children}</>;
}
