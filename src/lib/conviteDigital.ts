import type { NomeIcone } from "@/components/Icones";
import type { ConfiguracaoConvite, IdSecaoConvite, SecaoConvite } from "@/lib/tipos";

/**
 * O convite digital (/convite): o que é dele e só dele.
 *
 * Os textos moram no banco (invitation_settings) e são editados no painel,
 * em Convite Digital. O que está aqui é a rede de segurança — o mesmo papel
 * do config.ts para o resto do site: se a linha sumir, o convite abre com
 * os textos de sempre em vez de quebrar. Serve tanto no servidor quanto no
 * navegador (o editor do painel usa as mesmas listas).
 */

export const SECOES_CONVITE: Record<IdSecaoConvite, { rotulo: string; descricao: string }> = {
  apresentacao: { rotulo: "Apresentação", descricao: "O convite propriamente dito, com versículo opcional." },
  mensagem: { rotulo: "Mensagem aos convidados", descricao: "Um recado de vocês para quem recebeu." },
  grande_dia: { rotulo: "O Grande Dia", descricao: "Data, cerimônia e recepção, com a localização." },
  contagem: { rotulo: "Contagem regressiva", descricao: "Dias, horas, minutos e segundos." },
  traje: { rotulo: "Traje", descricao: "Três frases sobre o que vestir." },
  manual: { rotulo: "Manual do Convidado", descricao: "As orientações que vocês cadastrarem." },
  confirmacao: { rotulo: "Confirmação de presença", descricao: "O botão que leva ao RSVP." },
  explorar: { rotulo: "Explorar o site", descricao: "Atalhos para as outras páginas." },
  final: { rotulo: "Mensagem final", descricao: "A despedida, com a assinatura de vocês." },
};

export const ORDEM_PADRAO: IdSecaoConvite[] = [
  "apresentacao",
  "mensagem",
  "grande_dia",
  "contagem",
  "traje",
  "manual",
  "confirmacao",
  "explorar",
  "final",
];

/** As frases do convite, por chave. Ver a migração convite_digital. */
export const TEXTOS_PADRAO = {
  capa_frase: "Preparamos este convite especialmente para você.",
  capa_botao: "Toque para abrir",
  apresentacao_texto:
    "Com a bênção de Deus e de nossas famílias,\nconvidamos você para celebrar conosco o início de uma nova etapa da nossa história.",
  versiculo_texto: "",
  versiculo_referencia: "",
  mensagem_titulo: "Para você",
  mensagem_texto:
    "Cada pessoa que convidamos faz parte da nossa história de algum jeito. Ter você com a gente vai deixar esse dia ainda mais bonito.",
  grande_dia_titulo: "O Grande Dia",
  contagem_titulo: "Falta pouco para o nosso grande dia",
  traje_titulo: "Traje",
  /** Vazio = o traje de Configurações → Data e traje. */
  traje_1: "",
  traje_2: "Pedimos apenas que o branco e seus tons muito claros sejam reservados à noiva. 🤍",
  traje_3: "Venha confortável — a festa é longa!",
  manual_titulo: "Manual do Convidado",
  manual_intro: "Alguns detalhes para que você aproveite cada momento desse dia com a gente.",
  confirmacao_titulo: "Confirme sua presença",
  confirmacao_texto: "Sua resposta nos ajuda a preparar cada detalhe com carinho.",
  confirmacao_botao: "Confirmar presença",
  explorar_titulo: "Continue com a gente",
  explorar_texto:
    "No site você encontra a nossa história, a lista de presentes e o mural para compartilhar fotos.",
  final_texto: "Mal podemos esperar para viver esse dia ao seu lado.",
  final_assinatura: "Com carinho,",
};

export type ChaveTextoConvite = keyof typeof TEXTOS_PADRAO;
export type TextosConvite = Record<ChaveTextoConvite, string>;

