import type { Metadata } from "next";
import Image from "next/image";
import { CASAMENTO } from "@/lib/config";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Coracao, Divisor, FaixaVersalete } from "@/components/Ornamentos";

export const metadata: Metadata = {
  title: "Nossa História",
  description: `A história de ${CASAMENTO.noiva} e ${CASAMENTO.noivo}, até o "sim".`,
};

/**
 * Capítulos da linha do tempo. Os noivos editam os textos e as datas
 * aqui — é o único lugar onde essa narrativa vive.
 */
const CAPITULOS = [
  {
    marco: "O começo",
    titulo: "Quando a gente se encontrou",
    texto:
      "Não teve trilha sonora nem câmera lenta. Teve conversa boa, risada fácil e aquela sensação estranha de já conhecer alguém que a gente tinha acabado de conhecer.",
  },
  {
    marco: "O primeiro sim",
    titulo: "Quando virou namoro",
    texto:
      "Um dia a gente percebeu que já não estava mais se conhecendo — estava construindo. Aí só faltou dar nome ao que já existia há um tempo.",
  },
  {
    marco: "A prova real",
    titulo: "Quando a vida apertou",
    texto:
      "Todo casal tem o seu ano difícil. O nosso mostrou que a gente sabe cuidar um do outro quando ninguém está olhando. Foi ali que o amor deixou de ser sentimento e virou escolha.",
  },
  {
    marco: "O pedido",
    titulo: "Quando decidimos para sempre",
    texto:
      "Sem plateia e sem discurso decorado. Só nós dois, a certeza de sempre e uma pergunta que já tinha resposta antes de ser feita.",
  },
  {
    marco: CASAMENTO.dataCurta,
    titulo: "Quando dizemos sim na frente de vocês",
    texto:
      "Agora falta a melhor parte: olhar em volta e ver as pessoas que ajudaram a gente a chegar até aqui. Você é uma delas.",
  },
];

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

export default function NossaHistoria() {
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

      {/* ---------- Linha do tempo ---------- */}
      <Secao fundo="claro" sobretitulo="Capítulo por capítulo" titulo="Do encontro ao altar">
        <ol className="relative mx-auto max-w-2xl">
          {/* Fio vertical que costura os capítulos */}
          <span
            aria-hidden="true"
            className="absolute left-2.5 top-2 bottom-2 w-px bg-terra/25 sm:left-1/2"
          />

          {CAPITULOS.map((cap, i) => (
            <li
              key={cap.titulo}
              className={`relative pb-14 pl-10 last:pb-0 sm:w-1/2 sm:pl-0 ${
                i % 2 === 0
                  ? "sm:mr-auto sm:pr-12 sm:text-right"
                  : "sm:ml-auto sm:pl-12 sm:text-left"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-creme-claro ring-1 ring-terra/30 left-0 ${
                  i % 2 === 0 ? "sm:-right-2.5 sm:left-auto" : "sm:-left-2.5"
                }`}
              >
                <Coracao className="w-2.5 text-lavanda" />
              </span>

              <p className="versalete titulo-serif text-[0.65rem] text-lavanda">{cap.marco}</p>
              <h3 className="titulo-serif mt-2 text-2xl text-oliva sm:text-3xl">{cap.titulo}</h3>
              <p className="mt-3 text-sm leading-relaxed text-terra sm:text-base">{cap.texto}</p>
            </li>
          ))}
        </ol>
      </Secao>

      {/* ---------- O que a IDV significa ---------- */}
      <Secao fundo="oliva" sobretitulo="O que nos guia" titulo={CASAMENTO.lema}>
        <div className="grid gap-10 sm:grid-cols-3">
          {VALORES.map((valor) => (
            <article key={valor.titulo} className="text-center">
              <Coracao className="mx-auto w-4 text-lavanda-claro" />
              <h3 className="titulo-serif mt-5 text-2xl text-creme-claro">{valor.titulo}</h3>
              <p className="mt-3 text-sm leading-relaxed text-creme/75">{valor.texto}</p>
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
    </>
  );
}
