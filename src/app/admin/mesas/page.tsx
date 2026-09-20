import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { GrupoConvidados, Mesa } from "@/lib/tipos";
import { MapaDeMesas, type ConvidadoDaMesa } from "./MapaDeMesas";

export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const supabase = await criarClienteServidor();

  const [{ data: mesas }, { data: convidados }, { data: grupos }] =
    await Promise.all([
      supabase.from("wedding_tables").select("*").order("sort_order").order("name"),
      supabase
        .from("guests")
        .select("id, full_name, group_id, table_id, attends, invite_status, age, is_featured, ceremony_role, invited_by")
        .order("full_name"),
      supabase.from("guest_groups").select("*").order("name"),
    ]);

  return (
    <MapaDeMesas
      mesas={(mesas ?? []) as Mesa[]}
      convidados={(convidados ?? []) as ConvidadoDaMesa[]}
      grupos={(grupos ?? []) as GrupoConvidados[]}
    />
  );
}
