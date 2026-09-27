"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ProvedorMusica, useMusica } from "@/components/PlayerMusica";
import { BotaoLink } from "@/components/Botao";
import { Contagem } from "@/components/Contagem";
import { Icone, type NomeIcone } from "@/components/Icones";
import { Divisor, Raminho } from "@/components/Ornamentos";
import { iconeDoManual, type TextosConvite } from "@/lib/conviteDigital";
import type { FaixaDoSite } from "@/lib/musica";
import { ROTULOS_LOCAL, type IdSecaoConvite, type ItemManual, type LocalEvento } from "@/lib/tipos";
import { Brilhos, Lavanda } from "./Enfeites";

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
  imagens: { logo: string; capa: string; cerimonia: string; final: string };
  musica: (FaixaDoSite & { volume: number; loop: boolean }) | null;
};

/** Quanto dura a página virando. Com movimento reduzido, quase nada. */
const DURACAO_ABERTURA = 1400;
/** Quando, durante a virada, o convite começa a aparecer por baixo. */
const INICIO_DO_CONTEUDO = 550;

/** O convite só revela as seções depois que a página começou a virar. */
const PodeRevelar = createContext(false);

/**
 * O convite digital.
 *
 * Abre em silêncio, só com a capa. O toque em "abrir" é o gesto que o
 * Safari e o Chrome exigem para liberar o som: a música começa DENTRO
 * desse clique (nunca antes), a capa vira como a folha de um livro e as
 * informações vão chegando uma a uma.
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
  const [revelar, setRevelar] = useState(false);
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
    window.setTimeout(() => setRevelar(true), reduzido ? 0 : INICIO_DO_CONTEUDO);
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
        className={`outline-none transition-opacity duration-700 ${fechado ? "[.js-ativo_&]:opacity-0" : ""}`}
      >
        <PodeRevelar.Provider value={revelar}>
          <Conteudo {...props} />
        </PodeRevelar.Provider>
      </div>
    </div>
  );
}

/* ============================== Capa ============================== */

