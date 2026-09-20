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

/** Idade a partir da qual a pessoa recebe código e entra no site. */
export const IDADE_MINIMA_ACESSO = 10;
/** Até esta idade a criança é só cadastro: fica fora do total e do buffet. */
export const IDADE_DE_COLO = 3;

/** Entra nas contagens de convidados e de pessoas na festa? */
export function contaNoTotal(c: { age: number | null }): boolean {
  return c.age === null || c.age > IDADE_DE_COLO;
}

/** Recebe código do convite? Criança pequena é cadastro sem acesso. */
export function temAcessoAoSite(c: { age: number | null }): boolean {
  return c.age === null || c.age >= IDADE_MINIMA_ACESSO;
}
