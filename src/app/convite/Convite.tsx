"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProvedorMusica, useMusica } from "@/components/PlayerMusica";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Contagem } from "@/components/Contagem";
import { Icone, type NomeIcone } from "@/components/Icones";
import { Divisor, FaixaVersalete } from "@/components/Ornamentos";
import { iconeDoManual, type TextosConvite } from "@/lib/conviteDigital";
import type { FaixaDoSite } from "@/lib/musica";
import { ROTULOS_LOCAL, type IdSecaoConvite, type ItemManual, type LocalEvento } from "@/lib/tipos";

export type PropsConvite = {
  noiva: string;
  noivo: string;
  dataISO: string;
  dataCurta: string;
  dataExtenso: string;
  trajePadrao: string;
  prazoRsvp: string | null;
  monograma: string;
  /** Nome de quem recebeu o link; null = convite geral. */
  convidado: string | null;
  confirmarHref: string;
  textos: TextosConvite;
  versiculoVisivel: boolean;
  /** Só as visíveis, já na ordem do painel. */
  secoes: IdSecaoConvite[];
  itens: ItemManual[];
  locais: LocalEvento[];
  imagens: { capa: string; cerimonia: string; final: string };
  musica: (FaixaDoSite & { volume: number; loop: boolean }) | null;
};

/** Quanto dura a subida da capa. Com movimento reduzido, quase nada. */
const DURACAO_ABERTURA = 1000;

/**
 * O convite digital.
 *
 * Abre em silêncio, só com a capa. O toque em "abrir" é o gesto que o
 * Safari e o Chrome exigem para liberar o som: a música começa DENTRO
 * desse clique (nunca antes), a capa sobe como um cartão sendo tirado do
 * envelope e o convite aparece por baixo.
 */
export function Convite(props: PropsConvite) {
  const { musica } = props;
  if (!musica) return <Casca {...props} />;

  return (
    <ProvedorMusica
      arquivo={musica.arquivo}
      titulo={musica.titulo}
      artista={musica.artista}
      autoplay={false}
      pilula={false}
      volumeInicial={musica.volume}
      loop={musica.loop}
    >
      <Casca {...props} />
    </ProvedorMusica>
  );
}

type Fase = "fechado" | "abrindo" | "aberto";

function Casca(props: PropsConvite) {
  const musica = useMusica();
  const [fase, setFase] = useState<Fase>("fechado");
  const inicio = useRef<HTMLDivElement>(null);

  // Enquanto a capa está na frente, a página não rola por baixo dela.
  useEffect(() => {
    if (fase === "aberto") return;
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = antes;
    };
  }, [fase]);

  function abrir() {
    if (fase !== "fechado") return;
    // Primeiro a música, ainda dentro do gesto — depois de um setTimeout
    // o iPhone já não considera que foi a pessoa que pediu.
    musica?.tocar();
    window.scrollTo(0, 0);
    setFase("abrindo");

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => {
        setFase("aberto");
        inicio.current?.focus({ preventScroll: true });
      },
      reduzido ? 150 : DURACAO_ABERTURA,
    );
  }

  const fechado = fase === "fechado";

  return (
    <div className="relative">
      {fase !== "aberto" && <Capa {...props} fase={fase} aoAbrir={abrir} />}

      {fase === "aberto" && musica && <ControleDiscreto />}

      <div
        ref={inicio}
        tabIndex={-1}
        inert={fechado}
        aria-hidden={fechado}
        className={`outline-none transition-[opacity,transform] duration-1000 ease-out ${
          fechado ? "[.js-ativo_&]:translate-y-6 [.js-ativo_&]:opacity-0" : "delay-200"
        }`}
      >
        <Conteudo {...props} />
      </div>
    </div>
  );
}

/* ============================== Capa ============================== */

