"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import {
  ROTULOS_PRESENCA,
  ROTULOS_RSVP,
  ROTULOS_VINCULO,
  ROTULOS_LOCAL,
  type Acompanhante,
  type Genero,
  type LocalEvento,
  type Mesa,
  type MomentoDoDia,
  type Presenca,
  type Rsvp,
  type Vinculo,
} from "@/lib/tipos";
import { Secao } from "@/components/Secao";
import { Botao, BotaoLink } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { BotaoSair } from "@/components/BotaoSair";
import { Divisor } from "@/components/Ornamentos";
import { Icone } from "@/components/Icones";
import { Avatar } from "@/components/Avatar";
import { UploadImagem } from "@/components/UploadImagem";
import { urlDoSite } from "@/lib/storage";

export type MinhaFicha = {
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  age: number | null;
  gender: Genero | null;
  attends: Presenca | null;
  relationship: string | null;
  relationship_kind: Vinculo | null;
  ceremony_role: string | null;
  is_featured: boolean;
  dietary_notes: string | null;
  is_admin: boolean;
  table_id: string | null;
  mesa: Mesa | null;
  avatar_path?: string | null;
};

type Aba = "resposta" | "dados" | "dia";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "resposta", rotulo: "Minha resposta" },
  { chave: "dados", rotulo: "Meus dados" },
  { chave: "dia", rotulo: "O grande dia" },
];

/**
 * A área do convidado.
 *
 * Três abas com três donos diferentes: a resposta é dele e se muda no
 * formulário de confirmação; os dados são dele e se mudam aqui mesmo; o
 * grande dia é dos noivos e ele só lê. A mesa mora na terceira aba de
 * propósito — é informação de festa, não de cadastro.
 */
