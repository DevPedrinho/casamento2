"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icone } from "@/components/Icones";

/**
 * Música da página Nossa História.
 *
 * O <audio> vive no provedor e é único: o botão dentro da seção e a
 * pílula que acompanha a rolagem comandam o mesmo som, então trocar de
 * capítulo — ou usar um controle e depois o outro — nunca reinicia a
 * música.
 *
 * Navegador nenhum deixa tocar áudio sem um clique, então nem tentamos:
 * a música só começa quando a pessoa manda.
 */

type Contexto = {
  tocando: boolean;
  carregando: boolean;
  comecou: boolean;
  titulo: string;
  artista?: string;
  volume: number;
  ajustarVolume: (v: number) => void;
  alternar: () => void;
  /** O controle de dentro da seção avisa quando está na tela, para a
   *  pílula flutuante não aparecer em duplicata. */
  registrarControleVisivel: (visivel: boolean) => void;
};

const ContextoMusica = createContext<Contexto | null>(null);

export function useMusica() {
  return useContext(ContextoMusica);
}

export function ProvedorMusica({
  arquivo,
  titulo,
  artista,
  children,
}: {
  arquivo: string;
  titulo: string;
  artista?: string;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [comecou, setComecou] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [erro, setErro] = useState(false);
  const [controleVisivel, setControleVisivel] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const alternar = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setTocando(false);
      return;
    }

    setCarregando(true);
    audio
      .play()
      .then(() => {
        setTocando(true);
        setComecou(true);
      })
      .catch(() => {
        // Arquivo ausente, formato que o aparelho não abre ou bloqueio
        // do navegador: some com o player em vez de deixar um botão morto.
        setErro(true);
      })
      .finally(() => setCarregando(false));
  }, []);

  const registrarControleVisivel = useCallback(
    (visivel: boolean) => setControleVisivel(visivel),
    [],
  );

  // Sem arquivo (ou com arquivo quebrado) não há player nenhum.
  const disponivel = Boolean(arquivo) && !erro;

  const valor: Contexto = {
    tocando,
    carregando,
    comecou,
    titulo,
    artista,
    volume,
    ajustarVolume: setVolume,
    alternar,
    registrarControleVisivel,
  };

  return (
    <ContextoMusica.Provider value={disponivel ? valor : null}>
      {children}

      {disponivel && (
        <>
          <audio
            ref={audioRef}
            src={arquivo}
            loop
            preload="none"
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onWaiting={() => setCarregando(true)}
            onPlaying={() => setCarregando(false)}
            onError={() => setErro(true)}
          />

          {/* A pílula só entra quando o controle da seção sai da tela. */}
          {comecou && !controleVisivel && <PilulaFlutuante />}
        </>
      )}
    </ContextoMusica.Provider>
  );
}

/** Play/pause com nome da música, para ficar dentro de uma seção. */
export function ControleMusica({ className = "" }: { className?: string }) {
  const musica = useMusica();
  const ref = useRef<HTMLDivElement>(null);
  const registrar = musica?.registrarControleVisivel;

  useEffect(() => {
    const el = ref.current;
    if (!el || !registrar) return;

    const observador = new IntersectionObserver(
      ([entrada]) => registrar(entrada.isIntersecting),
      { threshold: 0 },
    );
    observador.observe(el);

    return () => {
      observador.disconnect();
      registrar(false);
    };
  }, [registrar]);

  if (!musica) return null;

  return (
    <div ref={ref} className={`flex justify-center ${className}`}>
      <div className="flex w-full max-w-md items-center gap-4 rounded-full border border-terra/25 bg-creme-claro px-4 py-3 shadow-sm sm:px-5">
        <BotaoTocar />

        <div className="min-w-0 flex-1 text-left">
          <p className="titulo-serif truncate text-base text-oliva">
            {musica.comecou ? musica.titulo : "Ouvir nossa música"}
          </p>
          <p className="truncate text-xs text-terra">
            {musica.comecou
              ? (musica.artista ?? "Tocando agora")
              : `${musica.titulo}${musica.artista ? ` — ${musica.artista}` : ""}`}
          </p>
        </div>

        <ControleVolume />
      </div>
    </div>
  );
}

/** A mesma música seguindo a rolagem, quando o controle da seção sai da tela. */
function PilulaFlutuante() {
  const musica = useMusica();
  if (!musica) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 mb-[env(safe-area-inset-bottom)] -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-full border border-terra/25 bg-creme-claro px-4 py-3 shadow-lg sm:px-5">
        <BotaoTocar />
        <div className="min-w-0 max-w-40 sm:max-w-56">
          <p className="titulo-serif truncate text-sm text-oliva">{musica.titulo}</p>
          {musica.artista && <p className="truncate text-xs text-terra">{musica.artista}</p>}
        </div>
        <ControleVolume />
      </div>
    </div>
  );
}

function BotaoTocar() {
  const musica = useMusica();
  if (!musica) return null;

  const { tocando, carregando, alternar } = musica;

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tocando ? "Pausar a música" : "Tocar a música"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oliva text-creme-claro transition-colors hover:bg-oliva-escuro"
    >
      {carregando ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-creme-claro/40 border-t-creme-claro"
        />
      ) : tocando ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <rect x="7" y="5" width="3.5" height="14" rx="1" />
          <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-0.5" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      )}
    </button>
  );
}

function ControleVolume() {
  const musica = useMusica();
  if (!musica) return null;

  return (
    <label className="hidden items-center gap-2 sm:flex">
      <span className="sr-only">Volume</span>
      <Icone nome="volume" className="h-4 w-4 text-terra/60" />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={musica.volume}
        onChange={(e) => musica.ajustarVolume(Number(e.target.value))}
        className="w-20 accent-[var(--color-oliva)]"
      />
    </label>
  );
}
