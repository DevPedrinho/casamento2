/** Formata centavos como moeda brasileira. Sem valor = "cota livre". */
export function formatarPreco(centavos: number | null): string | null {
  if (centavos === null || centavos === undefined) return null;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Só deixa passar links http(s). Bloqueia `javascript:` e afins, já que o
 * endereço vem de um campo de texto do painel e vai direto para um href.
 */
export function linkSeguro(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
