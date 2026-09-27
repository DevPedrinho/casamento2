import type { CSSProperties } from "react";

/**
 * O que se mexe no convite: raminhos de lavanda balançando, estrelinhas
 * cintilando e pontinhos de luz subindo devagar.
 *
 * Tudo é CSS (keyframes em globals.css, só transform e opacity — não pesa
 * no celular), decorativo e fora do caminho do dedo. Com "reduzir
 * movimento" ligado no aparelho, a regra global de globals.css para tudo.
 */

/** Um raminho de lavanda desenhado: haste oliva, botões em tons de lilás. */
export function Lavanda({
  className = "",
  espelhar = false,
  duracao = 6,
  atraso = 0,
}: {
  className?: string;
  espelhar?: boolean;
  /** Segundos de um vai e vem completo. */
  duracao?: number;
  atraso?: number;
}) {
  // Os botões sobem pela haste, cada vez menores, como na flor de verdade.
  const botoes = [
    { y: 18, r: 3.2 }, { y: 25, r: 3.6 }, { y: 32, r: 4 }, { y: 40, r: 4.3 },
    { y: 48, r: 4.5 }, { y: 57, r: 4.6 }, { y: 66, r: 4.6 }, { y: 76, r: 4.4 },
  ];
  const tons = ["#b7a8c4", "#9d8bb0", "#8a76a0"];

  return (
    <span
      aria-hidden="true"
      className={`balancar pointer-events-none block ${className}`}
      style={{ animationDuration: `${duracao}s`, animationDelay: `${atraso}s` } as CSSProperties}
    >
      <svg viewBox="0 0 60 200" className="h-full w-auto" style={espelhar ? { transform: "scaleX(-1)" } : undefined}>
        {/* haste e folhas */}
        <path d="M30 200 C 29 150, 31 110, 30 14" stroke="#7d8159" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M30 150 C 18 138, 12 124, 13 108 C 24 118, 29 132, 30 150Z" fill="#7d8159" opacity="0.55" />
        <path d="M30 128 C 42 118, 47 104, 45 90 C 36 100, 31 112, 30 128Z" fill="#666a46" opacity="0.5" />
        <path d="M30 172 C 44 164, 50 152, 49 140 C 39 148, 33 158, 30 172Z" fill="#7d8159" opacity="0.4" />
        {/* botões da flor, dos dois lados da haste */}
        {botoes.map((b, i) => (
          <g key={i}>
            <ellipse cx={30 - b.r * 0.9} cy={b.y} rx={b.r * 0.75} ry={b.r} fill={tons[i % 3]} transform={`rotate(-18 ${30 - b.r * 0.9} ${b.y})`} />
            <ellipse cx={30 + b.r * 0.9} cy={b.y + 3} rx={b.r * 0.75} ry={b.r} fill={tons[(i + 1) % 3]} transform={`rotate(18 ${30 + b.r * 0.9} ${b.y + 3})`} />
          </g>
        ))}
        <ellipse cx="30" cy="11" rx="2.4" ry="3.4" fill="#b7a8c4" />
      </svg>
    </span>
  );
}

/** Estrela de quatro pontas, o brilho clássico. */
function Estrela({ style }: { style: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className="cintilar absolute" style={style} aria-hidden="true">
      <path
        d="M12 0C12.9 8 16 11.1 24 12 16 12.9 12.9 16 12 24 11.1 16 8 12.9 0 12 8 11.1 11.1 8 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Posições fixas (em %), para o servidor e o navegador desenharem igual.
const ESTRELAS = [
  { top: 7, left: 14, t: 20, d: 0 }, { top: 12, left: 84, t: 16, d: 1.1 }, { top: 24, left: 8, t: 15, d: 2.3 },
  { top: 30, left: 91, t: 19, d: 0.6 }, { top: 44, left: 5, t: 17, d: 1.8 }, { top: 49, left: 94, t: 15, d: 2.9 },
  { top: 61, left: 12, t: 18, d: 0.3 }, { top: 66, left: 86, t: 20, d: 1.5 }, { top: 78, left: 20, t: 15, d: 2.6 },
  { top: 83, left: 78, t: 17, d: 0.9 }, { top: 18, left: 50, t: 14, d: 3.2 }, { top: 91, left: 50, t: 16, d: 2 },
];

const LUZES = [
  { left: 16, d: 0, t: 13, dx: 18 }, { left: 32, d: 4, t: 15, dx: -14 }, { left: 50, d: 8, t: 12, dx: 10 },
  { left: 67, d: 2, t: 16, dx: -18 }, { left: 83, d: 6, t: 13, dx: 14 }, { left: 96, d: 10, t: 15, dx: -10 },
];

/** Estrelinhas cintilando e luz subindo, espalhadas pela área do pai (que deve ser relative). */
export function Brilhos({ densidade = 1, className = "" }: { densidade?: 1 | 2; className?: string }) {
  const estrelas = densidade === 2 ? ESTRELAS : ESTRELAS.filter((_, i) => i % 2 === 0);
  const luzes = densidade === 2 ? LUZES : LUZES.slice(0, 3);
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {estrelas.map((e, i) => (
        <Estrela
          key={i}
          style={{
            top: `${e.top}%`,
            left: `${e.left}%`,
            width: e.t,
            height: e.t,
            animationDelay: `${e.d}s`,
            color: i % 3 === 0 ? "var(--color-oliva-claro)" : "var(--color-lavanda-claro)",
            // Um halo claro em volta: é o que faz a estrelinha parecer luz.
            filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.95))",
          }}
        />
      ))}
      {luzes.map((l, i) => (
        <span
          key={i}
          className="flutuar absolute bottom-0 block h-1.5 w-1.5 rounded-full bg-lavanda-claro"
          style={{ left: `${l.left}%`, animationDelay: `${l.d}s`, animationDuration: `${l.t}s`, "--dx": `${l.dx}px` } as CSSProperties}
        />
      ))}
    </div>
  );
}
