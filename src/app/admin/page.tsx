import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Presente } from "@/lib/tipos";
import { Secao } from "@/components/Secao";
import { PainelAdmin } from "./PainelAdmin";

export const metadata: Metadata = { title: "Painel dos noivos" };
export const dynamic = "force-dynamic";

/** Linha da lista de convidados, já com o RSVP embutido. */
export type LinhaConvidado = {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  rsvps: {
    status: "confirmado" | "nao_vou" | "talvez";
    companions: number;
    companion_names: string | null;
    dietary_notes: string | null;
    message: string | null;
  } | null;
};

export default async function Admin() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?proximo=/admin");

  const { data: perfil } = await supabase
    .from("guests")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Quem não é noivo(a) vai para a área normal de convidado.
  if (!perfil?.is_admin) redirect("/area-do-convidado");

  const [{ data: presentes }, { data: convidados }] = await Promise.all([
    supabase
      .from("gifts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("guests")
      .select(
        "id, full_name, phone, created_at, rsvps(status, companions, companion_names, dietary_notes, message)",
      )
      .order("created_at", { ascending: false }),
  ]);

  // O embed vem como array; achatamos para simplificar a tabela.
  const linhas: LinhaConvidado[] = (convidados ?? []).map((c) => {
    const bruto = c as unknown as Omit<LinhaConvidado, "rsvps"> & {
      rsvps: LinhaConvidado["rsvps"] | LinhaConvidado["rsvps"][];
    };
    return {
      ...bruto,
      rsvps: Array.isArray(bruto.rsvps) ? (bruto.rsvps[0] ?? null) : bruto.rsvps,
    };
  });

  return (
    <Secao sobretitulo="Só vocês dois veem isso" titulo="Painel dos noivos">
      <PainelAdmin presentes={(presentes ?? []) as Presente[]} convidados={linhas} />
    </Secao>
  );
}
