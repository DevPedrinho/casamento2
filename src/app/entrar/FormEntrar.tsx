"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao } from "@/components/Botao";

export function FormEntrar() {
  const router = useRouter();
  const params = useSearchParams();
  const proximo = params.get("proximo") ?? "/area-do-convidado";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos. Confira e tente de novo."
          : "Não foi possível entrar agora. Tente novamente em instantes.",
      );
      setEnviando(false);
      return;
    }

    router.push(proximo);
    router.refresh();
  }

  return (
    <CartaoForm
      sobretitulo="Área do convidado"
      titulo="Que bom te ver"
      descricao="Entre com o e-mail e a senha que você usou no cadastro."
      rodape={
        <>
          Ainda não tem cadastro?{" "}
          <Link href="/cadastrar" className="text-oliva underline underline-offset-4">
            Criar meu cadastro
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div>
          <Rotulo htmlFor="email">E-mail</Rotulo>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="campo"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Rotulo htmlFor="senha">Senha</Rotulo>
          <input
            id="senha"
            type="password"
            required
            autoComplete="current-password"
            className="campo"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
    </CartaoForm>
  );
}