export function MinhaArea({
  guestId,
  ficha,
  rsvp,
  acompanhantes,
  momentos,
  locais,
  dataExtenso,
  trajes,
}: {
  guestId: string;
  ficha: MinhaFicha | null;
  rsvp: Rsvp | null;
  acompanhantes: Acompanhante[];
  momentos: MomentoDoDia[];
  locais: LocalEvento[];
  dataExtenso: string;
  trajes: string;
}) {
  const [aba, setAba] = useState<Aba>("resposta");
  const primeiroNome = (ficha?.full_name ?? "").trim().split(" ")[0];

  return (
    <Secao
      sobretitulo="Área do convidado"
      titulo={primeiroNome ? `Oi, ${primeiroNome}` : "Sua área"}
    >
      <div className="mx-auto max-w-2xl">
        {/* ---------- Abas ---------- */}
        <div
          role="tablist"
          aria-label="Sua área"
          className="mb-8 flex gap-1 rounded-sm border border-terra/25 p-1"
        >
          {ABAS.map((a) => (
            <button
              key={a.chave}
              role="tab"
              type="button"
              aria-selected={aba === a.chave}
              onClick={() => setAba(a.chave)}
              className={`titulo-serif min-h-11 flex-1 rounded-sm px-2 text-sm transition-colors ${
                aba === a.chave
                  ? "bg-oliva text-creme-claro"
                  : "text-terra hover:text-oliva"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba === "resposta" && (
          <AbaResposta rsvp={rsvp} acompanhantes={acompanhantes} ficha={ficha} />
        )}
        {aba === "dados" && <AbaDados guestId={guestId} ficha={ficha} />}
        {aba === "dia" && (
          <AbaGrandeDia
            ficha={ficha}
            momentos={momentos}
            locais={locais}
            dataExtenso={dataExtenso}
            trajes={trajes}
          />
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <BotaoLink href="/presentes" variante="lavanda">
            Lista de presentes
          </BotaoLink>
          {ficha?.is_admin && (
            <BotaoLink href="/admin" variante="contorno">
              Painel dos noivos
            </BotaoLink>
          )}
          <BotaoSair />
        </div>
      </div>
    </Secao>
  );
}

/* ================================================================== */

function AbaResposta({
  rsvp,
  acompanhantes,
  ficha,
}: {
  rsvp: Rsvp | null;
  acompanhantes: Acompanhante[];
  ficha: MinhaFicha | null;
}) {
  const vai = rsvp && rsvp.status !== "nao_vou";

  return (
    <div className="rounded-sm border border-terra/20 bg-creme-claro p-8 text-center">
      <p className="versalete text-xs text-terra">Sua resposta</p>

      {rsvp ? (
        <>
          <p className="titulo-serif mt-4 text-3xl text-oliva">
            {ROTULOS_RSVP[rsvp.status]}
          </p>

          {vai && (
            <>
              {ficha?.attends && (
                <p className="mt-2 text-sm text-terra">
                  {ROTULOS_PRESENCA[ficha.attends]}
                </p>
              )}

              <p className="mt-3 text-sm text-terra">
                {acompanhantes.length === 0
                  ? "Você vem sozinho(a)."
                  : `Com ${acompanhantes.length} acompanhante${acompanhantes.length > 1 ? "s" : ""}.`}
              </p>

              {acompanhantes.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {acompanhantes.map((a) => (
                    <li key={a.id} className="rounded-sm border border-terra/15 bg-creme px-4 py-3">
                      <p className="titulo-serif text-lg text-oliva">{a.full_name}</p>
                      <p className="text-sm text-terra">
                        {[
                          a.age !== null ? `${a.age} anos` : null,
                          a.relationship,
                          a.attends ? ROTULOS_PRESENCA[a.attends] : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {rsvp.message && (
            <>
              <Divisor className="my-6" />
              <p className="titulo-serif text-base text-terra italic">“{rsvp.message}”</p>
            </>
          )}
        </>
      ) : (
        <p className="titulo-serif mt-4 text-xl text-terra italic">
          Você ainda não confirmou presença.
        </p>
      )}

      <BotaoLink href="/confirmar" className="mt-8" variante={rsvp ? "contorno" : "solido"}>
        {rsvp ? "Alterar resposta" : "Confirmar presença"}
      </BotaoLink>
    </div>
  );
}

/* ================================================================== */

function AbaDados({ guestId, ficha }: { guestId: string; ficha: MinhaFicha | null }) {
  const router = useRouter();
  const [nome, setNome] = useState(ficha?.full_name ?? "");
  const [telefone, setTelefone] = useState(ficha?.phone ?? "");
  const [email, setEmail] = useState(ficha?.email ?? "");
  const [idade, setIdade] = useState(ficha?.age === null || ficha === null ? "" : String(ficha.age));
  const [genero, setGenero] = useState<string>(ficha?.gender ?? "");
  const [restricoes, setRestricoes] = useState(ficha?.dietary_notes ?? "");
  const [avatar, setAvatar] = useState<string | null>(ficha?.avatar_path ?? null);
  const [erro, setErro] = useState<string | null>(null);

  /** A foto grava sozinha: o arquivo já subiu, não precisa do botão salvar. */
  async function trocarFoto(caminho: string | null) {
    setAvatar(caminho);
    const supabase = criarClienteNavegador();
    await supabase.from("guests").update({ avatar_path: caminho }).eq("id", guestId);
    router.refresh();
  }
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);

    if (nome.trim().length < 3) {
      setErro("Escreva seu nome completo, por favor.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("guests")
      .update({
        full_name: nome.trim(),
        phone: telefone.trim() || null,
        whatsapp: telefone.trim() || null,
        email: email.trim() || null,
        age: idade.trim() === "" ? null : Number(idade),
        gender: genero || null,
        dietary_notes: restricoes.trim() || null,
      })
      .eq("id", guestId);

    if (error) {
      setErro("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
      return;
    }

    setSalvo(true);
    setSalvando(false);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-5 rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-8">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {salvo && <Aviso tipo="ok">Pronto, salvamos aqui. 💜</Aviso>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <Avatar nome={nome || "?"} url={urlDoSite(avatar)} tamanho="lg" className="hidden sm:block" />
        <div className="min-w-0 flex-1">
          <UploadImagem
            pasta={`avatares/${guestId}`}
            caminhoAtual={avatar}
            urlAtual={urlDoSite(avatar)}
            aoEnviar={(caminho) => void trocarFoto(caminho)}
            aoRemover={() => void trocarFoto(null)}
            rotulo="Sua foto de perfil — aparece no mural, como numa rede social"
            proporcao="aspect-square max-w-[12rem]"
          />
        </div>
      </div>

      <div>
        <Rotulo htmlFor="meu-nome">Nome completo</Rotulo>
        <input id="meu-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="meu-fone">WhatsApp</Rotulo>
          <input
            id="meu-fone"
            type="tel"
            className="campo"
            placeholder="(00) 90000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
        <div>
          <Rotulo htmlFor="meu-email">E-mail</Rotulo>
          <input
            id="meu-email"
            type="email"
            className="campo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="minha-idade">Idade</Rotulo>
          <input
            id="minha-idade"
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
          <Rotulo htmlFor="meu-genero">Como você se identifica</Rotulo>
          <select
            id="meu-genero"
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
        <Rotulo htmlFor="minhas-restricoes">Restrição alimentar</Rotulo>
        <input
          id="minhas-restricoes"
          className="campo"
          placeholder="Vegetariano, sem glúten, alergia a…"
          value={restricoes}
          onChange={(e) => setRestricoes(e.target.value)}
        />
      </div>

      {/* O que é decisão dos noivos aparece, mas não se mexe. */}
      {(ficha?.relationship_kind || ficha?.ceremony_role) && (
        <div className="rounded-sm border border-lavanda/30 bg-lavanda/10 px-4 py-3">
          <p className="versalete text-xs text-lavanda">Definido pelos noivos</p>
          <p className="mt-1.5 text-sm text-terra">
            {[
              ficha.relationship_kind ? ROTULOS_VINCULO[ficha.relationship_kind] : null,
              ficha.ceremony_role,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      <Botao type="submit" disabled={salvando} className="w-full">
        {salvando ? "Salvando…" : "Salvar meus dados"}
      </Botao>
    </form>
  );
}

/* ================================================================== */

function AbaGrandeDia({
  ficha,
  momentos,
  locais,
  dataExtenso,
  trajes,
}: {
  ficha: MinhaFicha | null;
  momentos: MomentoDoDia[];
  locais: LocalEvento[];
  dataExtenso: string;
  trajes: string;
}) {
  const hora = (h: string | null) => (h ? h.slice(0, 5) : null);

  return (
    <div className="space-y-6">
      {/* ---------- Mesa ---------- */}
      <div className="rounded-sm border border-terra/20 bg-creme-claro p-8 text-center">
        <p className="versalete text-xs text-terra">Sua mesa</p>
        {ficha?.mesa ? (
          <>
            <p className="titulo-serif mt-3 text-3xl text-oliva">{ficha.mesa.name}</p>
            <p className="mt-2 text-sm text-terra">
              Quem veio com você senta junto.
            </p>
          </>
        ) : (
          <p className="titulo-serif mt-3 text-xl text-terra italic">
            Ainda não definida. Os noivos avisam por aqui quando montarem o salão.
          </p>
        )}
      </div>

      {/* ---------- Data e traje ---------- */}
      <div className="rounded-sm border border-terra/20 bg-creme-claro p-8 text-center">
        <p className="versalete text-xs text-terra">O grande dia</p>
        <p className="titulo-serif mt-3 text-2xl text-oliva">{dataExtenso}</p>
        <p className="mt-2 text-sm text-terra">Traje: {trajes}</p>
      </div>

      {/* ---------- Onde ---------- */}
      {locais.length > 0 && (
        <div className="rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-8">
          <p className="versalete text-center text-xs text-terra">Onde é</p>
          <ul className="mt-4 space-y-4">
            {locais.map((local) => (
              <li key={local.id} className="rounded-sm border border-terra/15 bg-creme p-5">
                <p className="versalete text-xs text-lavanda">
                  {ROTULOS_LOCAL[local.kind]}
                  {local.starts_at && ` · ${local.starts_at}`}
                </p>
                <p className="titulo-serif mt-2 text-xl text-oliva">{local.name}</p>
                <p className="mt-1 text-sm text-terra">
                  {[local.address, local.city].filter(Boolean).join(" — ")}
                </p>
                {local.guest_info && (
                  <p className="mt-2 text-sm leading-relaxed text-terra/85">{local.guest_info}</p>
                )}
                {local.maps_url && (
                  <a
                    href={local.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="versalete mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-oliva underline underline-offset-4"
                  >
                    <Icone nome="local" className="h-4 w-4" />
                    Como chegar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- A ordem do dia ---------- */}
      {momentos.length > 0 && (
        <div className="rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-8">
          <p className="versalete text-center text-xs text-terra">Como vai ser</p>
          <ul className="mt-4 space-y-3">
            {momentos.map((m) => (
              <li key={m.id} className="flex gap-4">
                <span className="titulo-serif w-16 shrink-0 text-right text-lg text-lavanda tabular-nums lining-nums">
                  {hora(m.starts_at) ?? "—"}
                </span>
                <span className="min-w-0 flex-1 border-l border-terra/20 pl-4">
                  <span className="titulo-serif block text-lg text-oliva">{m.title}</span>
                  {m.description && (
                    <span className="block text-sm leading-relaxed text-terra">
                      {m.description}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