function Capa({
  noiva,
  noivo,
  dataCurta,
  convidado,
  textos,
  imagens,
  fase,
  aoAbrir,
}: PropsConvite & { fase: Fase; aoAbrir: () => void }) {
  const abrindo = fase === "abrindo";
  // O reflexo recorta na forma da logo, o que só funciona com a logo de
  // fundo transparente do projeto; uma enviada pelo painel vira JPEG.
  const logoTransparente = /\.(webp|png)$/i.test(imagens.logo);
  const mascara = `url(${imagens.logo}) center / contain no-repeat`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Convite de casamento de ${noiva} e ${noivo}`}
      className={`fixed inset-0 z-50 [html:not(.js-ativo)_&]:hidden ${abrindo ? "pointer-events-none" : ""}`}
      style={{
        perspective: "2400px",
        // A sombra que a folha projeta no convite enquanto vira.
        backgroundColor: abrindo ? "rgba(94, 74, 59, 0)" : "rgba(94, 74, 59, 0.18)",
        transition: `background-color ${DURACAO_ABERTURA}ms ease-out`,
      }}
    >
      <div
        className="absolute inset-0 overflow-y-auto bg-creme [backface-visibility:hidden]"
        style={{
          transformOrigin: "left center",
          transform: abrindo ? "rotateY(-112deg)" : "none",
          transition: `transform ${DURACAO_ABERTURA}ms cubic-bezier(0.6, 0.02, 0.3, 1)`,
        }}
      >
        <Brilhos densidade={2} />

        {/* O fio da borda, como a margem de um cartão impresso. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-3 border border-terra/20 sm:inset-5" />

        {/* Ramos no alto balançando, lavanda embaixo. */}
        <span
          aria-hidden="true"
          className="balancar pointer-events-none absolute -left-10 top-2 w-24 opacity-30 sm:w-36"
          style={{ transformOrigin: "10% 0%", animationDuration: "7s" }}
        >
          <Image src="/img/ramo-floral.png" alt="" width={490} height={786} />
        </span>
        <span
          aria-hidden="true"
          className="balancar pointer-events-none absolute -right-10 top-2 w-24 opacity-30 sm:w-36"
          style={{ transformOrigin: "90% 0%", animationDuration: "8s", animationDelay: "-2s" }}
        >
          <Image src="/img/ramo-floral-espelhado.png" alt="" width={490} height={786} />
        </span>
        <div className="pointer-events-none absolute bottom-0 left-2 flex items-end gap-0 sm:left-8">
          <Lavanda className="h-[20svh] max-h-56" duracao={5.5} />
          <Lavanda className="-ml-5 h-[14svh] max-h-32" duracao={6.5} atraso={-1.5} espelhar />
        </div>
        <div className="pointer-events-none absolute right-2 bottom-0 flex items-end sm:right-8">
          <Lavanda className="-mr-5 h-[14svh] max-h-32" duracao={7} atraso={-3} />
          <Lavanda className="h-[20svh] max-h-56" duracao={6} atraso={-0.8} espelhar />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center gap-[2.2svh] px-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
          <h1 className="sr-only">
            {noiva} &amp; {noivo} — {dataCurta}
          </h1>
          {/* A logo cede espaço ao desenho: limitada também pela altura da
              tela, para logo + arco + texto caberem juntos no celular. */}
          <div className="relative w-[min(52vw,26svh,300px)]">
            <Image
              src={imagens.logo}
              alt=""
              width={2000}
              height={1762}
              priority
              sizes="(max-width: 640px) 52vw, 300px"
              className="h-auto w-full mix-blend-multiply"
            />
            {logoTransparente && (
              <span
                aria-hidden="true"
                className="reflexo pointer-events-none absolute inset-0"
                style={{ mask: mascara, WebkitMask: mascara } as CSSProperties}
              />
            )}
          </div>

          <ArcoDaCapa src={imagens.capa} />

          <div className="flex flex-col items-center">
            {textos.capa_frase && (
              <p className="titulo-serif max-w-[17rem] text-base leading-snug text-terra italic sm:max-w-xs sm:text-lg">
                {textos.capa_frase}
              </p>
            )}
            {convidado && (
              <p className="titulo-serif mt-2 text-[1.4rem] leading-tight text-oliva sm:text-2xl">{convidado}</p>
            )}

            <button
              type="button"
              onClick={aoAbrir}
              disabled={abrindo}
              className="respirar versalete titulo-serif mt-5 inline-flex min-h-11 items-center gap-2.5 rounded-full bg-oliva px-6 py-2.5 text-xs text-creme-claro transition-colors hover:bg-oliva-escuro focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oliva"
            >
              <Icone nome="envelope" className="h-4 w-4" />
              {textos.capa_botao || "Abrir o convite"}
            </button>
          </div>
        </div>

        {/* A folha escurece de leve enquanto vira, como papel contra a luz. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-terra/35 via-terra/10 to-transparent"
          style={{ opacity: abrindo ? 1 : 0, transition: `opacity ${DURACAO_ABERTURA * 0.7}ms ease-in` }}
        />
      </div>
    </div>
  );
}

/**
 * O desenho da capa, a peça principal: recortado num arco, como uma janela
 * de igreja, com um brilho percorrendo a borda da imagem. O recorte
 * (object-cover) serve para qualquer proporção enviada pelo painel.
 */
function ArcoDaCapa({ src }: { src: string }) {
  const arco = "rounded-t-full rounded-b-[6px]";
  return (
    <div className="relative">
      {/* Fio fino acompanhando o arco, por fora. */}
      <span aria-hidden="true" className={`pointer-events-none absolute -inset-2 border border-terra/25 ${arco}`} />
      <div className={`relative h-[min(42svh,440px)] w-[min(76vw,300px)] overflow-hidden bg-terra/20 p-[3px] ${arco}`}>
        <span aria-hidden="true" className="borda-giratoria absolute top-1/2 left-1/2 aspect-square w-[260%]" />
        <div className={`relative h-full w-full overflow-hidden bg-creme ${arco}`}>
          <Image
            src={src}
            alt="Desenho de dentro da igreja onde será a cerimônia"
            fill
            priority
            sizes="(max-width: 640px) 76vw, 300px"
            className="object-cover object-[50%_60%] mix-blend-multiply"
          />
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

  // Só os dois botões, sem nome: no celular a pílula com "Música" por
  // extenso disputava o topo com o texto do convite.
  const botao =
    "flex h-9 w-9 items-center justify-center rounded-full text-oliva transition-colors hover:bg-oliva/10 focus-visible:outline-2 focus-visible:outline-oliva";

  return (
    <div
      className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-0.5 rounded-full border border-terra/20 bg-creme-claro/85 p-0.5 shadow-sm backdrop-blur-sm sm:right-5"
      role="group"
      aria-label={`Música: ${titulo}`}
      title={titulo}
    >
      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? "Pausar a música" : "Continuar a música"}
        // Um anel lilás bem leve pulsando diz que há música tocando.
        className={`${botao} ${tocando && !mudo ? "respirar-suave" : ""}`}
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
  const secoes = props.secoes.filter(
    (id) =>
      (id !== "manual" || props.itens.length > 0) &&
      (id !== "mensagem" || props.textos.mensagem_texto.trim() !== ""),
  );

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

/**
 * Uma seção do convite. Cada filho direto entra depois do anterior
 * (.aos-poucos em globals.css), quando a seção chega à tela — e só depois
 * que a capa começou a virar.
 */
function SecaoConvite({
  fundo,
  sobretitulo,
  titulo,
  enfeites,
  children,
}: {
  fundo: "creme" | "claro";
  sobretitulo?: string;
  titulo?: string;
  enfeites?: ReactNode;
  children: ReactNode;
}) {
  const pode = useContext(PodeRevelar);
  const ref = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!pode || !el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -70px 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [pode]);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden px-6 py-16 text-center sm:py-24 ${fundo === "claro" ? "bg-creme-claro" : "bg-creme"}`}
    >
      {enfeites}
      <div className={`aos-poucos relative mx-auto flex max-w-4xl flex-col items-center ${visivel ? "revelado" : ""}`}>
        {sobretitulo && <p className="versalete titulo-serif mb-3 text-xs text-terra">{sobretitulo}</p>}
        {titulo && <h2 className="titulo-serif text-[1.85rem] leading-tight text-oliva sm:text-4xl">{titulo}</h2>}
        {titulo && <Divisor className="mt-5 mb-9 sm:mb-12" />}
        {children}
      </div>
    </section>
  );
}

