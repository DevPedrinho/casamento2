import "server-only";

import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * O convidado por trás da sessão atual.
 *
 * Desde que guests deixou de ser 1:1 com auth.users, o id do login e o id do
 * convidado são coisas diferentes. Tudo que grava em rsvps, posts, curtidas
 * ou presentes precisa do id do CONVIDADO — este helper existe para ninguém
 * mais confundir os dois.
 */
export async function meuConvidado(): Promise<{
  id: string;
  userId: string;
  full_name: string;
  is_admin: boolean;
} | null> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("guests")
    .select("id, full_name, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? { ...data, userId: user.id } : null;
}
