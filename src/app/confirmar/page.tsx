import type { Metadata } from "next";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Rsvp } from "@/lib/tipos";
import { CartaoForm } from "@/components/CartaoForm";
import { BotaoLink } from "@/components/Botao";
import { FormRsvp } from "./FormRsvp";

export const metadata: Metadata = {
  title: "Confirmar Presença",
  description: "Confirme sua presença no nosso casamento.",
};

export const dynamic = "force-dynamic";

export default async function Confirmar() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visitante sem cadastro: convite para criar a conta primeiro.
  if (!user) {
    return (
      <CartaoForm
        sobretitulo="Confirmação de presença"
        titulo="Primeiro, seu cadastro"
        descricao="Para confirmar presença a gente precisa saber quem é você. Leva menos de um minuto."
        rodape={
          <>
            Já tem cadastro?{" "}
            <Link href="/entrar?proximo=/confirmar" className="text-oliva underline underline-offset-4">
              Entrar
            </Link>
          </>
        }
      >
        <BotaoLink href="/cadastrar?proximo=/confirmar" className="w-full">
          Criar meu cadastro
        </BotaoLink>
      </CartaoForm>
    );
  }

  const [{ data: perfil }, { data: rsvp }] = await Promise.all([
    supabase.from("guests").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("rsvps").select("*").eq("guest_id", user.id).maybeSingle(),
  ]);

  return (
    <FormRsvp
      nome={perfil?.full_name ?? ""}
      rsvpInicial={(rsvp as Rsvp | null) ?? null}
    />
  );
}
