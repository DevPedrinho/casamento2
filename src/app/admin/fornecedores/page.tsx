import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Fornecedor } from "@/lib/tipos";
import { Fornecedores } from "./Fornecedores";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return <Fornecedores fornecedores={(data ?? []) as Fornecedor[]} />;
}
