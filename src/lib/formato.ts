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

/** Converte "1.234,56" ou "1234.56" em centavos. null quando vazio. */
export function paraCentavos(valor: string): number | null {
  const limpo = valor.trim();
  if (!limpo) return null;
  const numero = Number(limpo.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : null;
}

/** Centavos -> texto editável no formulário ("" quando não há valor). */
export function paraCampo(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined ? "" : (centavos / 100).toString();
}

/** Sempre devolve um valor em reais, mesmo quando é zero. */
export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  // Datas vêm como "2027-05-22"; montamos local para não cair no dia anterior.
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}

/** Dias até a data (negativo = já passou). null quando não há data. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const alvo = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** "agora", "há 5 min", "há 3 h", "ontem", ou a data cheia. */
export function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;

  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/** Quanto tempo falta para o story sumir. */
export function tempoRestante(iso: string): string {
  const minutos = Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutos <= 0) return "expirando";
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h`;
}
