"use client";

import Link from "next/link";
import { useState } from "react";
import { reais } from "@/lib/formato";

/**
 * Gráficos do painel.
 *
 * Sem biblioteca: os desenhos daqui são SVG escrito à mão, nas cores da
 * identidade. Uma biblioteca de gráficos traria centenas de kilobytes e um
 * visual que não é o de vocês — e quem pagaria a conta é o celular.
 *
 * As cores saem de uma paleta conferida para daltonismo (separação mínima
 * entre tons adjacentes, contraste contra o creme do painel). Mesmo assim,
 * nenhuma informação depende só da cor: todo valor tem rótulo escrito.
 */

/** Ordem fixa. Cada gráfico pega um tom; nunca se repete por acidente. */
export const TONS = [
  "#6a7d2e", // oliva
  "#8a5fb5", // lavanda
  "#c05a2c", // terracota
  "#0e9070", // verde-mar
  "#a8841a", // ocre
  "#b03a63", // rosa
  "#3a6ab0", // azul
] as const;

export type Fatia = {
  chave: string;
  rotulo: string;
  valor: number;
  /** Para onde o clique leva. Sem href nem aoClicar, a barra não é clicável. */
  href?: string;
  detalhe?: string;
};

/**
 * Barras horizontais.
 *
 * Horizontais porque os rótulos são frases — "Família da noiva", "Padrinhos
 * e madrinhas" — e na vertical elas viriam de lado ou cortadas.
 */
