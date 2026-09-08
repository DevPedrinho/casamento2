import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LocalEvento } from "@/lib/tipos";
import { Locais } from "./Locais";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("event_venues").select("*").order("sort_order");
  return <Locais locais={(data ?? []) as LocalEvento[]} />;
}
