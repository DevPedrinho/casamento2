import type { Autor } from "@/lib/tipos";

/**
 * A etiqueta do papel, ao lado do nome no mural.
 *
 * Só aparece para quem os noivos marcaram como personagem principal e tem
 * papel escrito — madrinha, padrinho, mãe da noiva. É o que distingue, num
 * feed cheio, a foto da madrinha da foto de mais um convidado.
 */
export function EtiquetaPapel({
  autor,
  tom = "claro",
}: {
  autor: Autor | null | undefined;
  /** "claro" sobre fundo creme; "escuro" sobre a foto do story. */
  tom?: "claro" | "escuro";
}) {
  const papel = autor?.ceremony_role?.trim();
  if (!autor?.is_featured || !papel) return null;

  return (
    <span
      className={`versalete ml-2 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 align-middle text-xs ${
        tom === "claro"
          ? "bg-lavanda/20 text-lavanda"
          : "bg-creme-claro/25 text-creme-claro"
      }`}
    >
      {papel}
    </span>
  );
}
