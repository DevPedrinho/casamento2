import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { SubTarefa, Tarefa } from "@/lib/tipos";
import { Checklist } from "./Checklist";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tasks")
    .select("*, itens:task_items(*)")
    .order("phase_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const tarefas = (data ?? []).map((t) => {
    const bruto = t as unknown as Tarefa & { itens: SubTarefa[] | null };
    return { ...bruto, itens: (bruto.itens ?? []).sort((a, b) => a.sort_order - b.sort_order) };
  });

  return <Checklist tarefas={tarefas} />;
}
