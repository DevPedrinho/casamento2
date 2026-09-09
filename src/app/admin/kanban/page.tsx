import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { CardKanban, ColunaKanban, Fornecedor, ItemCard } from "@/lib/tipos";
import { Quadro } from "./Quadro";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const supabase = await criarClienteServidor();

  const [{ data: colunas }, { data: cards }, { data: fornecedores }] = await Promise.all([
    supabase.from("kanban_columns").select("*").order("sort_order"),
    supabase
      .from("kanban_cards")
      .select("*, itens:kanban_card_items(*)")
      .order("sort_order")
      .order("created_at"),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  const lista = (cards ?? []).map((c) => {
    const bruto = c as unknown as CardKanban & { itens: ItemCard[] | null };
    return {
      ...bruto,
      itens: (bruto.itens ?? []).sort((a, b) => a.sort_order - b.sort_order),
    };
  });

  return (
    <Quadro
      colunas={(colunas ?? []) as ColunaKanban[]}
      cards={lista}
      fornecedores={(fornecedores ?? []) as Pick<Fornecedor, "id" | "name">[]}
    />
  );
}
