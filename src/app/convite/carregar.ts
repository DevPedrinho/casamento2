import { carregarCasamento } from "@/lib/configuracoes";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/storage";
import { musicaDoConvite } from "@/lib/musica";
import { IMAGENS_PADRAO, montarConfigConvite, textosDoConvite } from "@/lib/conviteDigital";
import type {
  ConfiguracaoConvite,
  ItemManual,
  LocalEvento,
  MusicaDoSite,
} from "@/lib/tipos";
import type { PropsConvite } from "./Convite";

/**
 * Tudo o que o convite mostra, lido no servidor.
 *
 * O convite não guarda cópia do que já tem casa: nomes, data, traje e
 * monograma vêm de Configurações; cerimônia e recepção, de Local do evento;
 * a música, de Nossa História (a menos que o painel diga outra).
 */
export async function montarConvite({
  convidado,
  confirmarHref,
}: {
  convidado: string | null;
  confirmarHref: string;
}): Promise<PropsConvite> {
  const supabase = await criarClienteServidor();
  const [casamento, { data: linha }, { data: itens }, { data: locais }, { data: historia }] =
    await Promise.all([
      carregarCasamento(),
      supabase.from("invitation_settings").select("*").maybeSingle(),
      supabase.from("invitation_guide_items").select("*").eq("visible", true).order("sort_order"),
      supabase.from("event_venues").select("*").order("sort_order"),
      supabase.from("site_music").select("*").maybeSingle(),
    ]);

  const config = montarConfigConvite(linha as Partial<ConfiguracaoConvite> | null);

  return {
    noiva: casamento.noiva,
    noivo: casamento.noivo,
    dataISO: casamento.dataISO,
    dataCurta: casamento.dataCurta,
    dataExtenso: casamento.dataExtenso,
    trajePadrao: casamento.trajes,
    prazoRsvp: casamento.prazoRsvp,
    monograma: urlDoSite(casamento.imagens.monograma) ?? "/img/monograma-dp.png",
    convidado,
    confirmarHref,
    textos: textosDoConvite(config),
    versiculoVisivel: config.verse_visible,
    secoes: config.sections.filter((s) => s.visivel).map((s) => s.id),
    itens: (itens ?? []) as ItemManual[],
    locais: (locais ?? []) as LocalEvento[],
    imagens: {
      logo: urlDoSite(config.cover_logo_path) ?? IMAGENS_PADRAO.logo,
      capa: urlDoSite(config.cover_image_path) ?? IMAGENS_PADRAO.capa,
      cerimonia: urlDoSite(config.ceremony_image_path) ?? IMAGENS_PADRAO.cerimonia,
      final: urlDoSite(config.closing_image_path) ?? IMAGENS_PADRAO.final,
    },
    musica: musicaDoConvite(config, historia as MusicaDoSite | null),
  };
}
