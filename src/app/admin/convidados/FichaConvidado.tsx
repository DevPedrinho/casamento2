"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ETAPAS_CONVITE,
  PRESENCAS,
  ROTULOS_CONVITE,
  ROTULOS_PRESENCA,
  ROTULOS_PRESENCA_CURTO,
  ROTULOS_VINCULO,
  VINCULOS,
  type Acompanhante,
  type ConvidadoCompleto,
  type GrupoConvidados,
  type Mesa,
  type Presenca,
  type StatusConvite,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { formatarCodigo } from "@/lib/codigo";
import { Avatar } from "@/components/Avatar";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha } from "@/components/Ficha";
import { UploadImagem } from "@/components/UploadImagem";
import { urlDoSite } from "@/lib/storage";

export type AbaDaFicha = "convite" | "perfil" | "resposta" | "acompanhamento";

const ABAS: { chave: AbaDaFicha; rotulo: string }[] = [
  { chave: "convite", rotulo: "Convite" },
  { chave: "perfil", rotulo: "Perfil" },
  { chave: "resposta", rotulo: "Resposta" },
  { chave: "acompanhamento", rotulo: "Acompanhamento" },
];

const VAZIO = {
  full_name: "", group_id: "", side: "", relationship: "", relationship_kind: "",
  ceremony_role: "", is_featured: false,
  attends: "", gender: "", age: "", phone: "", whatsapp: "", email: "",
  invite_status: "nao_contatado" as StatusConvite, companions_planned: "0",
  table_id: "", favor_type: "", dietary_notes: "", notes: "",
  last_contact_at: "", next_action: "", next_action_at: "",
};

/**
 * O formulário do convidado, em quatro abas curtas. Serve para criar e
 * para editar; salva tudo de uma vez, em qualquer aba.
 */
