import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Personagens, type Personagem } from "./Personagens";

export const dynamic = "force-dynamic";

export default async function PersonagensPage() {
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("guests")
    .select("id, full_name, side, ceremony_role, is_featured, featured_order, user_id")
    .order("full_name");

  return <Personagens convidados={(data ?? []) as Personagem[]} />;
}
