import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Convite } from "./Convite";
import { montarConvite } from "./carregar";

export const metadata: Metadata = {
  title: "Convite",
  description: "Você está convidado para o nosso casamento.",
};

export const dynamic = "force-dynamic";

/**
 * O convite geral. Quem já entrou no site e está na lista vê o próprio
 * nome na capa; os demais, a capa sem nome. O link individual, com o
 * código, fica em /convite/CODIGO.
 */
export default async function ConviteGeral() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let convidado: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("guests")
      .select("full_name, invite_name")
      .eq("user_id", user.id)
      .maybeSingle();
    convidado = data ? data.invite_name?.trim() || data.full_name : null;
  }

  // /confirmar já sabe lidar com quem não tem cadastro ou não entrou.
  const props = await montarConvite({ convidado, confirmarHref: "/confirmar" });
  return <Convite {...props} />;
}
