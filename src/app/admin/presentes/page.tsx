import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Presente } from "@/lib/tipos";
import { PainelPresentes } from "./PainelPresentes";

export const dynamic = "force-dynamic";

export default async function PresentesAdminPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("gifts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <PainelPresentes presentes={(data ?? []) as Presente[]} />;
}