/** Texto do painel com as quebras de linha que a pessoa digitou. */
function Paragrafo({ children, className = "" }: { children: string; className?: string }) {
  if (!children.trim()) return null;
  return <p className={`whitespace-pre-line ${className}`}>{children}</p>;
}

/** Dois raminhos de lavanda nos cantos de baixo de uma seção. */
function LavandasDoCanto() {
  return (
    <>
      <Brilhos />
      <div className="pointer-events-none absolute bottom-0 left-1 flex items-end sm:left-6">
        <Lavanda className="h-36 sm:h-48" duracao={6} />
        <Lavanda className="-ml-5 h-24 sm:h-32" duracao={7.5} atraso={-2.5} espelhar />
      </div>
      <div className="pointer-events-none absolute right-1 bottom-0 flex items-end sm:right-6">
        <Lavanda className="-mr-5 h-24 sm:h-32" duracao={6.8} atraso={-1} />
        <Lavanda className="h-36 sm:h-48" duracao={7} atraso={-2} espelhar />
      </div>
    </>
  );
}

function Apresentacao({ textos, versiculoVisivel, noiva, noivo, dataExtenso, fundo }: PropsSecao) {
  const versiculo = versiculoVisivel && textos.versiculo_texto.trim();
  return (
    <SecaoConvite fundo={fundo} enfeites={<LavandasDoCanto />}>
      {textos.apresentacao_titulo.trim() && (
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <Raminho lado="esquerda" className="w-10 text-oliva/70 sm:w-14" />
          <h2 className="titulo-serif text-[2.4rem] leading-none text-oliva sm:text-[3.25rem]">
            {textos.apresentacao_titulo}
          </h2>
          <Raminho lado="direita" className="w-10 text-oliva/70 sm:w-14" />
        </div>
      )}
      {textos.apresentacao_titulo.trim() && <Divisor className="mt-5" />}
      <Paragrafo className="titulo-serif mt-8 max-w-xl text-xl leading-snug text-oliva italic sm:text-2xl">
        {textos.apresentacao_texto}
      </Paragrafo>
      <p className="titulo-serif versalete mt-9 text-xl text-oliva sm:text-3xl">
        {noiva} &amp; {noivo}
      </p>
      <p className="versalete titulo-serif mt-3 text-xs text-terra">{dataExtenso}</p>
      {versiculo && <Divisor className="mt-10" />}
      {versiculo && (
        <blockquote className="titulo-serif mt-7 max-w-lg text-lg leading-relaxed whitespace-pre-line text-terra italic sm:text-xl">
          “{textos.versiculo_texto.trim()}”
        </blockquote>
      )}
      {versiculo && textos.versiculo_referencia.trim() && (
        <p className="versalete titulo-serif mt-3 text-xs text-lavanda">{textos.versiculo_referencia}</p>
      )}
    </SecaoConvite>
  );
}

