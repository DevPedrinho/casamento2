import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Tarefa } from "@/lib/tipos";
import { Checklist } from "./Checklist";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("phase_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <Checklist tarefas={(data ?? []) as Tarefa[]} />;
}
