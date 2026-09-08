import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Despesa, Fornecedor } from "@/lib/tipos";
import { Financeiro } from "./Financeiro";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const supabase = await criarClienteServidor();

  const [{ data: despesas }, { data: fornecedores }, { data: config }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, payments(*)")
      .order("category", { ascending: true })
      .order("description", { ascending: true }),
    supabase.from("vendors").select("*").order("name", { ascending: true }),
    supabase.from("wedding_settings").select("budget_total_cents").eq("id", true).maybeSingle(),
  ]);

  return (
    <Financeiro
      despesas={(despesas ?? []) as Despesa[]}
      fornecedores={(fornecedores ?? []) as Fornecedor[]}
      orcamentoTotal={config?.budget_total_cents ?? 0}
    />
  );
}
