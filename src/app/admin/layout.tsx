import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Sidebar, type Pendencias } from "./Sidebar";

export const metadata: Metadata = { title: "Painel dos noivos" };

/**
 * Porteiro de todo o /admin: quem não é noivo(a) nunca chega ao conteúdo.
 * O middleware já barra quem não está logado; aqui checamos o is_admin.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?proximo=/admin");

  const { data: perfil } = await supabase
    .from("guests")
    .select("full_name, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil?.is_admin) redirect("/area-do-convidado");

  const pendencias = await carregarPendencias(supabase);

  return (
    <div className="flex min-h-screen bg-creme lg:gap-0">
      <Sidebar nome={perfil.full_name ?? ""} pendencias={pendencias} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

/** Números que viram badge na sidebar: só o que realmente pede ação. */
async function carregarPendencias(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
): Promise<Pendencias> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [semConvite, followUp, tarefas, vencendo, denuncias] = await Promise.all([
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("invite_status", "nao_contatado"),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("invite_status", "follow_up"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "feito")
      .lt("due_date", hoje),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .not("due_date", "is", null)
      .lte("due_date", hoje),
    supabase.from("post_reports").select("id", { count: "exact", head: true }),
  ]);

  return {
    convidados: semConvite.count ?? 0,
    crm: followUp.count ?? 0,
    tarefas: tarefas.count ?? 0,
    financeiro: vencendo.count ?? 0,
    mural: denuncias.count ?? 0,
  };
}