export function FichaConvidado({
  convidado,
  grupos,
  mesas,
  abaInicial = "convite",
  aoFechar,
  aoSalvar,
}: {
  convidado: ConvidadoCompleto | null;
  grupos: GrupoConvidados[];
  mesas: Mesa[];
  abaInicial?: AbaDaFicha;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [aba, setAba] = useState<AbaDaFicha>(abaInicial);
  const [form, setForm] = useState(() =>
    convidado
      ? {
          full_name: convidado.full_name,
          group_id: convidado.group_id ?? "",
          side: convidado.side ?? "",
          relationship: convidado.relationship ?? "",
          relationship_kind: convidado.relationship_kind ?? "",
          ceremony_role: convidado.ceremony_role ?? "",
          is_featured: convidado.is_featured,
          attends: convidado.attends ?? "",
          gender: convidado.gender ?? "",
          age: convidado.age?.toString() ?? "",
          phone: convidado.phone ?? "",
          whatsapp: convidado.whatsapp ?? "",
          email: convidado.email ?? "",
          invite_status: convidado.invite_status,
          companions_planned: convidado.companions_planned.toString(),
          table_id: convidado.table_id ?? "",
          favor_type: convidado.favor_type ?? "",
          dietary_notes: convidado.dietary_notes ?? "",
          notes: convidado.notes ?? "",
          last_contact_at: convidado.last_contact_at ?? "",
          next_action: convidado.next_action ?? "",
          next_action_at: convidado.next_action_at ?? "",
        }
      : VAZIO,
  );
  const [avatar, setAvatar] = useState<string | null>(convidado?.avatar_path ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  /** A foto grava na hora: o arquivo já subiu, não faz sentido esperar o Salvar. */
  async function trocarFoto(caminho: string | null) {
    setAvatar(caminho);
    if (!convidado) return;
    const supabase = criarClienteNavegador();
    await supabase.from("guests").update({ avatar_path: caminho }).eq("id", convidado.id);
  }

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.full_name.trim()) {
      setErro("O nome é obrigatório.");
      setAba("convite");
      return;
    }
    const idade = form.age.trim() ? Number(form.age) : null;
    if (idade !== null && (!Number.isFinite(idade) || idade < 0 || idade > 130)) {
      setErro("Idade inválida.");
      setAba("perfil");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      full_name: form.full_name.trim(),
      group_id: form.group_id || null,
      side: form.side || null,
      relationship: form.relationship.trim() || null,
      relationship_kind: form.relationship_kind || null,
      ceremony_role: form.ceremony_role.trim() || null,
      is_featured: form.is_featured,
      attends: form.attends || null,
      gender: form.gender || null,
      age: idade,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || form.phone.trim() || null,
      email: form.email.trim() || null,
      invite_status: form.invite_status,
      companions_planned: Number(form.companions_planned) || 0,
      table_id: form.table_id || null,
      favor_type: form.favor_type.trim() || null,
      dietary_notes: form.dietary_notes.trim() || null,
      notes: form.notes.trim() || null,
      last_contact_at: form.last_contact_at || null,
      next_action: form.next_action.trim() || null,
      next_action_at: form.next_action_at || null,
      avatar_path: avatar,
    };

    const { error } = convidado
      ? await supabase.from("guests").update(dados).eq("id", convidado.id)
      : await supabase.from("guests").insert({
          ...dados,
          // A chave evita cadastrar a mesma pessoa duas vezes.
          import_key: dados.full_name.toLowerCase(),
        });

    setSalvando(false);
    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um convidado com esse nome."
          : "Não foi possível salvar. Tente de novo.",
      );
      return;
    }
    aoSalvar();
  }

  async function remover() {
    if (!convidado) return;
    if (!confirm(`Remover ${convidado.full_name} da lista? Isso não pode ser desfeito.`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("guests").delete().eq("id", convidado.id);
    aoSalvar();
  }

  return (
    <Ficha
      rotuloAria={convidado ? `Editar ${convidado.full_name}` : "Novo convidado"}
      aoFechar={aoFechar}
      cabecalho={
        <div className="flex items-center gap-3">
          <Avatar nome={form.full_name || "?"} url={urlDoSite(avatar)} />
          <div className="min-w-0">
            <p className="versalete text-xs text-terra">{convidado ? "Editar convidado" : "Novo convidado"}</p>
            <h2 className="titulo-serif truncate text-2xl leading-tight text-oliva">
              {form.full_name.trim() || (convidado ? convidado.full_name : "Quem é?")}
            </h2>
          </div>
        </div>
      }
      abaixoDoCabecalho={
        <div role="tablist" aria-label="Partes da ficha" className="-mx-5 mt-4 flex gap-1 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
          {ABAS.map((a) => (
            <button
              key={a.chave}
              type="button"
              role="tab"
              aria-selected={aba === a.chave}
              onClick={() => setAba(a.chave)}
              className={`versalete titulo-serif inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-xs transition-colors ${
                aba === a.chave ? "border-oliva text-oliva" : "border-transparent text-terra hover:text-oliva"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      }
      rodape={
        <>
          <Botao type="button" onClick={salvar} disabled={salvando} className="flex-1 sm:flex-none">
            {salvando ? "Salvando…" : convidado ? "Salvar" : "Adicionar"}
          </Botao>
          <Botao type="button" variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          {convidado && !convidado.user_id && (
            <button type="button" onClick={remover} className={`${ACAO_FICHA} ml-auto px-3 text-red-800`}>
              Remover
            </button>
          )}
        </>
      }
    >
      <form onSubmit={salvar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {/* ---------- Convite ---------- */}
        {aba === "convite" && (
          <>
            <CartaoFicha titulo="Quem é">
              <div className="space-y-4">
                <Campo id="nome" rotulo="Nome completo">
                  <input id="nome" required className="campo" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </Campo>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo id="grupo" rotulo="Família">
                    <select id="grupo" className="campo" value={form.group_id} onChange={(e) => set("group_id", e.target.value)}>
                      <option value="">Sem família</option>
                      {grupos.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </Campo>
                  <Campo id="lado" rotulo="Lado">
                    <select id="lado" className="campo" value={form.side} onChange={(e) => set("side", e.target.value)}>
                      <option value="">—</option>
                      <option value="noivo">Noivo</option>
                      <option value="noiva">Noiva</option>
                    </select>
                  </Campo>
                </div>
              </div>
            </CartaoFicha>

            <CartaoFicha titulo="Convite">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo id="status" rotulo="Status do convite">
                  <select id="status" className="campo" value={form.invite_status} onChange={(e) => set("invite_status", e.target.value as StatusConvite)}>
                    {ETAPAS_CONVITE.map((s) => <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>)}
                  </select>
                </Campo>
                <Campo id="acomp" rotulo="Acompanhantes previstos" dica="Quantas pessoas o convite comporta além da própria.">
                  <input id="acomp" inputMode="numeric" className="campo" value={form.companions_planned} onChange={(e) => set("companions_planned", e.target.value)} />
                </Campo>
              </div>
              {convidado && (
                <div className="mt-4 border-t border-terra/15 pt-2">
                  <LinhaFicha
                    rotulo="Código do convite"
                    valor={convidado.access_code ? <code className="font-mono tracking-widest">{formatarCodigo(convidado.access_code)}</code> : "ainda sem código"}
                    detalhe={convidado.code_sent_at ? "já entregue" : convidado.access_code ? "ainda não entregue" : null}
                  />
                  <LinhaFicha rotulo="Cadastro no site" valor={convidado.user_id ? "ativo" : "ainda não entrou"} />
                </div>
              )}
            </CartaoFicha>
          </>
        )}

        {/* ---------- Perfil ---------- */}
        {aba === "perfil" && (
          <>
            <CartaoFicha titulo="Foto de perfil">
              <UploadImagem
                pasta={`avatares/${convidado?.id ?? "novos"}`}
                caminhoAtual={avatar}
                urlAtual={urlDoSite(avatar)}
                aoEnviar={(caminho) => void trocarFoto(caminho)}
                aoRemover={() => void trocarFoto(null)}
                rotulo="Aparece no cartão da lista e no mural"
                proporcao="aspect-square max-w-[14rem]"
              />
            </CartaoFicha>

            <CartaoFicha titulo="Relação com vocês">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo id="vinculo" rotulo="Vínculo">
                    <select id="vinculo" className="campo" value={form.relationship_kind} onChange={(e) => set("relationship_kind", e.target.value)}>
                      <option value="">—</option>
                      {VINCULOS.map((v) => <option key={v} value={v}>{ROTULOS_VINCULO[v]}</option>)}
                    </select>
                  </Campo>
                  <Campo id="rel" rotulo="Relação, com as palavras de vocês" dica="“Prima 2º grau”, “Companheira do Ramon”.">
                    <input id="rel" className="campo" placeholder="Prima, Tio, Amigo…" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} />
                  </Campo>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo id="papel" rotulo="Papel na cerimônia">
                    <input id="papel" className="campo" placeholder="Madrinha, Padrinho…" value={form.ceremony_role} onChange={(e) => set("ceremony_role", e.target.value)} />
                  </Campo>
                  <Campo id="destaque" rotulo="Personagem principal" dica="Ganha etiqueta no mural e as publicações sobem para o topo.">
                    <label className="flex min-h-11 items-center gap-3">
                      <input id="destaque" type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="h-5 w-5 accent-[var(--color-oliva)]" />
                      <span className="text-sm text-terra">Aparece em destaque no mural</span>
                    </label>
                  </Campo>
                </div>
              </div>
            </CartaoFicha>

            <CartaoFicha titulo="Dados pessoais">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo id="sexo" rotulo="Sexo">
                  <select id="sexo" className="campo" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">—</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </Campo>
                <Campo id="idade" rotulo="Idade">
                  <input id="idade" inputMode="numeric" className="campo" value={form.age} onChange={(e) => set("age", e.target.value)} />
                </Campo>
                <Campo id="lembr" rotulo="Lembrancinha">
                  <input id="lembr" className="campo" value={form.favor_type} onChange={(e) => set("favor_type", e.target.value)} />
                </Campo>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo id="fone" rotulo="Telefone / WhatsApp">
                  <input id="fone" inputMode="tel" className="campo" placeholder="85-9xxxx-xxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Campo>
                <Campo id="email" rotulo="E-mail">
                  <input id="email" type="email" className="campo" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Campo>
              </div>
              <div className="mt-4">
                <Campo id="rest" rotulo="Restrições alimentares">
                  <input id="rest" className="campo" value={form.dietary_notes} onChange={(e) => set("dietary_notes", e.target.value)} />
                </Campo>
              </div>
            </CartaoFicha>
          </>
        )}

        {/* ---------- Resposta ---------- */}
        {aba === "resposta" && (
          <>
            <CartaoFicha titulo="Presença">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo id="presenca" rotulo="Onde participa">
                  <select id="presenca" className="campo" value={form.attends} onChange={(e) => set("attends", e.target.value)}>
                    <option value="">Ainda não respondeu</option>
                    {PRESENCAS.map((v) => <option key={v} value={v}>{ROTULOS_PRESENCA[v]}</option>)}
                  </select>
                </Campo>
                <Campo id="mesa" rotulo="Mesa">
                  <select id="mesa" className="campo" value={form.table_id} onChange={(e) => set("table_id", e.target.value)}>
                    <option value="">Sem mesa</option>
                    {mesas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Campo>
              </div>
            </CartaoFicha>

            {convidado ? (
              <Acompanhantes convidadoId={convidado.id} />
            ) : (
              <CartaoFicha titulo="Acompanhantes">
                <p className="text-sm text-terra">Salve o convidado primeiro; depois dá para cadastrar quem vem junto.</p>
              </CartaoFicha>
            )}
          </>
        )}

        {/* ---------- Acompanhamento ---------- */}
        {aba === "acompanhamento" && (
          <>
            <CartaoFicha titulo="Contato">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo id="ult" rotulo="Último contato">
                  <input id="ult" type="date" className="campo" value={form.last_contact_at} onChange={(e) => set("last_contact_at", e.target.value)} />
                </Campo>
                <Campo id="prox-data" rotulo="Retornar em">
                  <input id="prox-data" type="date" className="campo" value={form.next_action_at} onChange={(e) => set("next_action_at", e.target.value)} />
                </Campo>
              </div>
              <div className="mt-4">
                <Campo id="prox" rotulo="Próxima ação">
                  <input id="prox" className="campo" placeholder="Ligar, mandar convite…" value={form.next_action} onChange={(e) => set("next_action", e.target.value)} />
                </Campo>
              </div>
            </CartaoFicha>

            <CartaoFicha titulo="Observações">
              <textarea id="obs" rows={4} aria-label="Observações" className="campo resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </CartaoFicha>

            {/* Colunas da planilha sem campo próprio — preservadas, não descartadas. */}
            {convidado && Object.keys(convidado.extra ?? {}).length > 0 && (
              <CartaoFicha titulo="Da planilha">
                {Object.entries(convidado.extra).map(([k, v]) => (
                  <LinhaFicha key={k} rotulo={k.replace(/_/g, " ")} valor={v} />
                ))}
              </CartaoFicha>
            )}
          </>
        )}
      </form>
    </Ficha>
  );
}

/**
 * Quem vem junto, editado pelos noivos. Cada linha grava sozinha ao sair
 * do campo; não depende da resposta do convidado no site.
 */
function Acompanhantes({ convidadoId }: { convidadoId: string }) {
  const [itens, setItens] = useState<Acompanhante[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [novo, setNovo] = useState({ full_name: "", age: "", relationship: "", attends: "" as Presenca | "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const supabase = criarClienteNavegador();
    const { data } = await supabase
      .from("rsvp_companions")
      .select("*")
      .eq("guest_id", convidadoId)
      .order("created_at");
    setItens((data ?? []) as Acompanhante[]);
    setCarregado(true);
  }, [convidadoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function mudar(id: string, campo: keyof Acompanhante, valor: string | number | null) {
    setItens((l) => l.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  }

  async function gravar(a: Acompanhante) {
    if (!a.full_name.trim()) return;
    const supabase = criarClienteNavegador();
    await supabase
      .from("rsvp_companions")
      .update({ full_name: a.full_name.trim(), age: a.age, relationship: a.relationship?.trim() || null, attends: a.attends })
      .eq("id", a.id);
  }

  async function adicionar() {
    if (!novo.full_name.trim()) return;
    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { data } = await supabase
      .from("rsvp_companions")
      .insert({
        guest_id: convidadoId,
        full_name: novo.full_name.trim(),
        age: novo.age.trim() ? Number(novo.age) : null,
        relationship: novo.relationship.trim() || null,
        attends: novo.attends || null,
      })
      .select()
      .single();
    if (data) setItens((l) => [...l, data as Acompanhante]);
    setNovo({ full_name: "", age: "", relationship: "", attends: "" });
    setSalvando(false);
  }

  async function remover(id: string) {
    setItens((l) => l.filter((a) => a.id !== id));
    const supabase = criarClienteNavegador();
    await supabase.from("rsvp_companions").delete().eq("id", id);
  }

  const campoCurto = "campo py-1.5 text-sm";

  return (
    <CartaoFicha titulo={`Acompanhantes${itens.length > 0 ? ` · ${itens.length}` : ""}`}>
      {!carregado ? (
        <p className="text-sm text-terra">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-terra">Ninguém cadastrado ainda. Quem o convidado confirmar no site também aparece aqui.</p>
      ) : (
        <ul className="space-y-3">
          {itens.map((a) => (
            <li key={a.id} className="rounded-sm border border-terra/15 bg-creme-claro/60 p-3">
              <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                <input aria-label="Nome" className={campoCurto} value={a.full_name} onChange={(e) => mudar(a.id, "full_name", e.target.value)} onBlur={() => gravar(a)} />
                <input aria-label="Idade" inputMode="numeric" placeholder="idade" className={campoCurto} value={a.age ?? ""} onChange={(e) => mudar(a.id, "age", e.target.value.trim() ? Number(e.target.value) : null)} onBlur={() => gravar(a)} />
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input aria-label="Relação" placeholder="esposa, filho…" className={campoCurto} value={a.relationship ?? ""} onChange={(e) => mudar(a.id, "relationship", e.target.value)} onBlur={() => gravar(a)} />
                <select aria-label="Onde participa" className={campoCurto} value={a.attends ?? ""} onChange={(e) => { mudar(a.id, "attends", e.target.value || null); void gravar({ ...a, attends: (e.target.value || null) as Presenca | null }); }}>
                  <option value="">onde?</option>
                  {PRESENCAS.map((p) => <option key={p} value={p}>{ROTULOS_PRESENCA_CURTO[p]}</option>)}
                </select>
                <button type="button" onClick={() => remover(a.id)} aria-label={`Remover ${a.full_name}`} className="inline-flex h-10 w-10 items-center justify-center text-terra/60 hover:text-red-800">×</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-terra/15 pt-4">
        <p className="versalete mb-2 text-xs text-terra">Adicionar</p>
        <div className="grid grid-cols-[1fr_4.5rem] gap-2">
          <input aria-label="Nome do acompanhante" placeholder="Nome" className={campoCurto} value={novo.full_name} onChange={(e) => setNovo({ ...novo, full_name: e.target.value })} />
          <input aria-label="Idade do acompanhante" inputMode="numeric" placeholder="idade" className={campoCurto} value={novo.age} onChange={(e) => setNovo({ ...novo, age: e.target.value })} />
        </div>
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input aria-label="Relação do acompanhante" placeholder="esposa, filho…" className={campoCurto} value={novo.relationship} onChange={(e) => setNovo({ ...novo, relationship: e.target.value })} />
          <select aria-label="Onde o acompanhante participa" className={campoCurto} value={novo.attends} onChange={(e) => setNovo({ ...novo, attends: e.target.value as Presenca | "" })}>
            <option value="">onde?</option>
            {PRESENCAS.map((p) => <option key={p} value={p}>{ROTULOS_PRESENCA_CURTO[p]}</option>)}
          </select>
          <Botao type="button" variante="contorno" onClick={adicionar} disabled={salvando || !novo.full_name.trim()}>
            {salvando ? "…" : "Add"}
          </Botao>
        </div>
      </div>
    </CartaoFicha>
  );
}

function Campo({
  id,
  rotulo,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  /** Uma linha de explicação embaixo do campo, quando ele pede contexto. */
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      {children}
      {dica && <p className="mt-1.5 text-xs leading-relaxed text-terra/80">{dica}</p>}
    </div>
  );
}