function Mensagem({ textos, fundo }: PropsSecao) {
  return (
    <SecaoConvite fundo={fundo} titulo={textos.mensagem_titulo || undefined}>
      <Paragrafo className="max-w-2xl text-base leading-relaxed text-terra sm:text-lg">
        {textos.mensagem_texto}
      </Paragrafo>
    </SecaoConvite>
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
    <SecaoConvite fundo={fundo} sobretitulo={dataExtenso} titulo={textos.grande_dia_titulo || undefined}>
      <Image
        src={imagens.cerimonia}
        alt="Aquarela do interior da igreja com o monograma dos noivos"
        width={1163}
        height={1352}
        sizes="(max-width: 640px) 80vw, 360px"
        className="bordas-suaves h-auto w-full max-w-[20rem] mix-blend-multiply"
      />

      <div className="aos-poucos mt-10 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {locais.map((local, i) => {
          const endereco = [local.address, local.city].filter(Boolean).join(" — ");
          return (
            <article
              key={local.id}
              style={{ "--k": i } as CSSProperties}
              className="flex flex-col items-center rounded-sm border border-terra/20 bg-creme-claro/70 px-6 py-7"
            >
              <Icone nome={local.kind === "cerimonia" ? "igreja" : "taca"} className="h-7 w-7 text-lavanda" />
              <h3 className="versalete titulo-serif mt-3 text-xs text-terra">{ROTULOS_LOCAL[local.kind]}</h3>
              <p className="titulo-serif mt-2 text-xl leading-tight text-oliva sm:text-2xl">{local.name}</p>
              {horario(local.starts_at) && (
                <p className="titulo-serif mt-1.5 text-lg text-oliva italic">{horario(local.starts_at)}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-terra sm:text-base">{endereco || "Endereço a confirmar"}</p>
              {local.guest_info && (
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-terra/90">{local.guest_info}</p>
              )}
              {local.maps_url && (
                <a
                  href={local.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="versalete titulo-serif mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm border border-oliva/45 px-5 py-2 text-xs text-oliva transition-colors hover:bg-oliva hover:text-creme-claro"
                >
                  <Icone nome="local" className="h-4 w-4" />
                  Ver localização
                </a>
              )}
            </article>
          );
        })}
      </div>
    </SecaoConvite>
  );
}

function ContagemSecao({ textos, dataISO, fundo }: PropsSecao) {
  return (
    <SecaoConvite fundo={fundo} titulo={textos.contagem_titulo || undefined} enfeites={<Brilhos />}>
      <Contagem dataISO={dataISO} rotulosCompletos />
    </SecaoConvite>
  );
}

function Traje({ textos, trajePadrao, fundo }: PropsSecao) {
  const principal = textos.traje_1.trim() || trajePadrao;
  return (
    <SecaoConvite fundo={fundo} titulo={textos.traje_titulo || undefined}>
      <Icone nome="traje" className="h-8 w-8 text-lavanda" />
      <p className="titulo-serif mt-4 text-2xl text-oliva sm:text-3xl">{principal}</p>
      <Paragrafo className="mt-5 max-w-lg text-base leading-relaxed text-terra sm:text-lg">{textos.traje_2}</Paragrafo>
      <Paragrafo className="titulo-serif mt-3 text-lg text-oliva italic">{textos.traje_3}</Paragrafo>
    </SecaoConvite>
  );
}

