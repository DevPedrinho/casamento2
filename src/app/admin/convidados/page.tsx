import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LinhaConvidado } from "@/lib/tipos";
import { PainelConvidados } from "./PainelConvidados";

export const dynamic = "force-dynamic";

export default async function ConvidadosPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("guests")
    .select(
      "id, full_name, phone, created_at, rsvps(status, companions, companion_names, dietary_notes, message)",
    )
    .order("created_at", { ascending: false });

  // O embed do PostgREST vem como array; achatamos para simplificar a lista.
  const linhas: LinhaConvidado[] = (data ?? []).map((c) => {
    const bruto = c as unknown as Omit<LinhaConvidado, "rsvps"> & {
      rsvps: LinhaConvidado["rsvps"] | LinhaConvidado["rsvps"][];
    };
    return {
      ...bruto,
      rsvps: Array.isArray(bruto.rsvps) ? (bruto.rsvps[0] ?? null) : bruto.rsvps,
    };
  });

  return <PainelConvidados convidados={linhas} />;
}
