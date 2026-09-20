/**
 * As regras de idade do convite. Vivem fora de convidado.ts porque aquele
 * arquivo é server-only e estas funções rodam também no navegador.
 */
/** Idade a partir da qual a pessoa recebe código e entra no site. */
export const IDADE_MINIMA_ACESSO = 10;
/** Até esta idade a criança é só cadastro: fica fora do total e do buffet. */
export const IDADE_DE_COLO = 3;

/** Entra nas contagens de convidados e de pessoas na festa? */
export function contaNoTotal(c: { age: number | null }): boolean {
  return c.age === null || c.age > IDADE_DE_COLO;
}

/** Recebe código do convite? Criança pequena é cadastro sem acesso. */
export function temAcessoAoSite(c: { age: number | null }): boolean {
  return c.age === null || c.age >= IDADE_MINIMA_ACESSO;
}
