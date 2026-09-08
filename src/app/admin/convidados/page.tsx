import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ConvidadoCompleto, GrupoConvidados } from "@/lib/tipos";
import { GerenciadorConvidados } from "./GerenciadorConvidados";

export const dynamic = "force-dynamic";

const SELECT = `
  id, user_id, full_name, phone, whatsapp, email, is_admin, group_id, side,
  relationship, ceremony_role, attends, gender, age, age_range, favor_type,
  invite_status, confirmed_at, companions_planned, table_number, dietary_notes,
  notes, last_contact_at, next_action, next_action_at, extra, created_at,
  grupo:guest_groups!guests_group_id_fkey ( id, name, side, notes )
`;

export default async function ConvidadosPage() {
  const supabase = await criarClienteServidor();

  const [{ data: convidados }, { data: grupos }] = await Promise.all([
    supabase.from("guests").select(SELECT).order("full_name", { ascending: true }),
    supabase.from("guest_groups").select("*").order("name", { ascending: true }),
  ]);

  // O embed do PostgREST vem ora objeto, ora array de um item.
  const lista: ConvidadoCompleto[] = (convidados ?? []).map((c) => {
    const bruto = c as unknown as Omit<ConvidadoCompleto, "grupo"> & {
      grupo: GrupoConvidados | GrupoConvidados[] | null;
    };
    return {
      ...bruto,
      grupo: Array.isArray(bruto.grupo) ? (bruto.grupo[0] ?? null) : bruto.grupo,
    };
  });

  return (
    <GerenciadorConvidados
      convidados={lista}
      grupos={(grupos ?? []) as GrupoConvidados[]}
    />
  );
}
