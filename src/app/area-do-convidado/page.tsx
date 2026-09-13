import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import { meuConvidado } from "@/lib/convidado";
import type {
  Acompanhante,
  LocalEvento,
  Mesa,
  MomentoDoDia,
  Rsvp,
} from "@/lib/tipos";
import { Secao } from "@/components/Secao";
import { ResgatarCodigo } from "./ResgatarCodigo";
import { MinhaArea, type MinhaFicha } from "./MinhaArea";

export const metadata: Metadata = { title: "Minha área" };
export const dynamic = "force-dynamic";

export default async function AreaDoConvidado() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?proximo=/area-do-convidado");

  const eu = await meuConvidado();

  // Logado, mas a conta ainda não está ligada a ninguém da lista: em vez
  // de devolver para o login (que daria a volta e voltaria para cá), pede
  // o código do convite.
  if (!eu) {
    return (
      <Secao sobretitulo="Área do convidado" titulo="Quase lá">
        <ResgatarCodigo />
      </Secao>
    );
  }

  const [{ data: ficha }, { data: rsvp }, { data: acompanhantes }, { data: momentos }, { data: locais }] =
    await Promise.all([
      supabase
        .from("guests")
        .select(
          `full_name, phone, whatsapp, email, age, gender, attends, relationship,
           relationship_kind, ceremony_role, is_featured, dietary_notes, is_admin, table_id,
           mesa:wedding_tables!guests_table_id_fkey ( id, name, seats, notes, sort_order )`,
        )
        .eq("id", eu.id)
        .maybeSingle(),
      supabase.from("rsvps").select("*").eq("guest_id", eu.id).maybeSingle(),
      supabase.from("rsvp_companions").select("*").eq("guest_id", eu.id).order("created_at"),
      supabase
        .from("day_schedule")
        .select("*")
        .eq("audience", "convidados")
        .order("starts_at")
        .order("sort_order"),
      supabase.from("event_venues").select("*").order("sort_order"),
    ]);

  const casamento = await carregarCasamento();

  const bruto = ficha as (Omit<MinhaFicha, "mesa"> & { mesa: Mesa | Mesa[] | null }) | null;
  const minhaFicha: MinhaFicha | null = bruto
    ? { ...bruto, mesa: Array.isArray(bruto.mesa) ? (bruto.mesa[0] ?? null) : bruto.mesa }
    : null;

  return (
    <MinhaArea
      guestId={eu.id}
      ficha={minhaFicha}
      rsvp={(rsvp as Rsvp | null) ?? null}
      acompanhantes={(acompanhantes ?? []) as Acompanhante[]}
      momentos={(momentos ?? []) as MomentoDoDia[]}
      locais={(locais ?? []) as LocalEvento[]}
      dataExtenso={casamento.dataExtenso}
      trajes={casamento.trajes}
    />
  );
}