export function BarrasInterativas({
  itens,
  tom = 0,
  vazio = "Sem dados ainda.",
  sufixo,
  moeda = false,
  aoClicar,
}: {
  itens: Fatia[];
  /** Índice na paleta. Gráficos diferentes, tons diferentes. */
  tom?: number;
  vazio?: string;
  /** Palavra que acompanha o número: "pessoas", "convidados". */
  sufixo?: string;
  /**
   * Liga a formatação em reais. É um booleano, e não a função de formatar,
   * porque este componente roda no navegador e quem o usa quase sempre roda
   * no servidor — e função não atravessa essa fronteira. Dinheiro é guardado
   * em centavos, então sem isto "1817900" apareceria no lugar de
   * "R$ 18.179,00".
   */
  moeda?: boolean;
  /** Quando o destino está na mesma tela, em vez de em outra página. */
  aoClicar?: (chave: string) => void;
}) {
  const cor = TONS[tom % TONS.length];
  const maior = Math.max(1, ...itens.map((i) => i.valor));
  const total = itens.reduce((s, i) => s + i.valor, 0);

  if (itens.length === 0 || total === 0) {
    return (
      <p className="titulo-serif py-6 text-center text-lg text-terra italic">{vazio}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {itens.map((item) => {
        const proporcao = item.valor / maior;
        const parte = total > 0 ? Math.round((item.valor / total) * 100) : 0;

        const conteudo = (
          <>
            <span className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="titulo-serif truncate text-lg text-oliva">{item.rotulo}</span>
              <span className="shrink-0 text-base text-terra tabular-nums lining-nums">
                <span className="titulo-serif text-xl text-oliva">
                  {moeda ? reais(item.valor) : item.valor}
                </span>
                {sufixo ? ` ${sufixo}` : ""} · {parte}%
              </span>
            </span>

            {/* A trilha dá a escala: a barra cheia seria o maior valor. */}
            <span className="block h-2.5 w-full rounded-full bg-terra/15">
              <span
                className="block h-2.5 rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(2, proporcao * 100)}%`,
                  backgroundColor: cor,
                }}
              />
            </span>

            {item.detalhe && (
              <span className="mt-1.5 block text-sm text-terra/85">{item.detalhe}</span>
            )}
          </>
        );

        return (
          <li key={item.chave}>
            {aoClicar ? (
              <button
                type="button"
                onClick={() => aoClicar(item.chave)}
                className="block w-full rounded-sm px-1 py-1 text-left transition-colors hover:bg-oliva/5 focus-visible:bg-oliva/5"
              >
                {conteudo}
              </button>
            ) : item.href ? (
              <Link
                href={item.href}
                className="block rounded-sm px-1 py-1 transition-colors hover:bg-oliva/5 focus-visible:bg-oliva/5"
              >
                {conteudo}
              </Link>
            ) : (
              <span className="block px-1 py-1">{conteudo}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Rosca de três pedaços, para uma pergunta de três respostas.
 *
 * A rosca só se justifica quando as partes somam um todo que importa — aqui,
 * "todo mundo que respondeu". Cada pedaço leva à lista daquele pedaço, e o
 * miolo guarda o total, que é o número que os noivos procuram primeiro.
 */
export function Rosca({
  itens,
  total,
  legendaCentro,
  aoClicar,
}: {
  itens: Fatia[];
  total: number;
  legendaCentro: string;
  /** Com isso, a fatia vira botão em vez de link. */
  aoClicar?: (chave: string) => void;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);

  const soma = itens.reduce((s, i) => s + i.valor, 0);
  const R = 52;
  const CIRC = 2 * Math.PI * R;

  if (soma === 0) {
    return (
      <p className="titulo-serif py-6 text-center text-lg text-terra italic">
        Ninguém respondeu ainda.
      </p>
    );
  }

  let acumulado = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox="0 0 140 140"
        className="h-40 w-40 shrink-0 -rotate-90"
        role="img"
        aria-label={`${legendaCentro}: ${itens.map((i) => `${i.rotulo}, ${i.valor}`).join("; ")}`}
      >
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-terra)" strokeOpacity="0.15" strokeWidth="16" />
        {itens.map((item, i) => {
          const fracao = item.valor / soma;
          // 2px de respiro entre os pedaços: sem isso, dois tons vizinhos
          // encostam e viram um só.
          const traco = Math.max(0, fracao * CIRC - 2);
          const deslocamento = -acumulado * CIRC;
          acumulado += fracao;

          return (
            <circle
              key={item.chave}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={TONS[i % TONS.length]}
              strokeWidth={ativo === item.chave ? 20 : 16}
              strokeDasharray={`${traco} ${CIRC - traco}`}
              strokeDashoffset={deslocamento}
              strokeLinecap="butt"
              className="transition-[stroke-width] duration-200"
            />
          );
        })}
      </svg>

      <ul className="w-full space-y-2">
        <li className="mb-3">
          <span className="titulo-serif block text-3xl text-oliva tabular-nums lining-nums">
            {total}
          </span>
          <span className="versalete block text-xs text-terra">{legendaCentro}</span>
        </li>

        {itens.map((item, i) => {
          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: TONS[i % TONS.length] }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-oliva">{item.rotulo}</span>
                {item.detalhe && (
                  <span className="block text-xs text-terra/90">{item.detalhe}</span>
                )}
              </span>
              <span className="titulo-serif shrink-0 text-lg text-oliva tabular-nums lining-nums">
                {item.valor}
              </span>
            </>
          );

          return (
            <li
              key={item.chave}
              onMouseEnter={() => setAtivo(item.chave)}
              onMouseLeave={() => setAtivo(null)}
            >
              {aoClicar ? (
                <button
                  type="button"
                  onClick={() => aoClicar(item.chave)}
                  onFocus={() => setAtivo(item.chave)}
                  onBlur={() => setAtivo(null)}
                  className="flex w-full items-start gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-oliva/5 focus-visible:bg-oliva/5"
                >
                  {conteudo}
                </button>
              ) : item.href ? (
                <Link
                  href={item.href}
                  onFocus={() => setAtivo(item.chave)}
                  onBlur={() => setAtivo(null)}
                  className="flex items-start gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-oliva/5 focus-visible:bg-oliva/5"
                >
                  {conteudo}
                </Link>
              ) : (
                <span className="flex items-start gap-3 px-2 py-2">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Uma barra só, dividida em pedaços: para "de que é feito este total".
 *
 * Serve ao funil de fornecedores, ao status das tarefas e ao orçamento:
 * a barra mostra a proporção de relance, e a legenda embaixo dá o número
 * e leva ao recorte. Um pedaço nunca fica com menos de 1,5% — senão some.
 */
export function BarraEmpilhada({
  itens,
  total,
  sufixo,
  moeda = false,
  vazio = "Sem dados ainda.",
}: {
  itens: Fatia[];
  /** Quando os pedaços não somam o todo (ex.: orçamento), o todo vem daqui. */
  total?: number;
  sufixo?: string;
  moeda?: boolean;
  vazio?: string;
}) {
  const soma = itens.reduce((s, i) => s + i.valor, 0);
  const todo = Math.max(total ?? 0, soma);

  if (todo === 0) {
    return (
      <p className="titulo-serif py-6 text-center text-lg text-terra italic">{vazio}</p>
    );
  }

  const formatar = (v: number) => (moeda ? reais(v) : `${v}${sufixo ? ` ${sufixo}` : ""}`);

  return (
    <div>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-terra/15"
        role="img"
        aria-label={itens.map((i) => `${i.rotulo}: ${formatar(i.valor)}`).join("; ")}
      >
        {itens.map((item, i) =>
          item.valor > 0 ? (
            <span
              key={item.chave}
              className="block h-full transition-[width] duration-500"
              style={{
                width: `${Math.max(1.5, (item.valor / todo) * 100)}%`,
                backgroundColor: TONS[i % TONS.length],
              }}
            />
          ) : null,
        )}
      </div>

      {/* Valores em reais são largos: uma coluna só, senão o rótulo trunca. */}
      <ul className={`mt-3 grid grid-cols-1 gap-x-4 ${moeda ? "" : "sm:grid-cols-2"}`}>
        {itens.map((item, i) => {
          const parte = Math.round((item.valor / todo) * 100);
          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className="mt-2 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: TONS[i % TONS.length] }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-oliva">{item.rotulo}</span>
                {item.detalhe && (
                  <span className="block text-xs text-terra/90">{item.detalhe}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-terra tabular-nums lining-nums">
                <span className="titulo-serif text-lg text-oliva">{formatar(item.valor)}</span>
                {" · "}
                {parte}%
              </span>
            </>
          );
          return (
            <li key={item.chave}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-start gap-3 rounded-sm px-2 py-1.5 transition-colors hover:bg-oliva/5 focus-visible:bg-oliva/5"
                >
                  {conteudo}
                </Link>
              ) : (
                <span className="flex items-start gap-3 px-2 py-1.5">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type Semana = {
  /** "22/09" — a segunda-feira daquela semana. */
  rotulo: string;
  valor: number;
};

/**
 * Colunas por semana: o ritmo de algo no tempo (o mural, por exemplo).
 *
 * Vertical, ao contrário das outras, porque aqui o eixo é o tempo e os
 * rótulos são curtos. É HTML, não SVG: assim o texto fica no tamanho da
 * página em qualquer largura, em vez de encolher junto com o desenho.
 */
export function BarrasSemanais({
  semanas,
  tom = 0,
  legenda,
}: {
  semanas: Semana[];
  tom?: number;
  /** O que está sendo contado — vai para o leitor de tela. */
  legenda: string;
}) {
  const cor = TONS[tom % TONS.length];
  const maior = Math.max(1, ...semanas.map((s) => s.valor));

  return (
    <div
      role="img"
      aria-label={`${legenda}: ${semanas.map((s) => `semana de ${s.rotulo}, ${s.valor}`).join("; ")}`}
      className="flex w-full max-w-xl items-end gap-1.5 sm:gap-3"
    >
      {semanas.map((s) => (
        <div key={s.rotulo} className="flex min-w-0 flex-1 flex-col items-center">
          {/* O número senta em cima da própria coluna: a coluna mais alta
              ocupa 80% da altura e deixa o resto para ele. */}
          <span className="flex h-32 w-full flex-col items-center justify-end">
            <span className="text-sm font-medium text-oliva tabular-nums lining-nums">{s.valor}</span>
            <span
              className="mt-1 block w-full rounded-t-sm transition-[height] duration-500"
              style={{
                height: s.valor === 0 ? "2px" : `${Math.max(3, (s.valor / maior) * 80)}%`,
                backgroundColor: s.valor === 0 ? "var(--color-terra)" : cor,
                opacity: s.valor === 0 ? 0.25 : 1,
              }}
            />
          </span>
          <span className="mt-1.5 w-full border-t border-terra/25 pt-1.5 text-center text-xs text-terra tabular-nums lining-nums">
            {s.rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}
