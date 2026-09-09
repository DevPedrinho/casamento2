import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { GrupoConvidados } from "@/lib/tipos";
import { Importador } from "./Importador";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const supabase = await criarClienteServidor();

  const [{ data: existentes }, { data: grupos }] = await Promise.all([
    supabase.from("guests").select("id, full_name, import_key"),
    supabase.from("guest_groups").select("*").order("name"),
  ]);

  return (
    <Importador
      existentes={(existentes ?? []) as { id: string; full_name: string; import_key: string | null }[]}
      grupos={(grupos ?? []) as GrupoConvidados[]}
    />
  );
}
