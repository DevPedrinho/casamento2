import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { CapituloTimeline, FotoTimeline, MusicaDoSite } from "@/lib/tipos";
import { urlDoSite } from "@/lib/storage";
import { EditorTimeline } from "./EditorTimeline";
import { EditorMusica } from "./EditorMusica";

export const dynamic = "force-dynamic";

export default async function TimelineAdminPage() {
  const supabase = await criarClienteServidor();
  const [{ data }, { data: musica }] = await Promise.all([
    supabase.from("timeline_chapters").select("*, fotos:timeline_photos(*)").order("sort_order"),
    supabase.from("site_music").select("*").maybeSingle(),
  ]);

  const capitulos: CapituloTimeline[] = (data ?? []).map((c) => {
    const bruto = c as unknown as CapituloTimeline & { fotos: FotoTimeline[] | null };
    return {
      ...bruto,
      fotos: (bruto.fotos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((f) => ({ ...f, url: urlDoSite(f.image_path) ?? "" })),
    };
  });

  const musicaAtual: MusicaDoSite = (musica as MusicaDoSite | null) ?? {
    id: true,
    file_path: null,
    title: null,
    artist: null,
  };

  return (
    <div className="space-y-10">
      <EditorTimeline capitulos={capitulos} />
      <EditorMusica musica={musicaAtual} />
    </div>
  );
}
