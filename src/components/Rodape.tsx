import Image from "next/image";
import { CASAMENTO } from "@/lib/config";
import { Divisor } from "./Ornamentos";

export function Rodape() {
  return (
    <footer className="relative overflow-hidden border-t border-terra/15 bg-creme-claro px-5 py-16 text-center">
      <Image
        src="/img/ramo-floral.png"
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 bottom-0 w-40 opacity-15 sm:w-52"
      />
      <Image
        src="/img/ramo-floral-espelhado.png"
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-0 w-40 opacity-15 sm:w-52"
      />

      <div className="relative mx-auto max-w-2xl">
        <p className="versalete titulo-serif text-xs text-oliva">{CASAMENTO.lema}</p>
        <Divisor className="my-6" />
        <p className="titulo-serif text-2xl text-oliva sm:text-3xl">
          {CASAMENTO.noiva} &amp; {CASAMENTO.noivo}
        </p>
        <p className="versalete mt-3 text-sm text-terra">{CASAMENTO.dataCurta}</p>
        <p className="titulo-serif mt-8 text-base text-terra italic">{CASAMENTO.frase}</p>
      </div>
    </footer>
  );
}
