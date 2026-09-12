import { CASAMENTO } from "@/lib/config";
import type { ConfiguracoesSite } from "@/lib/tipos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * O conteúdo do site vindo do painel.
 *
 * O arquivo config.ts continua sendo a rede de segurança: se o banco
 * estiver fora do ar ou a linha ainda não existir, o site abre com os
 * mesmos textos de sempre em vez de quebrar.
 */

export type Casamento = {
  noiva: string;
  noivo: string;
  lema: string;
  frase: string;
  dataISO: string;
  dataExtenso: string;
  dataCurta: string;
  horaCerimonia: string;
  horaRecepcao: string;
  trajes: string;
  local: { nome: string; endereco: string; cidade: string; mapsUrl: string };
  contatoEmail: string;
  whatsapp: string;
  instagram: string;
  hashtag: string;
  prazoRsvp: string | null;
  limitePadrao: number;
  regrasAcompanhante: string;
  imagens: {
    logo: string | null;
    monograma: string | null;
    capa: string | null;
    compartilhamento: string | null;
  };
  paleta: {
    oliva: string | null;
    lavanda: string | null;
    terra: string | null;
    creme: string | null;
  };
  textos: Record<string, string>;
};

const FUSO = "America/Sao_Paulo";

function porExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FUSO,
  });
}

function curta(iso: string): string {
  const d = new Date(iso);
  const partes = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSO,
  })
    .format(d)
    .split("/");
  return partes.join(" • ");
}

/** Monta o objeto do site a partir da linha do banco. */
export function montarCasamento(config: ConfiguracoesSite | null): Casamento {
  if (!config) {
    return {
      ...CASAMENTO,
      local: { ...CASAMENTO.local },
      whatsapp: "",
      instagram: "",
      hashtag: "",
      prazoRsvp: null,
      limitePadrao: 2,
      regrasAcompanhante:
        "Cada convite vale para um número certo de pessoas. Confirme apenas quem está no seu convite.",
      imagens: { logo: null, monograma: null, capa: null, compartilhamento: null },
      paleta: { oliva: null, lavanda: null, terra: null, creme: null },
      textos: {},
    };
  }

  return {
    noiva: config.bride_name,
    noivo: config.groom_name,
    lema: config.motto,
    frase: config.tagline,
    dataISO: config.wedding_at,
    dataExtenso: porExtenso(config.wedding_at),
    dataCurta: curta(config.wedding_at),
    horaCerimonia: config.ceremony_time ?? CASAMENTO.horaCerimonia,
    horaRecepcao: config.reception_time ?? CASAMENTO.horaRecepcao,
    trajes: config.dress_code ?? CASAMENTO.trajes,
    local: {
      nome: config.venue_name ?? CASAMENTO.local.nome,
      endereco: config.venue_address ?? CASAMENTO.local.endereco,
      cidade: config.venue_city ?? CASAMENTO.local.cidade,
      mapsUrl: config.venue_maps_url ?? "",
    },
    contatoEmail: config.contact_email ?? "",
    whatsapp: config.contact_whatsapp ?? "",
    instagram: config.instagram_url ?? "",
    hashtag: config.hashtag ?? "",
    prazoRsvp: config.rsvp_deadline,
    limitePadrao: config.default_invite_limit,
    regrasAcompanhante: config.companion_rules ?? "",
    imagens: {
      logo: config.logo_path,
      monograma: config.monogram_path,
      capa: config.hero_image_path,
      compartilhamento: config.og_image_path,
    },
    paleta: {
      oliva: config.color_olive,
      lavanda: config.color_lavender,
      terra: config.color_earth,
      creme: config.color_cream,
    },
    textos: config.texts ?? {},
  };
}

/** Lê as configurações no servidor. Nunca lança: cai no config.ts. */
export async function carregarCasamento(): Promise<Casamento> {
  try {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.from("site_settings").select("*").maybeSingle();
    return montarCasamento((data as ConfiguracoesSite | null) ?? null);
  } catch {
    return montarCasamento(null);
  }
}
