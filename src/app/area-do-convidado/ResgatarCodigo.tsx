"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { codigoCompleto, formatarCodigo, normalizarCodigo, TAMANHO_CODIGO } from "@/lib/codigo";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao } from "@/components/Botao";
import { BotaoSair } from "@/components/BotaoSair";

const RECADOS: Record<string, string> = {
  CODIGO_INVALIDO: "Não encontramos esse código. Confira as letras ou fale com os noivos.",
  CODIGO_JA_USADO: "Esse código já está ligado a outro cadastro.",
  PRECISA_ENTRAR: "Sua sessão expirou. Entre de novo e tente outra vez.",
};

/**
 * Para quem já tem login mas ainda não está ligado a uma ficha da lista
 * de convidados — contas antigas, ou alguém que se cadastrou antes de o
 * código existir. Ao resgatar, a conta passa a ser daquele convidado e
 * leva junto o que a pessoa já tinha feito no site.
 */
export function ResgatarCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!codigoCompleto(codigo)) {
      setErro(`O código tem ${TAMANHO_CODIGO} letras e números.`);
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.rpc("resgatar_codigo", {
      p_codigo: normalizarCodigo(codigo),
    });
    setEnviando(false);

    if (error) {
      const chave = Object.keys(RECADOS).find((k) => error.message.includes(k));
      setErro(chave ? RECADOS[chave] : "Não deu para usar esse código agora. Tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-sm border border-terra/20 bg-creme-claro p-6 text-center sm:p-8">
        <p className="versalete text-xs text-terra">Falta um passo</p>
        <h2 className="titulo-serif mt-4 text-2xl text-oliva">Informe seu código</h2>
        <p className="mt-3 text-base leading-relaxed text-terra">
          É o código que os noivos enviaram junto com o convite. Ele liga a
          sua conta ao seu nome na lista.
        </p>

        <form onSubmit={enviar} className="mt-7 space-y-4 text-left">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <div>
            <Rotulo htmlFor="codigo-resgate">Código do convite</Rotulo>
            <input
              id="codigo-resgate"
              required
              autoCapitalize="characters"
              autoComplete="one-time-code"
              className="campo text-center text-xl tracking-[0.35em] uppercase"
              placeholder="ABCD-2345"
              value={formatarCodigo(codigo)}
              onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
            />
          </div>

          <Botao type="submit" disabled={enviando} className="w-full">
            {enviando ? "Conferindo…" : "Liberar minha área"}
          </Botao>
        </form>
      </div>

      <div className="mt-6 flex justify-center">
        <BotaoSair />
      </div>
    </div>
  );
}
