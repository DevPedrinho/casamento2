import { criarClienteNavegador } from "@/lib/supabase/cliente";

/** Versão de navegador do helper: resolve o id do convidado da sessão. */
export async function meuGuestId(): Promise<string | null> {
  const supabase = criarClienteNavegador();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("guests")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.id ?? null;
}
