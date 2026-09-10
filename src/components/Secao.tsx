"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Divisor } from "./Ornamentos";

/**
 * Bloco de conteúdo com título centralizado e uma entrada suave quando
 * a seção chega à área visível.
 */
export function Secao({
  id,
  sobretitulo,
  titulo,
  children,
  className = "",
  fundo = "creme",
}: {
  id?: string;
  sobretitulo?: string;
  titulo?: string;
  children: ReactNode;
  className?: string;
  fundo?: "creme" | "claro" | "oliva";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      // threshold precisa ser 0: uma fração exigiria que N% da seção coubesse
      // na tela, e uma lista longa no celular passa de 7000px — 12% disso é
      // mais alto que o aparelho, então o observador nunca disparava e o
      // conteúdo ficava invisível. O rootMargin é que dá o respiro da entrada.
      { threshold: 0, rootMargin: "0px 0px -60px 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const fundos = {
    creme: "bg-creme",
    claro: "bg-creme-claro",
    oliva: "bg-oliva text-creme-claro",
  } as const;

  return (
    <section
      id={id}
      ref={ref}
      className={`${fundos[fundo]} px-5 py-20 sm:py-28 ${className}`}
    >
      <div className={`mx-auto max-w-5xl revelar ${visivel ? "revelado" : ""}`}>
        {(sobretitulo || titulo) && (
          <header className="mb-12 text-center sm:mb-16">
            {sobretitulo && (
              <p
                className={`versalete titulo-serif mb-4 text-sm sm:text-xs ${
                  fundo === "oliva" ? "text-creme/70" : "text-terra"
                }`}
              >
                {sobretitulo}
              </p>
            )}
            {titulo && (
              <h2
                className={`titulo-serif text-3xl leading-tight sm:text-4xl md:text-5xl ${
                  fundo === "oliva" ? "text-creme-claro" : "text-oliva"
                }`}
              >
                {titulo}
              </h2>
            )}
            <Divisor className="mt-7" />
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