function Manual({ textos, itens, fundo }: PropsSecao) {
  return (
    <SecaoConvite fundo={fundo} titulo={textos.manual_titulo || undefined}>
      <Paragrafo className="-mt-3 mb-10 max-w-xl text-base leading-relaxed text-terra sm:text-lg">
        {textos.manual_intro}
      </Paragrafo>
      <ul className="aos-poucos grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2 sm:gap-5">
        {itens.map((item, i) => (
          <li
            key={item.id}
            style={{ "--k": i } as CSSProperties}
            className="flex gap-4 rounded-sm border border-terra/15 bg-creme-claro/70 p-5 sm:p-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavanda/10 text-lavanda">
              <Icone nome={iconeDoManual(item.icon)} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="titulo-serif text-lg leading-snug text-oliva sm:text-xl">{item.title}</h3>
              <Paragrafo className="mt-1 text-sm leading-relaxed text-terra sm:text-base">{item.body}</Paragrafo>
            </div>
          </li>
        ))}
      </ul>
    </SecaoConvite>
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
    <SecaoConvite fundo={fundo} titulo={textos.confirmacao_titulo || undefined}>
      <Paragrafo className="max-w-xl text-base leading-relaxed text-terra sm:text-lg">{textos.confirmacao_texto}</Paragrafo>
      {prazo && <p className="versalete titulo-serif mt-3 text-xs text-lavanda">Responda até {prazo}</p>}
      <BotaoLink href={confirmarHref} className="respirar mt-8">
        {textos.confirmacao_botao || "Confirmar presença"}
      </BotaoLink>
    </SecaoConvite>
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
    <SecaoConvite fundo={fundo} titulo={textos.explorar_titulo || undefined}>
      <Paragrafo className="-mt-3 mb-9 max-w-xl text-base leading-relaxed text-terra sm:text-lg">
        {textos.explorar_texto}
      </Paragrafo>
      <nav aria-label="Páginas do site" className="aos-poucos grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {PAGINAS.map((p, i) => (
          <Link
            key={p.href}
            href={p.href}
            style={{ "--k": i } as CSSProperties}
            className="flex flex-col items-center rounded-sm border border-terra/20 bg-creme-claro/70 px-3 py-5 transition-colors hover:border-oliva/50 hover:bg-creme-claro"
          >
            <Icone nome={p.icone} className="h-6 w-6 text-lavanda" />
            <span className="titulo-serif mt-2.5 text-lg leading-tight text-oliva sm:text-xl">{p.titulo}</span>
            <span className="mt-1 text-sm text-terra">{p.texto}</span>
          </Link>
        ))}
      </nav>
    </SecaoConvite>
  );
}

function Final({ textos, noiva, noivo, imagens, fundo }: PropsSecao) {
  return (
    <SecaoConvite fundo={fundo} enfeites={<LavandasDoCanto />}>
      <Image
        src={imagens.final}
        alt="Desenho da igreja"
        width={1448}
        height={1086}
        sizes="(max-width: 640px) 85vw, 360px"
        className="bordas-suaves h-auto max-h-[46svh] w-auto max-w-[min(85%,22rem)] object-contain mix-blend-multiply"
      />
      <Paragrafo className="titulo-serif mt-10 max-w-md text-xl leading-snug text-oliva italic sm:text-2xl">
        {textos.final_texto}
      </Paragrafo>
      <Divisor className="mt-8" />
      {textos.final_assinatura.trim() && <p className="mt-7 text-base text-terra">{textos.final_assinatura}</p>}
      {/* A logo já traz os nomes: ela é a assinatura. */}
      <span className="sr-only">
        {noiva} &amp; {noivo}
      </span>
      {/* A logo completa, com nomes e data, é a assinatura. */}
      <Image
        src={imagens.logo}
        alt=""
        width={2000}
        height={1762}
        sizes="(max-width: 640px) 176px, 208px"
        className="mt-4 h-auto w-44 mix-blend-multiply sm:w-52"
      />
    </SecaoConvite>
  );
}
