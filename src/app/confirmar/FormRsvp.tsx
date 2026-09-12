"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { meuGuestId } from "@/lib/convidadoCliente";
import { ROTULOS_RSVP, type Acompanhante, type Rsvp, type StatusRsvp } from "@/lib/tipos";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao, BotaoLink } from "@/components/Botao";
import { Icone } from "@/components/Icones";

const OPCOES: StatusRsvp[] = ["confirmado", "talvez", "nao_vou"];

/** Uma linha do formulário de acompanhante; o id só existe se já foi salvo. */
type LinhaAcompanhante = { id: string | null; nome: string; idade: string; obs: string };

export function FormRsvp({
  nome,
  rsvpInicial,
  acompanhantesIniciais,
  limite,
  lugaresUsadosPorOutros,
  nomeDoGrupo,
  regras,
  prazo,
}: {
  nome: string;
  rsvpInicial: Rsvp | null;
  acompanhantesIniciais: Acompanhante[];
  /** Quantas pessoas o convite comporta, contando o titular. */
  limite: number;
  /** Pessoas do mesmo convite já confirmadas por outro login da família. */
  lugaresUsadosPorOutros: number;
  nomeDoGrupo: string | null;
  /** Recado sobre acompanhantes, escrito pelos noivos no painel. */
  regras?: string;
  /** Data limite para confirmar, quando os noivos definem uma. */
  prazo?: string | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<StatusRsvp>(rsvpInicial?.status ?? "confirmado");
  const [acompanhantes, setAcompanhantes] = useState<LinhaAcompanhante[]>(
    acompanhantesIniciais.map((a) => ({
      id: a.id,
      nome: a.full_name,
      idade: a.age === null ? "" : String(a.age),
      obs: a.notes ?? "",
    })),
  );
  const [restricoes, setRestricoes] = useState(rsvpInicial?.dietary_notes ?? "");
  const [recado, setRecado] = useState(rsvpInicial?.message ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const vai = status !== "nao_vou";

  // O titular ocupa um lugar; o resto do convite é o que sobra para
  // acompanhantes, descontando quem a família já confirmou por outro login.
  const lugaresRestantes = Math.max(0, limite - lugaresUsadosPorOutros - 1);
  const podeAdicionar = acompanhantes.length < lugaresRestantes;

  function adicionar() {
    if (!podeAdicionar) return;
    setAcompanhantes((atual) => [...atual, { id: null, nome: "", idade: "", obs: "" }]);
  }

  function alterar(indice: number, campo: keyof LinhaAcompanhante, valor: string) {
    setAcompanhantes((atual) =>
      atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)),
    );
  }

  function remover(indice: number) {
    setAcompanhantes((atual) => atual.filter((_, i) => i !== indice));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);

    const preenchidos = vai
      ? acompanhantes.filter((a) => a.nome.trim().length > 0)
      : [];

    if (vai && acompanhantes.some((a) => !a.nome.trim())) {
      setErro("Falta o nome de um acompanhante. Escreva ou remova a linha.");
      return;
    }
    if (preenchidos.length > lugaresRestantes) {
      setErro(`Seu convite é para ${limite} pessoa${limite > 1 ? "s" : ""}.`);
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const guestId = await meuGuestId();
    if (!guestId) {
      router.push("/entrar?proximo=/confirmar");
      return;
    }

    const { error } = await supabase.from("rsvps").upsert(
      {
        guest_id: guestId,
        status,
        companions: preenchidos.length,
        // A lista de nomes vira uma linha por pessoa; este campo antigo
        // segue preenchido para não quebrar quem já lia dele.
        companion_names: preenchidos.length
          ? preenchidos.map((a) => a.nome.trim()).join(", ")
          : null,
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

    // Regrava os acompanhantes: apaga os que saíram, atualiza os que ficaram
    // e insere os novos. O banco confere o limite de novo, por garantia.
    const idsQueFicam = preenchidos.map((a) => a.id).filter(Boolean) as string[];
    const paraApagar = acompanhantesIniciais
      .filter((a) => !idsQueFicam.includes(a.id))
      .map((a) => a.id);

    if (paraApagar.length > 0) {
      await supabase.from("rsvp_companions").delete().in("id", paraApagar);
    }

    for (const linha of preenchidos) {
      const dados = {
        guest_id: guestId,
        full_name: linha.nome.trim(),
        age: linha.idade.trim() === "" ? null : Number(linha.idade),
        notes: linha.obs.trim() || null,
      };

      const resposta = linha.id
        ? await supabase.from("rsvp_companions").update(dados).eq("id", linha.id)
        : await supabase.from("rsvp_companions").insert(dados);

      if (resposta.error) {
        const limiteDoBanco = resposta.error.message.match(/LIMITE_DO_CONVITE:(\d+)/);
        setErro(
          limiteDoBanco
            ? `Seu convite é para ${limiteDoBanco[1]} pessoa${Number(limiteDoBanco[1]) > 1 ? "s" : ""}. Fale com os noivos se precisar de mais um lugar.`
            : "Não foi possível salvar os acompanhantes. Tente de novo.",
        );
        setEnviando(false);
        router.refresh();
        return;
      }
    }

    setSalvo(true);
    setEnviando(false);
    router.refresh();
  }

  const primeiroNome = nome.trim().split(" ")[0];
  const totalConfirmado = vai ? 1 + acompanhantes.filter((a) => a.nome.trim()).length : 0;

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

        {/* ---------- O tamanho do convite, dito de saída ---------- */}
        <div className="rounded-sm border border-lavanda/35 bg-lavanda/10 px-5 py-4 text-center">
          <p className="versalete text-xs text-terra">
            {nomeDoGrupo ? `Convite · ${nomeDoGrupo}` : "Seu convite"}
          </p>
          <p className="titulo-serif mt-2 text-2xl text-oliva">
            {limite} {limite > 1 ? "pessoas" : "pessoa"}
          </p>
          {lugaresUsadosPorOutros > 0 && (
            <p className="mt-1 text-sm text-terra">
              {lugaresUsadosPorOutros}{" "}
              {lugaresUsadosPorOutros > 1 ? "já confirmadas" : "já confirmada"} por alguém
              da sua família.
            </p>
          )}
          <p className="mt-2 text-sm text-terra">
            {lugaresRestantes === 0
              ? "O convite é só para você."
              : `Você pode trazer até ${lugaresRestantes} ${
                  lugaresRestantes > 1 ? "acompanhantes" : "acompanhante"
                }.`}
          </p>
          {regras && <p className="mt-3 text-sm leading-relaxed text-terra/85">{regras}</p>}
          {prazo && (
            <p className="versalete mt-3 text-xs text-terra">
              Confirme até {new Date(`${prazo}T12:00:00`).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

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
            {/* ---------- Acompanhantes, um a um ---------- */}
            <fieldset className="space-y-3">
              <legend className="versalete mb-1 block text-xs text-terra">
                Quem vem com você
              </legend>

              {acompanhantes.length === 0 && (
                <p className="rounded-sm border border-dashed border-terra/30 px-5 py-4 text-center text-sm text-terra">
                  {lugaresRestantes === 0
                    ? "Seu convite é individual."
                    : "Ninguém adicionado ainda."}
                </p>
              )}

              {acompanhantes.map((linha, i) => (
                <div
                  key={linha.id ?? `novo-${i}`}
                  className="rounded-sm border border-terra/20 bg-creme p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                    <div>
                      <Rotulo htmlFor={`acomp-nome-${i}`}>Nome completo</Rotulo>
                      <input
                        id={`acomp-nome-${i}`}
                        className="campo"
                        placeholder="Nome de quem vem"
                        value={linha.nome}
                        onChange={(e) => alterar(i, "nome", e.target.value)}
                      />
                    </div>
                    <div>
                      <Rotulo htmlFor={`acomp-idade-${i}`}>Idade</Rotulo>
                      <input
                        id={`acomp-idade-${i}`}
                        type="number"
                        min={0}
                        max={130}
                        inputMode="numeric"
                        className="campo"
                        placeholder="—"
                        value={linha.idade}
                        onChange={(e) => alterar(i, "idade", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Rotulo htmlFor={`acomp-obs-${i}`}>
                      Restrição alimentar dessa pessoa (opcional)
                    </Rotulo>
                    <input
                      id={`acomp-obs-${i}`}
                      className="campo"
                      placeholder="Vegetariano, sem lactose, menu infantil…"
                      value={linha.obs}
                      onChange={(e) => alterar(i, "obs", e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => remover(i)}
                    className="versalete mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-red-800 underline underline-offset-4"
                  >
                    <Icone nome="fechar" className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              ))}

              {podeAdicionar ? (
                <Botao type="button" variante="contorno" onClick={adicionar} className="w-full">
                  <Icone nome="mais" className="h-4 w-4" />
                  Adicionar acompanhante
                </Botao>
              ) : (
                lugaresRestantes > 0 && (
                  <p className="text-center text-sm text-terra">
                    {lugaresRestantes > 1
                      ? `Você já preencheu os ${lugaresRestantes} lugares do seu convite.`
                      : "Você já preencheu o lugar que sobrava no seu convite."}
                  </p>
                )
              )}
            </fieldset>

            <div>
              <Rotulo htmlFor="restricoes">Alguma restrição alimentar sua? (opcional)</Rotulo>
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
          {enviando
            ? "Salvando…"
            : vai
              ? `Confirmar ${totalConfirmado} ${totalConfirmado > 1 ? "pessoas" : "pessoa"}`
              : "Enviar resposta"}
        </Botao>
      </form>
    </CartaoForm>
  );
}
