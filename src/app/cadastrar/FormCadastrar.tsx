"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao } from "@/components/Botao";

const MIN_SENHA = 8;

export function FormCadastrar() {
  const router = useRouter();
  const params = useSearchParams();
  const proximo = params.get("proximo") ?? "/confirmar";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);

    if (nome.trim().length < 3) {
      setErro("Escreva seu nome completo, por favor.");
      return;
    }
    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      // O gatilho handle_new_user lê estes campos para criar o perfil.
      options: { data: { full_name: nome.trim(), phone: telefone.trim() } },
    });

    if (error) {
      setErro(
        error.message.toLowerCase().includes("already")
          ? "Já existe um cadastro com esse e-mail. Tente entrar."
          : "Não foi possível criar o cadastro agora. Tente novamente em instantes.",
      );
      setEnviando(false);
      return;
    }

    // Se a confirmação de e-mail estiver ligada no Supabase, não vem sessão.
    if (!data.session) {
      setAviso(
        "Cadastro criado! Enviamos um e-mail de confirmação — confirme e depois entre no site.",
      );
      setEnviando(false);
      return;
    }

    router.push(proximo);
    router.refresh();
  }

  return (
    <CartaoForm
      sobretitulo="Lista de convidados"
      titulo="Criar meu cadastro"
      descricao="É rapidinho. Com o cadastro você confirma presença e acessa a lista de presentes."
      rodape={
        <>
          Já se cadastrou?{" "}
          <Link href="/entrar" className="inline-block py-2 text-oliva underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="ok">{aviso}</Aviso>}

        <div>
          <Rotulo htmlFor="nome">Nome completo</Rotulo>
          <input
            id="nome"
            required
            autoComplete="name"
            className="campo"
            placeholder="Como você quer aparecer na lista"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

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
          <Rotulo htmlFor="telefone">WhatsApp (opcional)</Rotulo>
          <input
            id="telefone"
            type="tel"
            autoComplete="tel"
            className="campo"
            placeholder="(00) 90000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div>
          <Rotulo htmlFor="senha">Senha</Rotulo>
          <input
            id="senha"
            type="password"
            required
            minLength={MIN_SENHA}
            autoComplete="new-password"
            className="campo"
            placeholder={`Pelo menos ${MIN_SENHA} caracteres`}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <div>
          <Rotulo htmlFor="confirmacao">Repita a senha</Rotulo>
          <input
            id="confirmacao"
            type="password"
            required
            autoComplete="new-password"
            className="campo"
            placeholder="••••••••"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </div>

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? "Criando…" : "Criar cadastro"}
        </Botao>
      </form>
    </CartaoForm>
  );
}
