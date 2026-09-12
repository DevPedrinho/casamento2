import type { MomentoDoDia } from "@/lib/tipos";
import { Coracao } from "@/components/Ornamentos";

/**
 * O cronograma que os convidados veem — só os momentos marcados como
 * públicos no painel. Mesmo desenho da linha do tempo da nossa história:
 * um fio costurando as horas.
 */
export function CronogramaPublico({ momentos }: { momentos: MomentoDoDia[] }) {
  if (momentos.length === 0) return null;

  return (
    <ol className="relative mx-auto max-w-2xl">
      <span
        aria-hidden="true"
        className="absolute left-[4.25rem] top-2 bottom-2 w-px bg-creme/25 sm:left-24"
      />

      {momentos.map((momento) => (
        <li key={momento.id} className="relative flex gap-5 pb-9 last:pb-0 sm:gap-7">
          <span className="titulo-serif w-14 shrink-0 pt-0.5 text-right text-xl text-creme-claro tabular-nums lining-nums sm:w-20 sm:text-2xl">
            {momento.starts_at.slice(0, 5)}
          </span>

          <span
            aria-hidden="true"
            className="relative z-10 mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-oliva ring-1 ring-creme/30"
          >
            <Coracao className="w-2.5 text-lavanda-claro" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="titulo-serif block text-xl text-creme-claro sm:text-2xl">
              {momento.title}
            </span>
            {momento.description && (
              <span className="mt-1 block text-base leading-relaxed text-creme/75">
                {momento.description}
              </span>
            )}
            {momento.location && (
              <span className="versalete mt-1.5 block text-xs text-creme/60">
                {momento.location}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
