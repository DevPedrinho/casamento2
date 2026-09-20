import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ConvidadoCompleto, GrupoConvidados, Mesa } from "@/lib/tipos";
import { GerenciadorConvidados } from "./GerenciadorConvidados";

export const dynamic = "force-dynamic";

const SELECT = `
  id, user_id, full_name, phone, whatsapp, email, is_admin, group_id, side,
  relationship, relationship_kind, ceremony_role, attends, gender, age, age_range,
  favor_type, invite_status, confirmed_at, companions_planned, table_id,
  dietary_notes, notes, last_contact_at, next_action, next_action_at,
  access_code, code_sent_at, is_featured, featured_order, avatar_path, extra, created_at,
  grupo:guest_groups!guests_group_id_fkey ( id, name, side, notes ),
  mesa:wedding_tables!guests_table_id_fkey ( id, name, seats, notes, sort_order )
`;

/** Filtros que chegam pela URL, quando o clique veio de um gráfico. */
export type FiltroInicial = {
  vinculo?: string;
  faixa?: string;
  presenca?: string;
  genero?: string;
  lado?: string;
};

export default async function ConvidadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const texto = (v: string | string[] | undefined) =>
    typeof v === "string" && v.trim() ? v : undefined;

  const [{ data: convidados }, { data: grupos }, { data: mesas }, { data: acompanhantes }] =
    await Promise.all([
      supabase.from("guests").select(SELECT).order("full_name", { ascending: true }),
      supabase.from("guest_groups").select("*").order("name", { ascending: true }),
      supabase.from("wedding_tables").select("*").order("sort_order").order("name"),
      supabase.from("rsvp_companions").select("*").order("created_at"),
    ]);

  // O embed do PostgREST vem ora objeto, ora array de um item.
  const um = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const lista: ConvidadoCompleto[] = (convidados ?? []).map((c) => {
    const bruto = c as unknown as Omit<ConvidadoCompleto, "grupo" | "mesa"> & {
      grupo: GrupoConvidados | GrupoConvidados[] | null;
      mesa: Mesa | Mesa[] | null;
    };
    return { ...bruto, grupo: um(bruto.grupo), mesa: um(bruto.mesa) };
  });

  return (
    <GerenciadorConvidados
      convidados={lista}
      grupos={(grupos ?? []) as GrupoConvidados[]}
      mesas={(mesas ?? []) as Mesa[]}
      acompanhantes={acompanhantes ?? []}
      inicial={{
        vinculo: texto(params.vinculo),
        faixa: texto(params.faixa),
        presenca: texto(params.presenca),
        genero: texto(params.genero),
        lado: texto(params.lado),
      }}
    />
  );
}
