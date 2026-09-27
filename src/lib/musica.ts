import { CASAMENTO } from "@/lib/config";
import { urlDoSite } from "@/lib/storage";
import type { ConfiguracaoConvite, MusicaDoSite } from "@/lib/tipos";

export type FaixaDoSite = { arquivo: string; titulo: string; artista?: string };

/**
 * A música de Nossa História. A enviada pelo painel manda; sem ela, toca a
 * provisória do config — e aí o nome mostrado é o dela, não o que está no
 * banco esperando o arquivo definitivo.
 */
export function musicaDaHistoria(linha: MusicaDoSite | null): FaixaDoSite {
  const enviada = urlDoSite(linha?.file_path ?? null);
  if (enviada) {
    return {
      arquivo: enviada,
      titulo: linha?.title || "Nossa música",
      artista: linha?.artist ?? undefined,
    };
  }
  return {
    arquivo: CASAMENTO.musica.arquivo,
    titulo: CASAMENTO.musica.titulo || "Nossa música",
    artista: CASAMENTO.musica.artista,
  };
}

/**
 * A música do convite: a de Nossa História (o padrão) ou uma faixa própria
 * enviada em Convite Digital → Música. null = convite em silêncio.
 */
export function musicaDoConvite(
  config: ConfiguracaoConvite,
  historia: MusicaDoSite | null,
): (FaixaDoSite & { volume: number; loop: boolean }) | null {
  if (!config.music_enabled) return null;

  const propria = config.music_use_story ? null : urlDoSite(config.music_file_path);
  const base = propria ? { arquivo: propria, titulo: "Nossa música" } : musicaDaHistoria(historia);
  if (!base.arquivo) return null;

  const nome = config.music_title?.trim();
  return {
    ...base,
    titulo: nome || base.titulo,
    // O nome trocado no painel vale sozinho: o artista era da outra faixa.
    artista: nome || propria ? undefined : base.artista,
    volume: Math.min(1, Math.max(0, config.music_volume)),
    loop: config.music_loop,
  };
}
