import type { Metadata } from "next";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarFeed, carregarStories } from "@/lib/mural";
import { CartaoForm } from "@/components/CartaoForm";
import { BotaoLink } from "@/components/Botao";
import { Mural } from "./Mural";

export const metadata: Metadata = {
  title: "Mural",
  description: "As fotos e os recados de quem esteve com a gente.",
};

export const dynamic = "force-dynamic";

export default async function MuralPage() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O mural é privado: é o álbum dos convidados, não uma vitrine pública.
  if (!user) {
    return (
      <CartaoForm
        sobretitulo="Mural dos convidados"
        titulo="Entre para ver o mural"
        descricao="As fotos e os recados ficam só entre quem foi convidado. Faça login ou crie seu cadastro para participar."
        rodape={
          <>
            Ainda não tem cadastro?{" "}
            <Link href="/cadastrar?proximo=/mural" className="text-oliva underline underline-offset-4">
              Criar meu cadastro
            </Link>
          </>
        }
      >
        <BotaoLink href="/entrar?proximo=/mural" className="w-full">
          Entrar
        </BotaoLink>
      </CartaoForm>
    );
  }

  const [perfil, feed, stories] = await Promise.all([
    supabase.from("guests").select("id, full_name, is_admin").eq("id", user.id).maybeSingle(),
    carregarFeed(user.id),
    carregarStories(user.id),
  ]);

  return (
    <Mural
      meuId={user.id}
      meuNome={perfil.data?.full_name ?? ""}
      souAdmin={Boolean(perfil.data?.is_admin)}
      feedInicial={feed}
      gruposIniciais={stories}
    />
  );
}
