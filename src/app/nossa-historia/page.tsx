import type { Metadata } from "next";
import Image from "next/image";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { CASAMENTO } from "@/lib/config";
import type { CapituloTimeline, FotoTimeline } from "@/lib/tipos";
import { urlDoSite } from "@/components/UploadImagem";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Coracao, Divisor, FaixaVersalete } from "@/components/Ornamentos";
import { PlayerMusica } from "@/components/PlayerMusica";
import { Timeline } from "./Timeline";

export const metadata: Metadata = {
  title: "Nossa História",
  description: `A história de ${CASAMENTO.noiva} e ${CASAMENTO.noivo}, ano a ano.`,
};

export const dynamic = "force-dynamic";

const VALORES = [
  {
    titulo: "Amor que cuida",
    texto: "É lembrar do remédio, do prazo, do dia difícil. Amor também se prova no detalhe pequeno.",
  },
  {
    titulo: "Amor que se adapta",
    texto: "Planos mudam, casas mudam, a gente muda. O que fica é a vontade de continuar junto.",
  },
  {
    titulo: "Amor que acolhe",
    texto: "Cabe família, cabe amigo, cabe quem chega. Casa boa é casa com porta aberta.",
  },
];

export default async function NossaHistoria() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("timeline_chapters")
    .select("*, fotos:timeline_photos(*)")
    .order("sort_order");

  const capitulos: CapituloTimeline[] = (data ?? []).map((c) => {
    const bruto = c as unknown as CapituloTimeline & { fotos: FotoTimeline[] | null };
    return {
      ...bruto,
      fotos: (bruto.fotos ?? [])
        .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
        .map((f) => ({ ...f, url: urlDoSite(f.image_path) ?? "" })),
    };
  });

  return (
    <>
      <section className="relative overflow-hidden bg-creme px-5 py-20 text-center sm:py-28">
        <Image
          src="/img/ramo-floral-espelhado.png"
          alt=""
          width={490}
          height={786}
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-6 w-40 opacity-20 sm:w-56"
        />
        <div className="relative mx-auto max-w-2xl">
          <FaixaVersalete>{CASAMENTO.lema}</FaixaVersalete>
          <h1 className="titulo-serif mt-8 text-4xl text-oliva sm:text-6xl">Nossa história</h1>
          <Divisor className="mt-8" />
          <p className="titulo-serif mt-8 text-lg text-terra italic sm:text-xl">
            {CASAMENTO.frase}
          </p>
        </div>
      </section>

      <Timeline capitulos={capitulos} />

      <Secao fundo="oliva" sobretitulo="O que nos guia" titulo={CASAMENTO.lema}>
        <div className="grid gap-10 sm:grid-cols-3">
          {VALORES.map((valor) => (
            <article key={valor.titulo} className="text-center">
              <Coracao className="mx-auto w-4 text-lavanda-claro" />
              <h3 className="titulo-serif mt-5 text-2xl text-creme-claro">{valor.titulo}</h3>
              <p className="mt-3 text-base leading-relaxed text-creme/75">{valor.texto}</p>
            </article>
          ))}
        </div>
      </Secao>

      <Secao>
        <div className="text-center">
          <p className="titulo-serif mx-auto max-w-xl text-xl text-oliva italic sm:text-2xl">
            Se você chegou até aqui, é porque faz parte dessa história. Vem celebrar
            com a gente?
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotaoLink href="/confirmar">Confirmar presença</BotaoLink>
            <BotaoLink href="/presentes" variante="contorno">
              Ver lista de presentes
            </BotaoLink>
          </div>
        </div>
      </Secao>

      {CASAMENTO.musica.arquivo && (
        <PlayerMusica
          arquivo={CASAMENTO.musica.arquivo}
          titulo={CASAMENTO.musica.titulo}
          artista={CASAMENTO.musica.artista}
        />
      )}
    </>
  );
}
