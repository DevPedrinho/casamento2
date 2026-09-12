"use client";

import { useEffect, useState } from "react";
import { DATA_CASAMENTO } from "@/lib/config";

type Restante = { dias: number; horas: number; minutos: number; segundos: number };

function calcular(alvo: Date): Restante | null {
  const diff = alvo.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    dias: Math.floor(diff / 86_400_000),
    horas: Math.floor((diff / 3_600_000) % 24),
    minutos: Math.floor((diff / 60_000) % 60),
    segundos: Math.floor((diff / 1000) % 60),
  };
}

/** A data vem do painel; sem ela, vale a do config. */
export function Contagem({ dataISO }: { dataISO?: string }) {
  const alvo = dataISO ? new Date(dataISO) : DATA_CASAMENTO;

  // Começa em null para o HTML do servidor bater com o do cliente; o
  // relógio real só entra depois da hidratação.
  const [restante, setRestante] = useState<Restante | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setRestante(calcular(alvo));
    setPronto(true);
    const id = setInterval(() => setRestante(calcular(alvo)), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  if (!pronto) {
    return <div className="h-24" aria-hidden="true" />;
  }

  if (!restante) {
    return (
      <p className="titulo-serif text-center text-2xl text-oliva">
        Hoje é o grande dia. Que alegria ter você aqui!
      </p>
    );
  }

  const blocos = [
    { valor: restante.dias, rotulo: restante.dias === 1 ? "dia" : "dias" },
    { valor: restante.horas, rotulo: "horas" },
    { valor: restante.minutos, rotulo: "min" },
    { valor: restante.segundos, rotulo: "seg" },
  ];

  return (
    <div
      className="flex items-start justify-center gap-3 sm:gap-8"
      role="timer"
      aria-label={`Faltam ${restante.dias} dias para o casamento`}
    >
      {blocos.map((bloco, i) => (
        <div key={bloco.rotulo} className="flex items-start gap-3 sm:gap-8">
          {i > 0 && <span className="titulo-serif mt-1 text-2xl text-terra/40 sm:text-3xl">·</span>}
          <div className="min-w-14 text-center sm:min-w-20">
            <span className="titulo-serif block text-3xl leading-none text-oliva tabular-nums lining-nums sm:text-5xl">
              {String(bloco.valor).padStart(2, "0")}
            </span>
            <span className="versalete mt-2 block text-xs text-terra sm:text-xs">
              {bloco.rotulo}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
