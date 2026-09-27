import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import { montarConfigConvite } from "@/lib/conviteDigital";
import { musicaDaHistoria } from "@/lib/musica";
import type { ConfiguracaoConvite, ItemManual, LocalEvento, MusicaDoSite } from "@/lib/tipos";
import { EditorConvite } from "./EditorConvite";

export const dynamic = "force-dynamic";

export default async function ConviteDigitalPage() {
  const supabase = await criarClienteServidor();
  const [casamento, { data: linha }, { data: itens }, { data: locais }, { data: historia }] =
    await Promise.all([
      carregarCasamento(),
      supabase.from("invitation_settings").select("*").maybeSingle(),
      // O painel vê também as orientações ocultas.
      supabase.from("invitation_guide_items").select("*").order("sort_order"),
      supabase.from("event_venues").select("*").order("sort_order"),
      supabase.from("site_music").select("*").maybeSingle(),
    ]);

  if (!linha) {
    return (
      <p className="titulo-serif py-10 text-center text-xl text-terra italic">
        As configurações do convite ainda não foram criadas no banco.
      </p>
    );
  }

  return (
    <EditorConvite
      config={montarConfigConvite(linha as Partial<ConfiguracaoConvite>)}
      itens={(itens ?? []) as ItemManual[]}
      locais={(locais ?? []) as LocalEvento[]}
      trajeAtual={casamento.trajes}
      musicaHistoria={musicaDaHistoria(historia as MusicaDoSite | null)}
    />
  );
}
