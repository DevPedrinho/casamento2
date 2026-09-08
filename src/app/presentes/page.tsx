import type { Metadata } from "next";
import Image from "next/image";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Presente } from "@/lib/tipos";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Divisor, FaixaVersalete } from "@/components/Ornamentos";
import { ListaPresentes } from "./ListaPresentes";
import { CASAMENTO } from "@/lib/config";

export const metadata: Metadata = {
  title: "Lista de Presentes",
  description: "Escolha um presente e ajude a gente a montar esse novo começo.",
};

// A lista muda quando os noivos editam o painel, então nada de cache estático.
export const dynamic = "force-dynamic";

export default async function Presentes() {
  const supabase = await criarClienteServidor();

  const [{ data: presentes }, { data: sessao }] = await Promise.all([
    supabase
      .from("gifts")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const logado = Boolean(sessao?.user);

  return (
    <>
      <section className="relative overflow-hidden bg-creme px-5 py-16 text-center sm:py-24">
        <Image
          src="/img/ramo-floral.png"
          alt=""
          width={490}
          height={786}
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-4 w-40 opacity-20 sm:w-56"
        />
        <div className="relative mx-auto max-w-2xl">
          <FaixaVersalete>Marketplace</FaixaVersalete>
          <h1 className="titulo-serif mt-8 text-4xl text-oliva sm:text-6xl">Lista de presentes</h1>
          <Divisor className="mt-8" />
          <p className="mt-8 text-base leading-relaxed text-terra sm:text-lg">
            Sua presença já é o presente que importa. Mas se quiser contribuir com o
            nosso começo, escolha um item abaixo — o botão leva direto para o
            pagamento, sem complicação.
          </p>
          {!logado && (
            <p className="titulo-serif mt-6 text-sm text-terra italic">
              Faça seu cadastro para a gente saber de quem veio o carinho e poder
              agradecer.
            </p>
          )}
        </div>
      </section>

      <Secao fundo="claro">
        <ListaPresentes presentes={(presentes ?? []) as Presente[]} logado={logado} />
      </Secao>

      <Secao fundo="oliva">
        <div className="text-center">
          <p className="titulo-serif mx-auto max-w-xl text-xl text-creme-claro italic sm:text-2xl">
            De verdade: o que a gente mais quer é você lá, em {CASAMENTO.dataExtenso}.
          </p>
          <BotaoLink
            href="/confirmar"
            className="mt-10 border border-creme/50 bg-transparent text-creme-claro hover:bg-creme-claro hover:text-oliva"
          >
            Confirmar presença
          </BotaoLink>
        </div>
      </Secao>
    </>
  );
}
