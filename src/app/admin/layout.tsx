import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BarraTopo, type Pendencias } from "./BarraTopo";
import { Assistente } from "@/components/assistente/Assistente";

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
    <div className="min-h-screen bg-creme">
      <BarraTopo nome={perfil.full_name ?? ""} pendencias={pendencias} />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 sm:pb-32">{children}</main>

      {/* A cerimonialista só existe aqui dentro. */}
      <Assistente
        modo="painel"
        ativo={Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)}
        nome="Aurora, sua cerimonialista"
        saudacao={`Oi, ${(perfil.full_name ?? "").trim().split(" ")[0] || "tudo bem"}! Estou aqui para ajudar a organizar o casamento. Pode perguntar o que quiser — inclusive "o que eu faço agora?".`}
        sugestoes={[
          "O que eu preciso resolver essa semana?",
          "Como está o orçamento?",
          "Quantos convidados ainda não responderam?",
          "Me ajuda a montar o cronograma do dia",
        ]}
      />
    </div>
  );
}

/** Números que viram badge na sidebar: só o que realmente pede ação. */
async function carregarPendencias(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
): Promise<Pendencias> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [semConvite, tarefas, vencendo, denuncias] = await Promise.all([
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("invite_status", "nao_contatado")
      .eq("is_admin", false),
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
    tarefas: tarefas.count ?? 0,
    financeiro: vencendo.count ?? 0,
    mural: denuncias.count ?? 0,
  };
}
