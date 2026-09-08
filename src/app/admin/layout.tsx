import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { NavAdmin } from "./NavAdmin";

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
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.is_admin) redirect("/area-do-convidado");

  return (
    <div className="bg-creme px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <p className="versalete titulo-serif text-xs text-terra">Só vocês dois veem isso</p>
          <h1 className="titulo-serif mt-3 text-4xl text-oliva sm:text-5xl">Painel dos noivos</h1>
        </header>
        <NavAdmin />
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