function Capa({
  noiva,
  noivo,
  dataCurta,
  monograma,
  convidado,
  textos,
  imagens,
  fase,
  aoAbrir,
}: PropsConvite & { fase: Fase; aoAbrir: () => void }) {
  const abrindo = fase === "abrindo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Convite de casamento de ${noiva} e ${noivo}`}
      className={`fixed inset-0 z-50 overflow-y-auto bg-creme transition-transform ease-[cubic-bezier(0.7,0,0.25,1)] [html:not(.js-ativo)_&]:hidden ${
        abrindo ? "-translate-y-full shadow-[0_12px_30px_rgba(94,74,59,0.12)]" : ""
      }`}
      style={{ transitionDuration: `${DURACAO_ABERTURA}ms` }}
    >
      {/* O fio da borda, como a margem de um cartão impresso. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-3 border border-terra/20 sm:inset-5"
      />
      <Image
        src="/img/ramo-floral.png"
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 top-4 w-28 opacity-25 sm:w-44"
      />
      <Image
        src="/img/ramo-floral-espelhado.png"
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 top-4 w-28 opacity-25 sm:w-44"
      />

      <div
        className={`relative mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-between gap-5 px-8 pt-[max(2.25rem,env(safe-area-inset-top))] pb-[max(2.25rem,env(safe-area-inset-bottom))] text-center transition-opacity duration-500 ${
          abrindo ? "opacity-0" : "opacity-100"
        }`}
      >
        <header className="flex flex-col items-center">
          <Image
            src={monograma}
            alt=""
            width={1400}
            height={1345}
            priority
            className="w-16 sm:w-20"
          />
          <h1 className="titulo-serif mt-4 text-[2.6rem] leading-[1.05] text-oliva sm:text-[3.25rem]">
            {noiva}
            <span className="my-1 block text-2xl text-lavanda italic sm:text-3xl">&amp;</span>
            {noivo}
          </h1>
        </header>

        <Image
          src={imagens.capa}
          alt="Desenho da igreja onde será a cerimônia"
          width={1448}
          height={1086}
          priority
          sizes="(max-width: 640px) 88vw, 420px"
          className="bordas-suaves h-auto max-h-[30svh] w-auto max-w-full object-contain mix-blend-multiply"
        />

        <div className="flex flex-col items-center">
          <p className="versalete titulo-serif text-lg text-oliva sm:text-xl">{dataCurta}</p>
          <Divisor className="mt-4" />
          {textos.capa_frase && (
            <p className="titulo-serif mt-4 max-w-xs text-lg leading-snug text-terra italic sm:max-w-sm sm:text-xl">
              {textos.capa_frase}
            </p>
          )}
          {convidado && (
            <p className="titulo-serif mt-3 text-2xl leading-tight text-oliva sm:text-3xl">{convidado}</p>
          )}

          <button
            type="button"
            onClick={aoAbrir}
            disabled={abrindo}
            className="versalete titulo-serif mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-oliva px-7 py-3 text-sm text-creme-claro transition-colors hover:bg-oliva-escuro focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oliva"
          >
            <Icone nome="envelope" className="h-5 w-5" />
            {textos.capa_botao || "Abrir o convite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================= Controle da música ======================= */

/** Pequeno, num canto: pausa/continua e silencia/reativa. */
function ControleDiscreto() {
  const musica = useMusica();
  if (!musica) return null;
  const { tocando, carregando, alternar, mudo, alternarMudo, titulo } = musica;

  const botao =
    "flex h-10 w-10 items-center justify-center rounded-full text-oliva transition-colors hover:bg-oliva/10 focus-visible:outline-2 focus-visible:outline-oliva";

  return (
    <div
      className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-0.5 rounded-full border border-terra/25 bg-creme-claro/90 py-0.5 pr-0.5 pl-3 shadow-sm backdrop-blur-sm sm:right-5"
      role="group"
      aria-label={`Música: ${titulo}`}
    >
      <Icone nome="musica" className="h-4 w-4 text-lavanda" />
      <span className="versalete titulo-serif mr-1 ml-1.5 hidden text-xs text-terra min-[380px]:inline">
        Música
      </span>
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar a música" : "Continuar a música"}
        className={botao}
      >
        {carregando ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-oliva/30 border-t-oliva"
          />
        ) : tocando ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={alternarMudo}
        aria-label={mudo ? "Reativar o som" : "Silenciar"}
        aria-pressed={mudo}
        className={botao}
      >
        <Icone nome={mudo ? "mudo" : "volume"} className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ============================ Conteúdo ============================ */

function Conteudo(props: PropsConvite) {
  const secoes = props.secoes.filter((id) => id !== "manual" || props.itens.length > 0);

  return (
    <>
      {secoes.map((id, i) => {
        // Creme e creme-claro alternados, seja qual for a ordem do painel.
        const fundo = i % 2 === 0 ? "creme" : "claro";
        const Componente = SECOES[id];
        return <Componente key={id} {...props} fundo={fundo} />;
      })}
    </>
  );
}

type PropsSecao = PropsConvite & { fundo: "creme" | "claro" };

const SECOES: Record<IdSecaoConvite, (p: PropsSecao) => ReactNode> = {
  apresentacao: Apresentacao,
  mensagem: Mensagem,
  grande_dia: GrandeDia,
  contagem: ContagemSecao,
  traje: Traje,
  manual: Manual,
  confirmacao: Confirmacao,
  explorar: Explorar,
  final: Final,
};

/** Texto do painel com as quebras de linha que a pessoa digitou. */
function Paragrafo({ children, className = "" }: { children: string; className?: string }) {
  if (!children.trim()) return null;
  return <p className={`whitespace-pre-line ${className}`}>{children}</p>;
}

function Apresentacao({ textos, versiculoVisivel, noiva, noivo, dataExtenso, fundo }: PropsSecao) {
  const versiculo = versiculoVisivel && textos.versiculo_texto.trim();
  return (
    <Secao fundo={fundo}>
      <div className="mx-auto max-w-2xl text-center">
        <FaixaVersalete>Convite</FaixaVersalete>
        <Paragrafo className="titulo-serif mt-10 text-2xl leading-snug text-oliva italic sm:text-3xl">
          {textos.apresentacao_texto}
        </Paragrafo>
        <p className="titulo-serif versalete mt-10 text-2xl text-oliva sm:text-4xl">
          {noiva} &amp; {noivo}
        </p>
        <p className="versalete titulo-serif mt-4 text-sm text-terra">{dataExtenso}</p>

        {versiculo && (
          <figure className="mx-auto mt-12 max-w-lg">
            <Divisor />
            <blockquote className="titulo-serif mt-8 text-xl leading-relaxed text-terra italic whitespace-pre-line sm:text-2xl">
              “{textos.versiculo_texto.trim()}”
            </blockquote>
            {textos.versiculo_referencia.trim() && (
              <figcaption className="versalete titulo-serif mt-4 text-xs text-lavanda">
                {textos.versiculo_referencia}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </Secao>
  );
}

function Mensagem({ textos, fundo }: PropsSecao) {
  if (!textos.mensagem_texto.trim()) return null;
  return (
    <Secao fundo={fundo} titulo={textos.mensagem_titulo || undefined}>
      <Paragrafo className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-terra sm:text-xl">
        {textos.mensagem_texto}
      </Paragrafo>
    </Secao>
  );
}

/** "16h00" vira "às 16h00"; "logo após a cerimônia" fica como está. */
function horario(texto: string | null) {
  const limpo = texto?.trim();
  if (!limpo) return null;
  return /^\d/.test(limpo) ? `às ${limpo}` : limpo;
}

function GrandeDia({ textos, locais, dataExtenso, imagens, fundo }: PropsSecao) {
  return (
    <Secao fundo={fundo} sobretitulo={dataExtenso} titulo={textos.grande_dia_titulo || undefined}>
      <Image
        src={imagens.cerimonia}
        alt="Aquarela do interior da igreja com o monograma dos noivos"
        width={1163}
        height={1352}
        sizes="(max-width: 640px) 90vw, 420px"
        className="bordas-suaves mx-auto h-auto w-full max-w-sm mix-blend-multiply"
      />

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {locais.map((local) => {
          const endereco = [local.address, local.city].filter(Boolean).join(" — ");
          return (
            <article
              key={local.id}
              className="flex flex-col items-center rounded-sm border border-terra/20 bg-creme-claro/70 px-6 py-8 text-center"
            >
              <Icone nome={local.kind === "cerimonia" ? "igreja" : "taca"} className="h-7 w-7 text-lavanda" />
              <h3 className="versalete titulo-serif mt-4 text-sm text-terra">{ROTULOS_LOCAL[local.kind]}</h3>
              <p className="titulo-serif mt-3 text-2xl leading-tight text-oliva">{local.name}</p>
              {horario(local.starts_at) && (
                <p className="titulo-serif mt-2 text-xl text-oliva italic">{horario(local.starts_at)}</p>
              )}
              <p className="mt-3 text-base leading-relaxed text-terra">{endereco || "Endereço a confirmar"}</p>
              {local.guest_info && (
                <p className="mt-3 text-sm leading-relaxed text-terra/90 whitespace-pre-line">{local.guest_info}</p>
              )}
              {local.maps_url && (
                <a
                  href={local.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="versalete titulo-serif mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-oliva/45 px-5 py-2 text-xs text-oliva transition-colors hover:bg-oliva hover:text-creme-claro"
                >
                  <Icone nome="local" className="h-4 w-4" />
                  Ver localização
                </a>
              )}
            </article>
          );
        })}
      </div>
    </Secao>
  );
}

function ContagemSecao({ textos, dataISO, fundo }: PropsSecao) {
  return (
    <Secao fundo={fundo} titulo={textos.contagem_titulo || undefined}>
      <Contagem dataISO={dataISO} rotulosCompletos />
    </Secao>
  );
}

function Traje({ textos, trajePadrao, fundo }: PropsSecao) {
  const principal = textos.traje_1.trim() || trajePadrao;
  return (
    <Secao fundo={fundo} titulo={textos.traje_titulo || undefined}>
      <div className="mx-auto max-w-xl text-center">
        <Icone nome="traje" className="mx-auto h-9 w-9 text-lavanda" />
        <p className="titulo-serif mt-5 text-3xl text-oliva sm:text-4xl">{principal}</p>
        <Paragrafo className="mt-6 text-lg leading-relaxed text-terra">{textos.traje_2}</Paragrafo>
        <Paragrafo className="titulo-serif mt-4 text-xl text-oliva italic">{textos.traje_3}</Paragrafo>
      </div>
    </Secao>
  );
}

function Manual({ textos, itens, fundo }: PropsSecao) {
  return (
    <Secao fundo={fundo} titulo={textos.manual_titulo || undefined}>
      <Paragrafo className="mx-auto -mt-4 mb-12 max-w-xl text-center text-lg leading-relaxed text-terra">
        {textos.manual_intro}
      </Paragrafo>
      <ul className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {itens.map((item) => (
          <li
            key={item.id}
            className="flex gap-4 rounded-sm border border-terra/15 bg-creme-claro/70 p-5 sm:p-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavanda/10 text-lavanda">
              <Icone nome={iconeDoManual(item.icon)} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="titulo-serif text-xl leading-snug text-oliva">{item.title}</h3>
              <Paragrafo className="mt-1.5 text-base leading-relaxed text-terra">{item.body}</Paragrafo>
            </div>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

function prazoPorExtenso(prazo: string | null) {
  if (!prazo) return null;
  // Data pura (AAAA-MM-DD): meio-dia evita virar o dia anterior no fuso.
  const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(prazo) ? `${prazo}T12:00:00` : prazo);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function Confirmacao({ textos, confirmarHref, prazoRsvp, fundo }: PropsSecao) {
  const prazo = prazoPorExtenso(prazoRsvp);
  return (
    <Secao fundo={fundo} titulo={textos.confirmacao_titulo || undefined}>
      <div className="mx-auto max-w-xl text-center">
        <Paragrafo className="text-lg leading-relaxed text-terra">{textos.confirmacao_texto}</Paragrafo>
        {prazo && (
          <p className="versalete titulo-serif mt-4 text-xs text-lavanda">Responda até {prazo}</p>
        )}
        <BotaoLink href={confirmarHref} className="mt-9">
          {textos.confirmacao_botao || "Confirmar presença"}
        </BotaoLink>
      </div>
    </Secao>
  );
}

const PAGINAS: { href: string; titulo: string; texto: string; icone: NomeIcone }[] = [
  { href: "/", titulo: "Início", texto: "O site do casamento", icone: "coracao" },
  { href: "/nossa-historia", titulo: "Nossa história", texto: "Como tudo começou", icone: "timeline" },
  { href: "/presentes", titulo: "Presentes", texto: "Se quiser nos presentear", icone: "presentes" },
  { href: "/mural", titulo: "Mural", texto: "Fotos e recados", icone: "mural" },
];

function Explorar({ textos, fundo }: PropsSecao) {
  return (
    <Secao fundo={fundo} titulo={textos.explorar_titulo || undefined}>
      <Paragrafo className="mx-auto -mt-4 mb-10 max-w-xl text-center text-lg leading-relaxed text-terra">
        {textos.explorar_texto}
      </Paragrafo>
      <nav aria-label="Páginas do site" className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {PAGINAS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col items-center rounded-sm border border-terra/20 bg-creme-claro/70 px-3 py-6 text-center transition-colors hover:border-oliva/50 hover:bg-creme-claro"
          >
            <Icone nome={p.icone} className="h-6 w-6 text-lavanda" />
            <span className="titulo-serif mt-3 text-xl leading-tight text-oliva">{p.titulo}</span>
            <span className="mt-1 text-sm text-terra">{p.texto}</span>
          </Link>
        ))}
      </nav>
    </Secao>
  );
}

function Final({ textos, noiva, noivo, monograma, imagens, fundo }: PropsSecao) {
  return (
    <Secao fundo={fundo}>
      <div className="mx-auto max-w-xl text-center">
        <Image
          src={imagens.final}
          alt="Desenho do corredor da igreja com gipsófilas"
          width={941}
          height={1672}
          sizes="(max-width: 640px) 70vw, 300px"
          className="bordas-suaves mx-auto h-auto max-h-[60svh] w-auto max-w-[70%] mix-blend-multiply sm:max-w-[300px]"
        />
        <Paragrafo className="titulo-serif mt-12 text-2xl leading-snug text-oliva italic sm:text-3xl">
          {textos.final_texto}
        </Paragrafo>
        <Divisor className="mt-10" />
        {textos.final_assinatura.trim() && (
          <p className="mt-8 text-base text-terra">{textos.final_assinatura}</p>
        )}
        <p className="titulo-serif versalete mt-2 text-2xl text-oliva">
          {noiva} &amp; {noivo}
        </p>
        <Image src={monograma} alt="" width={1400} height={1345} className="mx-auto mt-8 w-14 opacity-90" />
      </div>
    </Secao>
  );
}
