import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  // Já entrou, mas a conta ainda não está ligada a ninguém da lista:
  // o código do convite resolve isso na área do convidado.
  if (!eu) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/area-do-convidado");
  }

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
            <Link href="/cadastrar?proximo=/mural" className="inline-flex min-h-11 items-center text-oliva underline underline-offset-4">
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
