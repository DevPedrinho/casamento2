import type { Metadata } from "next";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { meuConvidado } from "@/lib/convidado";
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
  const eu = await meuConvidado();

  // O mural é privado: é o álbum dos convidados, não uma vitrine pública.
  if (!eu) {
    return (
      <CartaoForm
        sobretitulo="Mural dos convidados"
        titulo="Entre para ver o mural"
        descricao="As fotos e os recados ficam só entre quem foi convidado. Faça login ou crie seu cadastro para participar."
        rodape={
          <>
            Ainda não tem cadastro?{" "}
            <Link href="/cadastrar?proximo=/mural" className="inline-block py-2 text-oliva underline underline-offset-4">
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

  const [feed, stories] = await Promise.all([
    carregarFeed(eu.id),
    carregarStories(eu.id),
  ]);

  return (
    <Mural
      meuId={eu.id}
      meuNome={eu.full_name}
      souAdmin={eu.is_admin}
      feedInicial={feed}
      gruposIniciais={stories}
    />
  );
}
