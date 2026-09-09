import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { CapituloTimeline, FotoTimeline } from "@/lib/tipos";
import { urlDoSite } from "@/components/UploadImagem";
import { EditorTimeline } from "./EditorTimeline";

export const dynamic = "force-dynamic";

export default async function TimelineAdminPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("timeline_chapters")
    .select("*, fotos:timeline_photos(*)")
    .order("sort_order");

  const capitulos: CapituloTimeline[] = (data ?? []).map((c) => {
    const bruto = c as unknown as CapituloTimeline & { fotos: FotoTimeline[] | null };
    return {
      ...bruto,
      fotos: (bruto.fotos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((f) => ({ ...f, url: urlDoSite(f.image_path) ?? "" })),
    };
  });

  return <EditorTimeline capitulos={capitulos} />;
}