/** Os desenhos da igreja que vêm no projeto. Uma imagem enviada no painel manda. */
export const IMAGENS_PADRAO = {
  logo: "/img/convite/logo-convite.webp",
  capa: "/img/convite/igreja-fachada.webp",
  cerimonia: "/img/convite/igreja-aquarela.webp",
  final: "/img/convite/igreja-interior.webp",
};

export const CONFIG_PADRAO: ConfiguracaoConvite = {
  id: true,
  music_enabled: true,
  music_use_story: true,
  music_file_path: null,
  music_title: null,
  music_volume: 0.5,
  music_loop: true,
  cover_image_path: null,
  cover_logo_path: null,
  ceremony_image_path: null,
  closing_image_path: null,
  verse_visible: false,
  texts: { ...TEXTOS_PADRAO },
  sections: ORDEM_PADRAO.map((id) => ({ id, visivel: true })),
};

/** O banco manda; o que faltar vem do padrão. Um campo apagado de propósito fica vazio. */
export function textosDoConvite(config: ConfiguracaoConvite): TextosConvite {
  const textos = { ...TEXTOS_PADRAO };
  for (const chave of Object.keys(TEXTOS_PADRAO) as ChaveTextoConvite[]) {
    const valor = config.texts?.[chave];
    if (typeof valor === "string") textos[chave] = valor;
  }
  return textos;
}

/**
 * A ordem salva, limpa: ids desconhecidos e repetidos saem, e seção nova
 * que ainda não estava na lista entra no fim, visível — assim um convite
 * salvo antes de uma seção existir não a perde.
 */
export function normalizarSecoes(bruto: unknown): SecaoConvite[] {
  const lista = Array.isArray(bruto) ? bruto : [];
  const vistas = new Set<IdSecaoConvite>();
  const resultado: SecaoConvite[] = [];

  for (const item of lista) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id !== "string" || !(id in SECOES_CONVITE)) continue;
    const secao = id as IdSecaoConvite;
    if (vistas.has(secao)) continue;
    vistas.add(secao);
    resultado.push({ id: secao, visivel: (item as { visivel?: unknown }).visivel !== false });
  }
  for (const id of ORDEM_PADRAO) {
    if (!vistas.has(id)) resultado.push({ id, visivel: true });
  }
  return resultado;
}

export function montarConfigConvite(linha: Partial<ConfiguracaoConvite> | null): ConfiguracaoConvite {
  if (!linha) return CONFIG_PADRAO;
  return {
    ...CONFIG_PADRAO,
    ...linha,
    music_volume: Number(linha.music_volume ?? CONFIG_PADRAO.music_volume),
    texts: linha.texts ?? {},
    sections: normalizarSecoes(linha.sections),
  };
}

/** Ícones que o Manual oferece, na ordem da grade do painel. */
export const ICONES_MANUAL: { nome: NomeIcone; rotulo: string }[] = [
  { nome: "coracao", rotulo: "Coração" },
  { nome: "traje", rotulo: "Traje" },
  { nome: "relogio", rotulo: "Horário" },
  { nome: "igreja", rotulo: "Cerimônia" },
  { nome: "taca", rotulo: "Recepção" },
  { nome: "aliancas", rotulo: "Alianças" },
  { nome: "camera", rotulo: "Fotografias" },
  { nome: "celular", rotulo: "Celulares" },
  { nome: "crianca", rotulo: "Crianças" },
  { nome: "carro", rotulo: "Transporte" },
  { nome: "local", rotulo: "Localização" },
  { nome: "presentes", rotulo: "Presentes" },
  { nome: "envelope", rotulo: "Confirmação" },
  { nome: "musica", rotulo: "Música" },
  { nome: "estrela", rotulo: "Destaque" },
  { nome: "info", rotulo: "Informação" },
];

export function iconeDoManual(nome: string): NomeIcone {
  return ICONES_MANUAL.some((i) => i.nome === nome) ? (nome as NomeIcone) : "coracao";
}
