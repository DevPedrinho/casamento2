"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { codigoCompleto, formatarCodigo, normalizarCodigo, TAMANHO_CODIGO } from "@/lib/codigo";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao } from "@/components/Botao";

const MIN_SENHA = 8;

/** Resposta de public.conferir_codigo. */
type Conferencia = { ok: boolean; motivo?: string; nome?: string };

const RECADO_DO_CODIGO: Record<string, string> = {
  invalido: "Não encontramos esse código. Confira as letras ou fale com os noivos.",
  usado: "Esse código já foi usado. Se o cadastro é seu, é só entrar.",
};

export function FormCadastrar() {
  const router = useRouter();
  const params = useSearchParams();
  const proximo = params.get("proximo") ?? "/confirmar";

  const [codigo, setCodigo] = useState("");
  const [convidado, setConvidado] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Confere o código assim que a pessoa termina de digitar, para o
   *  erro aparecer antes de ela preencher o resto do formulário. */
  async function conferirCodigo(valor: string) {
    if (!codigoCompleto(valor)) {
      setConvidado(null);
      return;
    }

    const supabase = criarClienteNavegador();
    const { data, error } = await supabase.rpc("conferir_codigo", {
      p_codigo: normalizarCodigo(valor),
    });
    if (error) return;

    const resposta = data as Conferencia;
    if (resposta?.ok) {
      setConvidado(resposta.nome ?? null);
      setErro(null);
      if (!nome.trim() && resposta.nome) setNome(resposta.nome);
    } else {
      setConvidado(null);
      setErro(RECADO_DO_CODIGO[resposta?.motivo ?? "invalido"]);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);

    if (!codigoCompleto(codigo)) {
      setErro(`O código do convite tem ${TAMANHO_CODIGO} letras e números.`);
      return;
    }
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
      options: {
        data: {
          full_name: nome.trim(),
          phone: telefone.trim(),
          access_code: normalizarCodigo(codigo),
        },
      },
    });

    if (error) {
      const texto = error.message.toLowerCase();
      setErro(
        texto.includes("already")
          ? "Já existe um cadastro com esse e-mail. Tente entrar."
          : texto.includes("database")
            ? "O código do convite não foi aceito. Confira com os noivos."
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
      descricao="Use o código que os noivos te enviaram. Com o cadastro você confirma presença e acessa a lista de presentes."
      rodape={
        <>
          Já se cadastrou?{" "}
          <Link href="/entrar" className="inline-flex min-h-11 items-center text-oliva underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="ok">{aviso}</Aviso>}

        <div>
          <Rotulo htmlFor="codigo">Código do convite</Rotulo>
          <input
            id="codigo"
            required
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            className="campo text-center text-xl tracking-[0.35em] uppercase"
            placeholder="ABCD-2345"
            value={formatarCodigo(codigo)}
            onChange={(e) => {
              const limpo = normalizarCodigo(e.target.value);
              setCodigo(limpo);
              setConvidado(null);
              void conferirCodigo(limpo);
            }}
            onBlur={() => void conferirCodigo(codigo)}
          />
          {convidado ? (
            <p className="mt-2 text-center text-sm text-oliva">
              Achamos seu convite, {convidado}! 💜
            </p>
          ) : (
            <p className="mt-2 text-center text-sm text-terra">
              Os noivos enviam esse código junto com o convite. Ele é usado
              uma vez só, aqui; depois você entra com e-mail e senha.
            </p>
          )}
        </div>

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
