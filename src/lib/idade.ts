/**
 * As regras de idade e de contagem do convite. Vivem fora de convidado.ts
 * porque aquele arquivo é server-only e estas funções rodam também no
 * navegador.
 */
/** Idade a partir da qual a pessoa recebe código e entra no site. */
export const IDADE_MINIMA_ACESSO = 10;
/** Até esta idade a criança é só cadastro: fica fora do total e do buffet. */
export const IDADE_DE_COLO = 3;

type ParaContar = { age: number | null; is_admin: boolean | null; ceremony_role: string | null };

/**
 * Noivo ou noiva. No painel, admin é sempre um dos dois — o layout de
 * /admin só deixa os noivos entrarem —, e o papel na cerimônia cobre quem
 * foi cadastrado assim sem login.
 */
export function ehNoivo(c: { is_admin: boolean | null; ceremony_role: string | null }): boolean {
  return Boolean(c.is_admin) || /^noiv[oa]$/i.test((c.ceremony_role ?? "").trim());
}

/** Criança de colo: idade conhecida de até 3 anos. */
export function ehDeColo(c: { age: number | null }): boolean {
  return c.age !== null && c.age <= IDADE_DE_COLO;
}

/** Entra nas contagens de convidados e de pessoas na festa? Nem colo, nem os noivos. */
export function contaNoTotal(c: ParaContar): boolean {
  return !ehNoivo(c) && !ehDeColo(c);
}

/** Recebe código do convite? Criança pequena é cadastro sem acesso. */
export function temAcessoAoSite(c: { age: number | null }): boolean {
  return c.age === null || c.age >= IDADE_MINIMA_ACESSO;
}

export const FAIXAS_ETARIAS = ["Criança", "Adolescente", "Adulto", "Idoso"] as const;
export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number];

/**
 * A faixa etária de verdade. A idade manda quando existe: o texto da faixa
 * só veio da planilha importada, e os acompanhantes cadastrados pelo RSVP
 * têm idade mas nunca faixa. O corte de 12 anos é o mesmo do card
 * "Crianças até 11 anos"; 60 é o do Estatuto da Pessoa Idosa.
 */
export function faixaEtaria(c: { age: number | null; age_range: string | null }): FaixaEtaria | null {
  if (c.age !== null) {
    if (c.age < 12) return "Criança";
    if (c.age < 18) return "Adolescente";
    if (c.age < 60) return "Adulto";
    return "Idoso";
  }
  return (FAIXAS_ETARIAS as readonly string[]).includes(c.age_range ?? "")
    ? (c.age_range as FaixaEtaria)
    : null;
}

export type TipoLembranca =
  | "mulher"
  | "homem"
  | "idoso"
  | "adolescente"
  | "infantil"
  | "adulto_sem_genero"
  | "sem_idade";

export const ROTULOS_LEMBRANCA: Record<TipoLembranca, string> = {
  mulher: "Mulheres",
  homem: "Homens",
  idoso: "Idosos",
  adolescente: "Adolescentes",
  infantil: "Infantil",
  adulto_sem_genero: "Adultos sem gênero na ficha",
  sem_idade: "Sem idade na ficha",
};

/** Que lembrancinha a pessoa recebe. Cada convidado cai em exatamente um tipo. */
export function tipoDeLembranca(c: {
  age: number | null;
  age_range: string | null;
  gender: string | null;
}): TipoLembranca {
  const faixa = faixaEtaria(c);
  if (faixa === "Criança") return "infantil";
  if (faixa === "Adolescente") return "adolescente";
  if (faixa === "Idoso") return "idoso";
  if (faixa === "Adulto") {
    if (c.gender === "feminino") return "mulher";
    if (c.gender === "masculino") return "homem";
    return "adulto_sem_genero";
  }
  return "sem_idade";
}
