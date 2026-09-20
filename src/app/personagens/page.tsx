import type { Metadata } from "next";
import Image from "next/image";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import {
  ROTULOS_SECAO_PERSONAGEM,
  TEXTOS_PERSONAGENS_PADRAO,
  type PersonagemCerimonia,
  type TextosPersonagens,
} from "@/lib/tipos";
import { urlDoSite } from "@/lib/storage";
import { Secao } from "@/components/Secao";
import { Divisor, FaixaVersalete } from "@/components/Ornamentos";
import { AoNossoLado, CartaoPessoa, Protagonista } from "./Cartoes";

export const metadata: Metadata = {
  title: "Personagens da cerimônia",
  description: "Quem caminha com a gente até o altar.",
};

export const dynamic = "force-dynamic";

export default async function PersonagensPage() {
  const supabase = await criarClienteServidor();
  const [casamento, { data: pessoas }, { data: pagina }] = await Promise.all([
    carregarCasamento(),
    supabase
      .from("ceremony_people")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase.from("ceremony_page").select("texts").maybeSingle(),
  ]);

  const textos: TextosPersonagens = {
    ...TEXTOS_PERSONAGENS_PADRAO,
    ...((pagina?.texts as Partial<TextosPersonagens> | null) ?? {}),
  };

  const lista = ((pessoas ?? []) as PersonagemCerimonia[]).map((p) => ({
    ...p,
    url: urlDoSite(p.image_path),
  }));
  const de = (secao: PersonagemCerimonia["section"]) => lista.filter((p) => p.section === secao);

  const protagonistas = de("protagonistas");
  const raizes = de("raizes");
  const aoLado = de("ao_lado");
  const cortejo = de("cortejo");

  return (
    <>
      {/* ---------- Abertura ---------- */}
      <section className="relative overflow-hidden bg-creme px-5 py-20 text-center sm:py-28">
        <Image
          src="/img/ramo-floral-espelhado.png"
          alt=""
          width={490}
          height={786}
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-6 w-40 opacity-20 sm:w-56"
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="relative mx-auto max-w-2xl">
          <FaixaVersalete>
            {casamento.noiva} & {casamento.noivo}
          </FaixaVersalete>
          <h1 className="titulo-serif mt-8 text-4xl text-oliva sm:text-6xl">{textos.titulo}</h1>
          <Divisor className="mt-8" />
          <p className="titulo-serif mt-8 text-lg text-terra italic sm:text-xl">“{textos.abertura}”</p>
        </div>
      </section>

      {/* ---------- Os protagonistas ---------- */}
      {protagonistas.length > 0 && (
        <Secao
          fundo="claro"
          sobretitulo={textos.protagonistas_sub}
          titulo={ROTULOS_SECAO_PERSONAGEM.protagonistas}
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {protagonistas.map((p) => (
              <Protagonista key={p.id} pessoa={p} />
            ))}
          </div>
        </Secao>
      )}

      {/* ---------- Nossas raízes ---------- */}
      {raizes.length > 0 && (
        <Secao sobretitulo={textos.raizes_sub} titulo={ROTULOS_SECAO_PERSONAGEM.raizes}>
          <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {raizes.map((p) => (
              <CartaoPessoa key={p.id} pessoa={p} />
            ))}
          </ul>
        </Secao>
      )}

      {/* ---------- Quem caminha ao nosso lado ---------- */}
      {aoLado.length > 0 && (
        <Secao fundo="claro" sobretitulo={textos.ao_lado_sub} titulo={ROTULOS_SECAO_PERSONAGEM.ao_lado}>
          <AoNossoLado pessoas={aoLado} />
        </Secao>
      )}

      {/* ---------- Nosso cortejo ---------- */}
      {cortejo.length > 0 && (
        <Secao sobretitulo={textos.cortejo_sub} titulo={ROTULOS_SECAO_PERSONAGEM.cortejo}>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {cortejo.map((p) => (
              <CartaoPessoa key={p.id} pessoa={p} formato="largo" />
            ))}
          </ul>
        </Secao>
      )}

      {/* ---------- Fechamento ---------- */}
      <Secao fundo="oliva">
        <p className="titulo-serif mx-auto max-w-2xl text-center text-xl text-creme-claro italic sm:text-2xl">
          “{textos.fechamento}”
        </p>
        <Divisor className="mt-8" />
      </Secao>
    </>
  );
}
