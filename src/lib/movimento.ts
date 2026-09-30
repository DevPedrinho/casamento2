/**
 * O movimento dos convidados no site (tabela guest_events), em palavras.
 * Serve ao Dashboard e à ficha do convidado; roda no servidor e no navegador.
 */

export type TipoEvento =
  | "abriu_link"
  | "abriu_convite"
  | "cadastro"
  | "entrou"
  | "confirmou"
  | "recusou"
  | "mudou_resposta"
  | "publicou"
  | "comentou"
  | "presenteou";

export type EventoConvidado = {
  id: string;
  guest_id: string;
  kind: TipoEvento;
  meta: Record<string, unknown>;
  created_at: string;
};

/** Quem mexeu no site há menos disso está "online agora". */
export const JANELA_ONLINE_MS = 3 * 60 * 1000;

export function estaOnline(ultimoAcesso: string | null | undefined, agora = Date.now()): boolean {
  if (!ultimoAcesso) return false;
  return agora - new Date(ultimoAcesso).getTime() < JANELA_ONLINE_MS;
}

const PAGINAS: [string, string][] = [
  ["/nossa-historia", "Nossa História"],
  ["/presentes", "Presentes"],
  ["/mural", "Mural"],
  ["/confirmar", "Confirmação"],
  ["/convite", "Convite"],
  ["/area-do-convidado", "Minha área"],
  ["/personagens", "Personagens"],
  ["/cadastrar", "Cadastro"],
  ["/entrar", "Entrar"],
];

/** "/presentes/123" vira "Presentes"; "/" vira "Início". */
export function nomeDaPagina(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (caminho === "/") return "Início";
  return PAGINAS.find(([prefixo]) => caminho.startsWith(prefixo))?.[1] ?? null;
}

/** Ícone (do conjunto de Icones.tsx) e cor de cada tipo. */
export const VISUAL_EVENTO: Record<TipoEvento, { icone: "envelope" | "estrela" | "config" | "timeline" | "coracao" | "fechar" | "tarefas" | "mural" | "presentes"; tom: string }> = {
  abriu_link: { icone: "envelope", tom: "text-lavanda" },
  abriu_convite: { icone: "envelope", tom: "text-lavanda" },
  cadastro: { icone: "estrela", tom: "text-oliva" },
  entrou: { icone: "timeline", tom: "text-terra" },
  confirmou: { icone: "coracao", tom: "text-oliva" },
  recusou: { icone: "fechar", tom: "text-red-800" },
  mudou_resposta: { icone: "tarefas", tom: "text-terra" },
  publicou: { icone: "mural", tom: "text-lavanda" },
  comentou: { icone: "mural", tom: "text-terra" },
  presenteou: { icone: "presentes", tom: "text-oliva" },
};

/** O que a pessoa fez, sem o nome: "abriu o convite", "confirmou presença com 2 acompanhantes". */
export function descreverEvento(e: Pick<EventoConvidado, "kind" | "meta">): string {
  const m = e.meta ?? {};
  const acompanhantes = Number(m.acompanhantes ?? 0);
  const comQuem =
    acompanhantes > 0 ? ` com ${acompanhantes} acompanhante${acompanhantes === 1 ? "" : "s"}` : "";

  switch (e.kind) {
    case "abriu_link":
      return "abriu o link do convite";
    case "abriu_convite":
      return "abriu o convite";
    case "cadastro":
      return "criou o cadastro no site";
    case "entrou": {
      const pagina = nomeDaPagina(typeof m.pagina === "string" ? m.pagina : null);
      return pagina ? `entrou no site · ${pagina}` : "entrou no site";
    }
    case "confirmou":
      return `confirmou presença${comQuem}`;
    case "recusou":
      return "avisou que não vai";
    case "mudou_resposta":
      return m.antes_acompanhantes !== undefined
        ? `mudou os acompanhantes para ${acompanhantes}`
        : "respondeu “talvez”";
    case "publicou":
      return m.tipo === "story" ? "postou um story no mural" : "publicou no mural";
    case "comentou":
      return "comentou no mural";
    case "presenteou":
      return typeof m.presente === "string" && m.presente
        ? `clicou em presentear · ${m.presente}`
        : "clicou em presentear";
  }
}
