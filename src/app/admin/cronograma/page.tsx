import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Fornecedor, MomentoDoDia } from "@/lib/tipos";
import { Cronograma } from "./Cronograma";

export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  const supabase = await criarClienteServidor();

  const [{ data: momentos }, { data: fornecedores }] = await Promise.all([
    supabase.from("day_schedule").select("*").order("starts_at").order("sort_order"),
    supabase.from("vendors").select("*").order("name"),
  ]);

  return (
    <Cronograma
      momentos={(momentos ?? []) as MomentoDoDia[]}
      fornecedores={(fornecedores ?? []) as Fornecedor[]}
    />
  );
}
