import Image from "next/image";
import { CASAMENTO } from "@/lib/config";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Contagem } from "@/components/Contagem";
import { Divisor, FaixaVersalete } from "@/components/Ornamentos";

const DETALHES = [
  {
    titulo: "Cerimônia",
    linhas: [CASAMENTO.dataExtenso, `às ${CASAMENTO.horaCerimonia}`, CASAMENTO.local.nome],
  },
  {
    titulo: "Recepção",
    linhas: ["Logo após a cerimônia", `a partir das ${CASAMENTO.horaRecepcao}`, "No mesmo local"],
  },
  {
    titulo: "Traje",
    linhas: [CASAMENTO.trajes, "Venha confortável —", "a festa é longa"],
  },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-creme px-5 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
        <Image
          src="/img/ramo-floral.png"
          alt=""
          width={490}
          height={786}
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-10 w-44 opacity-25 sm:w-64 lg:w-80"
        />
        <Image
          src="/img/ramo-floral-espelhado.png"
          alt=""
          width={490}
          height={786}
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-0 w-44 opacity-25 sm:w-64 lg:w-80"
        />

        <div className="relative mx-auto max-w-3xl">
          <FaixaVersalete>{CASAMENTO.lema}</FaixaVersalete>
          <Divisor className="mt-6" />

          <Image
            src="/img/monograma-dp.png"
            alt={`Monograma de ${CASAMENTO.noiva} e ${CASAMENTO.noivo}`}
            width={1400}
            height={1345}
            priority
            className="mx-auto mt-10 w-52 sm:w-72 md:w-80"
          />

          <h1 className="titulo-serif versalete mt-10 text-3xl leading-tight text-oliva sm:text-5xl md:text-6xl">
            {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
          </h1>

          <Divisor className="mt-8" />
          <p className="versalete titulo-serif mt-6 text-lg text-oliva sm:text-2xl">
            {CASAMENTO.dataCurta}
          </p>
          <p className="titulo-serif mx-auto mt-8 max-w-md text-lg text-terra italic sm:text-xl">
            {CASAMENTO.frase}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotaoLink href="/confirmar">Confirmar presença</BotaoLink>
            <BotaoLink href="/presentes" variante="contorno">
              Lista de presentes
            </BotaoLink>
          </div>
        </div>
      </section>

      {/* ---------- Contagem regressiva ---------- */}
      <Secao fundo="claro" sobretitulo="Falta pouco" titulo="Contagem regressiva">
        <Contagem />
      </Secao>

      {/* ---------- Resumo da história ---------- */}
      <Secao id="historia" sobretitulo="Como tudo começou" titulo="Nossa história">
        <div className="mx-auto max-w-2xl space-y-6 text-center text-base leading-relaxed text-terra sm:text-lg">
          <p>
            Tem amor que chega fazendo barulho. O nosso chegou devagar, do jeito que
            se entra numa casa conhecida: sem pressa, sem precisar bater na porta.
          </p>
          <p>
            Entre conversas que viraram madrugada e planos que viraram rotina,
            descobrimos que o melhor de estar junto não é a parte fácil — é saber
            que, mesmo na parte difícil, a gente escolhe ficar.
          </p>
          <p className="titulo-serif text-xl text-oliva italic sm:text-2xl">
            E é esse amor que a gente quer dividir com você em {CASAMENTO.dataExtenso}.
          </p>
        </div>
        <div className="mt-12 text-center">
          <BotaoLink href="/nossa-historia" variante="contorno">
            Ler a história completa
          </BotaoLink>
        </div>
      </Secao>

      {/* ---------- Detalhes do dia ---------- */}
      <Secao fundo="oliva" sobretitulo="Anote na agenda" titulo="O grande dia">
        <div className="grid gap-10 sm:grid-cols-3">
          {DETALHES.map((item) => (
            <div key={item.titulo} className="text-center">
              <h3 className="versalete titulo-serif text-xs text-creme/70">{item.titulo}</h3>
              <span className="mx-auto mt-4 block h-px w-10 bg-creme/30" />
              <div className="mt-5 space-y-1.5 text-creme-claro">
                {item.linhas.map((linha) => (
                  <p key={linha} className="titulo-serif text-lg sm:text-xl">
                    {linha}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {CASAMENTO.local.mapsUrl && (
          <div className="mt-14 text-center">
            <a
              href={CASAMENTO.local.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="versalete titulo-serif border-b border-creme/40 pb-1 text-xs text-creme-claro transition-colors hover:border-creme"
            >
              Ver no mapa
            </a>
          </div>
        )}
      </Secao>

      {/* ---------- Chamadas finais ---------- */}
      <Secao fundo="claro" sobretitulo="Participe" titulo="Como estar com a gente">
        <div className="grid gap-8 md:grid-cols-2">
          <article className="rounded-sm border border-terra/20 bg-creme p-9 text-center">
            <h3 className="titulo-serif text-2xl text-oliva">Confirme sua presença</h3>
            <p className="mt-4 text-sm leading-relaxed text-terra">
              Faça seu cadastro no site, diga se vem e quem vem com você. Assim a
              gente organiza tudo com carinho e ninguém fica sem lugar.
            </p>
            <BotaoLink href="/confirmar" className="mt-8">
              Confirmar presença
            </BotaoLink>
          </article>

          <article className="rounded-sm border border-terra/20 bg-creme p-9 text-center">
            <h3 className="titulo-serif text-2xl text-oliva">Nos presenteie</h3>
            <p className="mt-4 text-sm leading-relaxed text-terra">
              Sua presença já é o maior presente. Mas se quiser nos ajudar a montar
              esse novo começo, escolha um item da lista — é rapidinho.
            </p>
            <BotaoLink href="/presentes" variante="lavanda" className="mt-8">
              Ver lista de presentes
            </BotaoLink>
          </article>
        </div>
      </Secao>
    </>
  );
}
