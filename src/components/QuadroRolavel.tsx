"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Casca de rolagem horizontal com a barra em cima.
 *
 * Num quadro de colunas altas, a barra nativa fica lá embaixo, fora da
 * vista. Aqui uma faixa fina acima do quadro mostra a barra: ela tem um
 * espaçador da largura exata do conteúdo, e os dois rolam juntos. O quadro
 * real esconde a própria barra para não aparecer duas.
 */
export function QuadroRolavel({ children }: { children: ReactNode }) {
  const faixa = useRef<HTMLDivElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  /** Trava contra o eco: um rola, o outro acompanha, e para por aí. */
  const espelhando = useRef(false);

  useEffect(() => {
    const alvo = conteudo.current;
    const caixa = quadro.current;
    if (!alvo || !caixa) return;
    const medir = () => setLargura(alvo.scrollWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  function acompanhar(de: HTMLDivElement | null, para: HTMLDivElement | null) {
    if (!de || !para || espelhando.current) return;
    espelhando.current = true;
    para.scrollLeft = de.scrollLeft;
    espelhando.current = false;
  }

  return (
    <div className="-mx-6 sm:-mx-8">
      <div
        ref={faixa}
        aria-hidden="true"
        onScroll={() => acompanhar(faixa.current, quadro.current)}
        // .barra-topo (globals.css): barra sempre visível e nas cores da casa,
        // que no Mac sumiria até alguém rolar. No toque a faixa não existe:
        // celular e tablet não desenham barra nenhuma, e o dedo já arrasta.
        className="barra-topo overflow-x-auto px-6 pb-2 sm:px-8 [@media(hover:none)]:hidden"
      >
        <div style={{ width: largura }} className="h-px" />
      </div>
      <div
        ref={quadro}
        onScroll={() => acompanhar(quadro.current, faixa.current)}
        className="overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {/* Sem largura própria: um bloco comum enche o quadro (permitindo as
            colunas crescerem para preencher) e ainda assim deixa o
            scrollWidth medir corretamente quando as colunas transbordam. */}
        <div ref={conteudo}>
          {children}
        </div>
      </div>
    </div>
  );
}
