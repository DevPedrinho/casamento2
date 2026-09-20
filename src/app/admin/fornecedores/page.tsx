import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Despesa, Fornecedor } from "@/lib/tipos";
import { Fornecedores } from "./Fornecedores";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const etapa = typeof params.etapa === "string" ? params.etapa : undefined;

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
      etapaInicial={etapa}
    />
  );
}
