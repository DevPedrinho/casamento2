/**
 * Ornamentos tipográficos que aparecem na IDV: as linhas finas com o
 * coração lilás no meio, e o raminho de folhas dos cantos do logo.
 */

export function Coracao({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 21.3 3.6 12.6C1.1 10 1.2 5.9 3.9 3.5a5.7 5.7 0 0 1 8.1.5 5.7 5.7 0 0 1 8.1-.5c2.7 2.4 2.8 6.5.3 9.1L12 21.3Z" />
    </svg>
  );
}

/** Linha — coração — linha, o divisor usado acima e abaixo dos nomes. */
export function Divisor({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-terra/60 sm:w-24" />
      <Coracao className="w-3.5 text-lavanda" />
      <span className="h-px w-16 bg-terra/60 sm:w-24" />
    </div>
  );
}

/** Raminho de folhas — espelhado pelo `lado` para emoldurar um título. */
export function Raminho({
  lado = "esquerda",
  className = "",
}: {
  lado?: "esquerda" | "direita";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 32"
      aria-hidden="true"
      className={className}
      style={lado === "direita" ? { transform: "scaleX(-1)" } : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M2 26c14 4 30-1 40-12" />
      <path d="M20 22c-2-5 0-9 5-11 1 5-1 9-5 11Z" />
      <path d="M31 17c-3-4-2-9 2-12 2 5 1 9-2 12Z" />
      <path d="M14 25c-4-3-5-7-3-11 4 3 5 7 3 11Z" />
      <path d="M42 14c-4-3-4-8-1-11 3 3 4 8 1 11Z" />
      <path d="M52 10c1-5 5-8 10-8-1 5-5 8-10 8Z" />
    </svg>
  );
}

/** Faixa decorativa em versalete, como o "AMOR QUE ACOLHE" do logo. */
export function FaixaVersalete({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <Raminho lado="esquerda" className="hidden w-12 text-oliva/70 sm:block" />
      <span className="versalete text-oliva titulo-serif text-xs sm:text-sm">{children}</span>
      <Raminho lado="direita" className="hidden w-12 text-oliva/70 sm:block" />
    </div>
  );
}
