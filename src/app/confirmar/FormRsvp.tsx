"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { meuGuestId } from "@/lib/convidadoCliente";
import {
  PRESENCAS,
  ROTULOS_RSVP,
  VINCULOS,
  ROTULOS_VINCULO,
  type Acompanhante,
  type Genero,
  type Presenca,
  type Rsvp,
  type StatusRsvp,
  type Vinculo,
} from "@/lib/tipos";
import { CartaoForm, Aviso, Rotulo } from "@/components/CartaoForm";
import { Botao, BotaoLink } from "@/components/Botao";
import { Icone } from "@/components/Icones";

const OPCOES: StatusRsvp[] = ["confirmado", "talvez", "nao_vou"];

/** Uma pessoa do formulário. O id só existe depois de salva. */
type Linha = {
  id: string | null;
  nome: string;
  idade: string;
  genero: string;
  /** Vínculo com quem a trouxe: "esposa", "filho", "namorada". */
  relacao: string;
  vinculo: string;
  presenca: Presenca;
  obs: string;
};

const LINHA_VAZIA: Linha = {
  id: null,
  nome: "",
  idade: "",
  genero: "",
  relacao: "",
  vinculo: "",
  presenca: "ambos",
  obs: "",
};

export function FormRsvp({
  nome,
  rsvpInicial,
  acompanhantesIniciais,
  vinculoInicial,
  presencaInicial,
  idadeInicial,
  generoInicial,
  ondeCerimonia,
  ondeRecepcao,
  regras,
  prazo,
}: {
  nome: string;
  rsvpInicial: Rsvp | null;
  acompanhantesIniciais: Acompanhante[];
  vinculoInicial: Vinculo | null;
  presencaInicial: Presenca | null;
  idadeInicial: number | null;
  generoInicial: Genero | null;
  /** Nome da capela e do buffet, para a pergunta não ficar abstrata. */
  ondeCerimonia: string | null;
  ondeRecepcao: string | null;
  regras?: string;
  prazo?: string | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<StatusRsvp>(rsvpInicial?.status ?? "confirmado");
  const [vinculo, setVinculo] = useState<string>(vinculoInicial ?? "");
  const [presenca, setPresenca] = useState<Presenca>(presencaInicial ?? "ambos");
  const [idade, setIdade] = useState(idadeInicial === null ? "" : String(idadeInicial));
  const [genero, setGenero] = useState<string>(generoInicial ?? "");
  const [restricoes, setRestricoes] = useState(rsvpInicial?.dietary_notes ?? "");
  const [recado, setRecado] = useState(rsvpInicial?.message ?? "");

  const [acompanhantes, setAcompanhantes] = useState<Linha[]>(
    acompanhantesIniciais.map((a) => ({
      id: a.id,
      nome: a.full_name,
      idade: a.age === null ? "" : String(a.age),
      genero: a.gender ?? "",
      relacao: a.relationship ?? "",
      vinculo: a.relationship_kind ?? "",
      presenca: a.attends ?? "ambos",
      obs: a.notes ?? "",
    })),
  );

  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const vai = status !== "nao_vou";
  const preenchidos = acompanhantes.filter((a) => a.nome.trim().length > 0);
  const total = vai ? 1 + preenchidos.length : 0;

  function adicionar() {
    // O acompanhante entra já com o vínculo de quem o convidou: quase sempre
    // é o mesmo, e quem quiser troca em um clique.
    setAcompanhantes((atual) => [...atual, { ...LINHA_VAZIA, vinculo }]);
  }

  function alterar(indice: number, campo: keyof Linha, valor: string) {
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

    if (vai && acompanhantes.some((a) => !a.nome.trim())) {
      setErro("Falta o nome de um acompanhante. Escreva ou remova a linha.");
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const guestId = await meuGuestId();
    if (!guestId) {
      router.push("/entrar?proximo=/confirmar");
      return;
    }

    const numero = (v: string) => (v.trim() === "" ? null : Number(v));

    // ---------- A ficha de quem respondeu ----------
    const { error: erroFicha } = await supabase
      .from("guests")
      .update({
        relationship_kind: vinculo || null,
        attends: vai ? presenca : null,
        age: numero(idade),
        gender: genero || null,
        dietary_notes: vai ? restricoes.trim() || null : null,
      })
      .eq("id", guestId);

    if (erroFicha) {
      setErro("Não foi possível salvar seus dados agora. Tente de novo em instantes.");
      setEnviando(false);
      return;
    }

    // ---------- A resposta ----------
    const { error } = await supabase.from("rsvps").upsert(
      {
        guest_id: guestId,
        status,
        companions: vai ? preenchidos.length : 0,
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

    // ---------- Quem vem junto ----------
    const idsQueFicam = preenchidos.map((a) => a.id).filter(Boolean) as string[];
    const paraApagar = acompanhantesIniciais
      .filter((a) => !idsQueFicam.includes(a.id))
      .map((a) => a.id);

    if (paraApagar.length > 0) {
      await supabase.from("rsvp_companions").delete().in("id", paraApagar);
    }

    for (const linha of vai ? preenchidos : []) {
      const dados = {
        guest_id: guestId,
        full_name: linha.nome.trim(),
        age: numero(linha.idade),
        gender: linha.genero || null,
        relationship: linha.relacao.trim() || null,
        relationship_kind: linha.vinculo || null,
        attends: linha.presenca,
        notes: linha.obs.trim() || null,
      };

      const resposta = linha.id
        ? await supabase.from("rsvp_companions").update(dados).eq("id", linha.id)
        : await supabase.from("rsvp_companions").insert(dados);

      if (resposta.error) {
        setErro("Não foi possível salvar os acompanhantes. Tente de novo.");
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
      <form onSubmit={enviar} className="space-y-7">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {salvo && <Aviso tipo="ok">Resposta salva! Obrigado por avisar. 💜</Aviso>}

        {(regras || prazo) && (
          <div className="rounded-sm border border-lavanda/35 bg-lavanda/10 px-5 py-4 text-center">
            {regras && <p className="text-sm leading-relaxed text-terra">{regras}</p>}
            {prazo && (
              <p className="versalete mt-2 text-xs text-terra">
                Confirme até {new Date(`${prazo}T12:00:00`).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        )}

        {/* ---------- Você vem? ---------- */}
        <fieldset>
          <legend className="versalete mb-3 block text-xs text-terra">Você vem?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {OPCOES.map((opcao) => (
              <Opcao
                key={opcao}
                nome="status"
                marcado={status === opcao}
                aoMarcar={() => setStatus(opcao)}
              >
                {ROTULOS_RSVP[opcao]}
              </Opcao>
            ))}
          </div>
        </fieldset>

        {vai && (
          <>
            {/* ---------- Sobre você ---------- */}
            <fieldset className="space-y-5">
              <legend className="versalete mb-1 block text-xs text-terra">Sobre você</legend>

              <div>
                <Rotulo htmlFor="vinculo">Qual é o seu vínculo com os noivos?</Rotulo>
                <select
                  id="vinculo"
                  className="campo"
                  value={vinculo}
                  onChange={(e) => setVinculo(e.target.value)}
                >
                  <option value="">Escolha uma opção</option>
                  {VINCULOS.map((v) => (
                    <option key={v} value={v}>
                      {ROTULOS_VINCULO[v]}
                    </option>
                  ))}
                </select>
              </div>

              <PerguntaPresenca
                idBase="voce"
                legenda="Você vai à cerimônia, à festa ou às duas?"
                valor={presenca}
                aoMudar={setPresenca}
                ondeCerimonia={ondeCerimonia}
                ondeRecepcao={ondeRecepcao}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Rotulo htmlFor="idade">Sua idade (opcional)</Rotulo>
                  <input
                    id="idade"
                    type="number"
                    min={0}
                    max={130}
                    inputMode="numeric"
                    className="campo"
                    placeholder="—"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                  />
                </div>
                <div>
                  <Rotulo htmlFor="genero">Como você se identifica (opcional)</Rotulo>
                  <select
                    id="genero"
                    className="campo"
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                  >
                    <option value="">Prefiro não dizer</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

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
            </fieldset>

            {/* ---------- Quem vem com você ---------- */}
            <fieldset className="space-y-4">
              <legend className="versalete mb-1 block text-xs text-terra">
                Quem vem com você
              </legend>

              {acompanhantes.length === 0 && (
                <p className="rounded-sm border border-dashed border-terra/30 px-5 py-4 text-center text-sm text-terra">
                  Ninguém adicionado ainda. Se você vem sozinho(a), é só seguir.
                </p>
              )}

              {acompanhantes.map((linha, i) => (
                <div
                  key={linha.id ?? `novo-${i}`}
                  className="rounded-sm border border-terra/20 bg-creme p-4 sm:p-5"
                >
                  <p className="versalete mb-3 text-xs text-lavanda">
                    {linha.nome.trim() || `Acompanhante ${i + 1}`}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
                    <div>
                      <Rotulo htmlFor={`ac-nome-${i}`}>Nome completo</Rotulo>
                      <input
                        id={`ac-nome-${i}`}
                        className="campo"
                        placeholder="Nome de quem vem"
                        value={linha.nome}
                        onChange={(e) => alterar(i, "nome", e.target.value)}
                      />
                    </div>
                    <div>
                      <Rotulo htmlFor={`ac-idade-${i}`}>Idade</Rotulo>
                      <input
                        id={`ac-idade-${i}`}
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

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Rotulo htmlFor={`ac-relacao-${i}`}>Quem é essa pessoa para você?</Rotulo>
                      <input
                        id={`ac-relacao-${i}`}
                        className="campo"
                        placeholder="Esposa, filho, namorada…"
                        value={linha.relacao}
                        onChange={(e) => alterar(i, "relacao", e.target.value)}
                      />
                    </div>
                    <div>
                      <Rotulo htmlFor={`ac-vinculo-${i}`}>E com os noivos?</Rotulo>
                      <select
                        id={`ac-vinculo-${i}`}
                        className="campo"
                        value={linha.vinculo}
                        onChange={(e) => alterar(i, "vinculo", e.target.value)}
                      >
                        <option value="">Escolha uma opção</option>
                        {VINCULOS.map((v) => (
                          <option key={v} value={v}>
                            {ROTULOS_VINCULO[v]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <PerguntaPresenca
                      idBase={`ac-${i}`}
                      legenda="Essa pessoa vai a quê?"
                      valor={linha.presenca}
                      aoMudar={(v) => alterar(i, "presenca", v)}
                      ondeCerimonia={ondeCerimonia}
                      ondeRecepcao={ondeRecepcao}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Rotulo htmlFor={`ac-genero-${i}`}>Como se identifica (opcional)</Rotulo>
                      <select
                        id={`ac-genero-${i}`}
                        className="campo"
                        value={linha.genero}
                        onChange={(e) => alterar(i, "genero", e.target.value)}
                      >
                        <option value="">Prefiro não dizer</option>
                        <option value="feminino">Feminino</option>
                        <option value="masculino">Masculino</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <Rotulo htmlFor={`ac-obs-${i}`}>Restrição alimentar (opcional)</Rotulo>
                      <input
                        id={`ac-obs-${i}`}
                        className="campo"
                        placeholder="Vegetariano, sem lactose, menu infantil…"
                        value={linha.obs}
                        onChange={(e) => alterar(i, "obs", e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remover(i)}
                    className="versalete mt-4 inline-flex min-h-11 items-center gap-2 text-xs text-red-800 underline underline-offset-4"
                  >
                    <Icone nome="fechar" className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              ))}

              <Botao type="button" variante="contorno" onClick={adicionar} className="w-full">
                <Icone nome="mais" className="h-4 w-4" />
                Adicionar acompanhante
              </Botao>
            </fieldset>
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
              ? `Confirmar ${total} ${total > 1 ? "pessoas" : "pessoa"}`
              : "Enviar resposta"}
        </Botao>
      </form>
    </CartaoForm>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Cerimônia, festa ou as duas.
 *
 * A pergunta vem com o nome do lugar junto porque "recepção" sozinho é
 * palavra de convite; "a festa, no buffet" é onde a pessoa vai estar.
 */
function PerguntaPresenca({
  idBase,
  legenda,
  valor,
  aoMudar,
  ondeCerimonia,
  ondeRecepcao,
}: {
  idBase: string;
  legenda: string;
  valor: Presenca;
  aoMudar: (v: Presenca) => void;
  ondeCerimonia: string | null;
  ondeRecepcao: string | null;
}) {
  const detalhe: Record<Presenca, string | null> = {
    ambos: null,
    cerimonia: ondeCerimonia,
    recepcao: ondeRecepcao,
  };

  const rotulo: Record<Presenca, string> = {
    ambos: "Cerimônia e festa",
    cerimonia: "Só a cerimônia",
    recepcao: "Só a festa",
  };

  return (
    <fieldset>
      <legend className="versalete mb-2 block text-xs text-terra">{legenda}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRESENCAS.map((opcao) => (
          <Opcao
            key={opcao}
            nome={`presenca-${idBase}`}
            marcado={valor === opcao}
            aoMarcar={() => aoMudar(opcao)}
          >
            {rotulo[opcao]}
            {detalhe[opcao] && (
              <span className="mt-0.5 block text-xs opacity-80">{detalhe[opcao]}</span>
            )}
          </Opcao>
        ))}
      </div>
    </fieldset>
  );
}

/** Botão de rádio que parece botão: área de toque inteira, sem bolinha. */
function Opcao({
  nome,
  marcado,
  aoMarcar,
  children,
}: {
  nome: string;
  marcado: boolean;
  aoMarcar: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`titulo-serif flex min-h-12 cursor-pointer items-center justify-center rounded-sm border px-4 py-3 text-center text-sm transition-colors ${
        marcado
          ? "border-oliva bg-oliva text-creme-claro"
          : "border-terra/30 text-terra hover:border-oliva"
      }`}
    >
      <input
        type="radio"
        name={nome}
        checked={marcado}
        onChange={aoMarcar}
        className="sr-only"
      />
      <span>{children}</span>
    </label>
  );
}
