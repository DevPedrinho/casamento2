import { criarClienteServidor } from "@/lib/supabase/servidor";
import { meuConvidado } from "@/lib/convidado";
import { carregarFeed, carregarStories } from "@/lib/mural";
import type { Denuncia } from "@/lib/tipos";
import { ModeracaoMural } from "./ModeracaoMural";

export const dynamic = "force-dynamic";

export default async function ModeracaoPage() {
  const supabase = await criarClienteServidor();
  const eu = await meuConvidado();

  // O layout de /admin já barrou quem não é noivo(a); isto é só para o tipo.
  if (!eu) return null;

  const [feed, grupos, denuncias] = await Promise.all([
    carregarFeed(eu.id, 200),
    carregarStories(eu.id),
    supabase
      .from("post_reports")
      .select("*, guests!post_reports_reporter_id_fkey ( id, full_name )")
      .order("created_at", { ascending: false }),
  ]);

  const listaDenuncias: Denuncia[] = (denuncias.data ?? []).map((d) => {
    const bruto = d as unknown as Omit<Denuncia, "denunciante"> & {
      guests: Denuncia["denunciante"] | Denuncia["denunciante"][];
    };
    return {
      ...bruto,
      denunciante: Array.isArray(bruto.guests) ? (bruto.guests[0] ?? null) : bruto.guests,
    };
  });

  return (
    <ModeracaoMural
      publicacoes={feed}
      stories={grupos.flatMap((g) => g.stories)}
      denuncias={listaDenuncias}
    />
  );
}
