import { useId, type CSSProperties } from "react";

/**
 * O que se mexe no convite: raminhos de lavanda balançando, estrelinhas
 * cintilando nas margens e pétalas de rosa lilás caindo devagar.
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
// Só nas faixas laterais e nas quinas: o brilho nunca passa por cima de
// texto, logo ou botão, que ficam no miolo.
const ESTRELAS = [
  { top: 6, left: 4, t: 18, d: 0 }, { top: 10, left: 90, t: 16, d: 1.1 }, { top: 22, left: 8, t: 14, d: 2.3 },
  { top: 27, left: 92, t: 19, d: 0.6 }, { top: 38, left: 3, t: 16, d: 1.8 }, { top: 44, left: 89, t: 14, d: 2.9 },
  { top: 53, left: 7, t: 18, d: 0.3 }, { top: 58, left: 93, t: 17, d: 1.5 }, { top: 67, left: 4, t: 14, d: 2.6 },
  { top: 71, left: 90, t: 16, d: 0.9 }, { top: 15, left: 95, t: 12, d: 3.2 }, { top: 32, left: 2, t: 12, d: 2 },
];

// Pétalas: onde começam (% da largura), quanto balançam e o ritmo.
const PETALAS = [
  { left: 8, d: 0, t: 14, dx: 26, w: 13 }, { left: 72, d: 3, t: 17, dx: -22, w: 11 },
  { left: 34, d: 6.5, t: 15, dx: 18, w: 14 }, { left: 88, d: 9, t: 13, dx: -28, w: 12 },
  { left: 20, d: 11, t: 18, dx: 20, w: 10 }, { left: 55, d: 1.5, t: 16, dx: -18, w: 12 },
  { left: 94, d: 5, t: 14, dx: -16, w: 11 },
];

/** Uma pétala de rosa lilás: gota arredondada, degradê suave e nervura. */
function Petala({ style, id }: { style: CSSProperties; id: string }) {
  return (
    <svg viewBox="0 0 20 28" className="cair absolute top-0" style={style} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6dcef" />
          <stop offset="1" stopColor="#b6a1cb" />
        </linearGradient>
      </defs>
      <path d="M10 1C17 6 19.5 14.5 15.5 21.5 13.2 25.6 6.8 25.6 4.5 21.5 0.5 14.5 3 6 10 1Z" fill={`url(#${id})`} />
      <path d="M10 5C10.6 11 10.4 17 9.4 22" stroke="#9d8bb0" strokeWidth="0.7" fill="none" opacity="0.45" strokeLinecap="round" />
    </svg>
  );
}

/** Estrelinhas cintilando nas margens e pétalas caindo, na área do pai (que deve ser relative). */
export function Brilhos({ densidade = 1, className = "" }: { densidade?: 1 | 2; className?: string }) {
  const estrelas = densidade === 2 ? ESTRELAS : ESTRELAS.filter((_, i) => i % 2 === 0);
  const petalas = densidade === 2 ? PETALAS : PETALAS.slice(0, 4);
  // O id do degradê precisa ser único por página: cada Brilhos ganha o seu.
  const base = useId().replace(/:/g, "");
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
      {petalas.map((p, i) => (
        <Petala
          key={i}
          id={`petala-${base}-${i}`}
          style={{ left: `${p.left}%`, width: p.w, height: p.w * 1.4, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, "--dx": `${p.dx}px` } as CSSProperties}
        />
      ))}
    </div>
  );
}
