/** Iniciais do convidado dentro de um círculo — não pedimos foto de perfil. */
export function Avatar({
  nome,
  tamanho = "md",
  tom = "oliva",
  className = "",
}: {
  nome: string;
  tamanho?: "sm" | "md" | "lg";
  /** Em fundo escuro (stories) o avatar precisa inverter, senão some. */
  tom?: "oliva" | "claro";
  className?: string;
}) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const iniciais =
    partes.length === 0
      ? "?"
      : partes.length === 1
        ? partes[0].slice(0, 2).toUpperCase()
        : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();

  const tamanhos = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-base",
  } as const;

  const tons = {
    oliva: "bg-oliva text-creme-claro",
    claro: "bg-creme-claro text-oliva",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={`titulo-serif flex shrink-0 items-center justify-center rounded-full ${tons[tom]} ${tamanhos[tamanho]} ${className}`}
    >
      {iniciais}
    </span>
  );
}
