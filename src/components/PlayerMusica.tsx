"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/Icones";

/**
 * Player fixo da timeline.
 *
 * Navegador nenhum deixa tocar áudio sem interação, então nem tentamos:
 * mostramos o convite "Ouvir nossa música" e só depois do clique a música
 * começa. O <audio> vive aqui e não é remontado quando o capítulo muda —
 * por isso a música não reinicia ao trocar de ano.
 */
export function PlayerMusica({
  arquivo,
  titulo,
  artista,
}: {
  arquivo: string;
  titulo: string;
  artista?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [comecou, setComecou] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  async function alternar() {
    const audio = audioRef.current;
    if (!audio) return;

    if (tocando) {
      audio.pause();
      setTocando(false);
      return;
    }

    try {
      await audio.play();
      setTocando(true);
      setComecou(true);
    } catch {
      // Autoplay bloqueado ou arquivo ausente.
      setErro(true);
    }
  }

  if (!arquivo) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 mb-[env(safe-area-inset-bottom)] -translate-x-1/2">
      <audio
        ref={audioRef}
        src={arquivo}
        loop
        preload="none"
        onEnded={() => setTocando(false)}
        onError={() => setErro(true)}
      />

      {erro ? null : !comecou ? (
        <button
          type="button"
          onClick={alternar}
          className="titulo-serif flex items-center gap-3 rounded-full border border-terra/25 bg-creme-claro px-6 py-3.5 text-base text-oliva shadow-lg transition-transform hover:scale-105"
        >
          <span aria-hidden="true">🎵</span>
          Ouvir nossa música
        </button>
      ) : (
        <div className="flex items-center gap-4 rounded-full border border-terra/25 bg-creme-claro px-5 py-3 shadow-lg">
          <button
            type="button"
            onClick={alternar}
            aria-label={tocando ? "Pausar" : "Tocar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oliva text-creme-claro"
          >
            {tocando ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="7" y="5" width="3.5" height="14" rx="1" />
                <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            )}
          </button>

          <div className="min-w-0">
            <p className="titulo-serif truncate text-sm text-oliva">{titulo}</p>
            {artista && <p className="truncate text-xs text-terra">{artista}</p>}
          </div>

          <label className="hidden items-center gap-2 sm:flex">
            <span className="sr-only">Volume</span>
            <Icone nome="volume" className="h-4 w-4 text-terra/60" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-[var(--color-oliva)]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
