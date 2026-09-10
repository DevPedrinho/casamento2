/**
 * Código do convite: oito letras e números, entregues pelos noivos.
 *
 * O banco guarda sem separador e em maiúsculas; na tela mostramos em
 * dois blocos (ABCD-2345) porque é assim que se lê e se digita sem
 * errar. As duas formas convivem: tudo passa por normalizarCodigo antes
 * de ir para o banco.
 */

export const TAMANHO_CODIGO = 8;

/** Tira traço, espaço e acento, sobe para maiúsculas e corta no tamanho. */
export function normalizarCodigo(bruto: string): string {
  return bruto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TAMANHO_CODIGO);
}

/** ABCD2345 vira ABCD-2345, para caber na tela e na cabeça. */
export function formatarCodigo(codigo: string | null): string {
  const limpo = normalizarCodigo(codigo ?? "");
  if (limpo.length <= 4) return limpo;
  return `${limpo.slice(0, 4)}-${limpo.slice(4)}`;
}

export function codigoCompleto(codigo: string): boolean {
  return normalizarCodigo(codigo).length === TAMANHO_CODIGO;
}
