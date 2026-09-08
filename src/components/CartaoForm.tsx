import Image from "next/image";
import type { ReactNode } from "react";
import { Divisor } from "./Ornamentos";

/** Moldura padrão das páginas de formulário (entrar, cadastrar, confirmar). */
export function CartaoForm({
  sobretitulo,
  titulo,
  descricao,
  children,
  rodape,
  largura = "estreito",
}: {
  sobretitulo?: string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "estreito" | "largo";
}) {
  return (
    <div className="relative overflow-hidden px-5 py-16 sm:py-24">
      <Image
        src="/img/ramo-floral.png"
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-20 w-48 opacity-15 sm:w-64"
      />
      <div
        className={`relative mx-auto ${largura === "largo" ? "max-w-2xl" : "max-w-md"} rounded-sm border border-terra/20 bg-creme-claro px-6 py-10 shadow-sm sm:px-10`}
      >
        <div className="text-center">
          {sobretitulo && (
            <p className="versalete titulo-serif text-xs text-terra">{sobretitulo}</p>
          )}
          <h1 className="titulo-serif mt-3 text-3xl text-oliva sm:text-4xl">{titulo}</h1>
          <Divisor className="mt-6" />
          {descricao && (
            <p className="mt-6 text-base leading-relaxed text-terra">{descricao}</p>
          )}
        </div>

        <div className="mt-8">{children}</div>

        {rodape && (
          <div className="mt-8 border-t border-terra/15 pt-6 text-center text-sm text-terra">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}

/** Faixa de mensagem de erro ou sucesso dentro dos formulários. */
export function Aviso({ tipo, children }: { tipo: "erro" | "ok"; children: ReactNode }) {
  const estilo =
    tipo === "erro"
      ? "border-red-800/25 bg-red-50 text-red-900"
      : "border-oliva/30 bg-oliva/10 text-oliva-escuro";
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-sm border px-4 py-3 text-sm ${estilo}`}
    >
      {children}
    </p>
  );
}

export function Rotulo({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="versalete mb-2 block text-xs text-terra">
      {children}
    </label>
  );
}
