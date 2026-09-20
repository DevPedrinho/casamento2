import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Despesa, Fornecedor } from "@/lib/tipos";
import { Fornecedores } from "./Fornecedores";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const supabase = await criarClienteServidor();

  // As despesas vêm junto porque é delas que sai o quanto cada fornecedor já
  // recebeu. O número não é digitado na ficha: é a soma dos pagamentos.
  const [{ data: fornecedores }, { data: despesas }] = await Promise.all([
    supabase
      .from("vendors")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("expenses").select("*, payments(*)").order("description"),
  ]);

  return (
    <Fornecedores
      fornecedores={(fornecedores ?? []) as Fornecedor[]}
      despesas={(despesas ?? []) as Despesa[]}
    />
  );
}
