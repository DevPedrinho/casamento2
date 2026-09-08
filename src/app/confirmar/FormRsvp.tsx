"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { ROTULOS_RSVP, type Rsvp, type StatusRsvp } from "@/lib/tipos";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao, BotaoLink } from "@/components/Botao";

const OPCOES: StatusRsvp[] = ["confirmado", "talvez", "nao_vou"];
const MAX_ACOMPANHANTES = 10;

export function FormRsvp({ nome, rsvpInicial }: { nome: string; rsvpInicial: Rsvp | null }) {
  const router = useRouter();

  const [status, setStatus] = useState<StatusRsvp>(rsvpInicial?.status ?? "confirmado");
  const [acompanhantes, setAcompanhantes] = useState(rsvpInicial?.companions ?? 0);
  const [nomesAcompanhantes, setNomesAcompanhantes] = useState(
    rsvpInicial?.companion_names ?? "",
  );
  const [restricoes, setRestricoes] = useState(rsvpInicial?.dietary_notes ?? "");
  const [recado, setRecado] = useState(rsvpInicial?.message ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const vai = status !== "nao_vou";

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);
    setEnviando(true);

    const supabase = criarClienteNavegador();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/entrar?proximo=/confirmar");
      return;
    }

    const { error } = await supabase.from("rsvps").upsert(
      {
        guest_id: data.user.id,
        status,
        // Quem não vai não leva acompanhante.
        companions: vai ? acompanhantes : 0,
        companion_names: vai ? nomesAcompanhantes.trim() || null : null,
        dietary_notes: vai ? restricoes.trim() || null : null,
        message: recado.trim() || null,
      },
      { onConflict: "guest_id" },
    );

    if (error) {
      setErro("Não foi possível salvar agora. Tente novamente em instantes.");
      setEnviando(false);
      return;
    }

    setSalvo(true);
    setEnviando(false);
    router.refresh();
  }

  const primeiroNome = nome.trim().split(" ")[0];

  return (
    <CartaoForm
      largura="largo"
      sobretitulo={rsvpInicial ? "Atualizar resposta" : "Confirmação de presença"}
      titulo={primeiroNome ? `Oi, ${primeiroNome}!` : "Confirme sua presença"}
      descricao={
        rsvpInicial
          ? "Você já respondeu — mas pode mudar o que quiser aqui embaixo."
          : "Conta pra gente: você vem? E quem vem com você?"
      }
      rodape={
        <BotaoLink href="/presentes" variante="contorno">
          Ver lista de presentes
        </BotaoLink>
      }
    >
      <form onSubmit={enviar} className="space-y-6">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {salvo && <Aviso tipo="ok">Resposta salva! Obrigado por avisar. 💜</Aviso>}

        <fieldset>
          <legend className="versalete mb-3 block text-xs text-terra">Você vem?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {OPCOES.map((opcao) => (
              <label
                key={opcao}
                className={`titulo-serif cursor-pointer rounded-sm border px-4 py-3 text-center text-sm transition-colors ${
                  status === opcao
                    ? "border-oliva bg-oliva text-creme-claro"
                    : "border-terra/30 text-terra hover:border-oliva"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={opcao}
                  checked={status === opcao}
                  onChange={() => setStatus(opcao)}
                  className="sr-only"
                />
                {ROTULOS_RSVP[opcao]}
              </label>
            ))}
          </div>
        </fieldset>

        {vai && (
          <>
            <div>
              <Rotulo htmlFor="acompanhantes">Quantos acompanhantes vêm com você?</Rotulo>
              <input
                id="acompanhantes"
                type="number"
                min={0}
                max={MAX_ACOMPANHANTES}
                className="campo"
                value={acompanhantes}
                onChange={(e) =>
                  setAcompanhantes(
                    Math.min(MAX_ACOMPANHANTES, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
              />
            </div>

            {acompanhantes > 0 && (
              <div>
                <Rotulo htmlFor="nomes">Nome dos acompanhantes</Rotulo>
                <textarea
                  id="nomes"
                  rows={2}
                  className="campo resize-y"
                  placeholder="Um nome por linha, ou separados por vírgula"
                  value={nomesAcompanhantes}
                  onChange={(e) => setNomesAcompanhantes(e.target.value)}
                />
              </div>
            )}

            <div>
              <Rotulo htmlFor="restricoes">Alguma restrição alimentar? (opcional)</Rotulo>
              <input
                id="restricoes"
                className="campo"
                placeholder="Vegetariano, sem glúten, alergia a…"
                value={restricoes}
                onChange={(e) => setRestricoes(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <Rotulo htmlFor="recado">Deixe um recado para os noivos (opcional)</Rotulo>
          <textarea
            id="recado"
            rows={4}
            className="campo resize-y"
            placeholder="Escreva algo bonito, a gente vai ler tudo."
            value={recado}
            onChange={(e) => setRecado(e.target.value)}
          />
        </div>

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? "Salvando…" : rsvpInicial ? "Atualizar resposta" : "Confirmar"}
        </Botao>
      </form>
    </CartaoForm>
  );
}
