/** A foto de perfil do convidado num círculo — ou as iniciais, quando ele não subiu foto. */
export function Avatar({
  nome,
  url = null,
  tamanho = "md",
  tom = "oliva",
  className = "",
}: {
  nome: string;
  /** URL pública da foto; sem ela, entram as iniciais. */
  url?: string | null;
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

  if (url) {
    return (
      // URL pública do storage; o otimizador do next/image não se aplica.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className={`shrink-0 rounded-full object-cover ${tamanhos[tamanho]} ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`titulo-serif flex shrink-0 items-center justify-center rounded-full ${tons[tom]} ${tamanhos[tamanho]} ${className}`}
    >
      {iniciais}
    </span>
  );
}
