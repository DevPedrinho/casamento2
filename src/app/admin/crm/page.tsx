import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ConvidadoCompleto, GrupoConvidados } from "@/lib/tipos";
import { CrmConvidados } from "./CrmConvidados";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const supabase = await criarClienteServidor();

  // Mesmíssima tabela do gerenciador: o CRM é outra visão, não outra base.
  const { data } = await supabase
    .from("guests")
    .select(
      `id, user_id, full_name, phone, whatsapp, invite_status, companions_planned,
       last_contact_at, next_action, next_action_at, side, ceremony_role, group_id,
       access_code, code_sent_at,
       grupo:guest_groups!guests_group_id_fkey ( id, name, side, notes )`,
    )
    .order("full_name", { ascending: true });

  const lista = (data ?? []).map((c) => {
    const bruto = c as unknown as ConvidadoCompleto & {
      grupo: GrupoConvidados | GrupoConvidados[] | null;
    };
    return {
      ...bruto,
      grupo: Array.isArray(bruto.grupo) ? (bruto.grupo[0] ?? null) : bruto.grupo,
    };
  }) as ConvidadoCompleto[];

  return <CrmConvidados convidados={lista} />;
}
