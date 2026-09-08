"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ETAPAS_CONVITE,
  ROTULOS_CONVITE,
  type ConvidadoCompleto,
  type GrupoConvidados,
  type StatusConvite,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Avatar } from "@/components/Avatar";
import { Icone } from "@/components/Icones";

const VAZIO = {
  full_name: "", group_id: "", side: "", relationship: "", ceremony_role: "",
  attends: "", gender: "", age: "", phone: "", whatsapp: "", email: "",
  invite_status: "nao_contatado" as StatusConvite, companions_planned: "0",
  table_number: "", favor_type: "", dietary_notes: "", notes: "",
  last_contact_at: "", next_action: "", next_action_at: "",
};

/** Drawer lateral com a ficha completa. Serve para criar e para editar. */
export function FichaConvidado({
  convidado,
  grupos,
  aoFechar,
  aoSalvar,
}: {
  convidado: ConvidadoCompleto | null;
  grupos: GrupoConvidados[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [form, setForm] = useState(() =>
    convidado
      ? {
          full_name: convidado.full_name,
          group_id: convidado.group_id ?? "",
          side: convidado.side ?? "",
          relationship: convidado.relationship ?? "",
          ceremony_role: convidado.ceremony_role ?? "",
          attends: convidado.attends ?? "",
          gender: convidado.gender ?? "",
          age: convidado.age?.toString() ?? "",
          phone: convidado.phone ?? "",
          whatsapp: convidado.whatsapp ?? "",
          email: convidado.email ?? "",
          invite_status: convidado.invite_status,
          companions_planned: convidado.companions_planned.toString(),
          table_number: convidado.table_number ?? "",
          favor_type: convidado.favor_type ?? "",
          dietary_notes: convidado.dietary_notes ?? "",
          notes: convidado.notes ?? "",
          last_contact_at: convidado.last_contact_at ?? "",
          next_action: convidado.next_action ?? "",
          next_action_at: convidado.next_action_at ?? "",
        }
      : VAZIO,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.full_name.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    const idade = form.age.trim() ? Number(form.age) : null;
    if (idade !== null && (!Number.isFinite(idade) || idade < 0 || idade > 130)) {
      setErro("Idade inválida.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      full_name: form.full_name.trim(),
      group_id: form.group_id || null,
      side: form.side || null,
      relationship: form.relationship.trim() || null,
      ceremony_role: form.ceremony_role.trim() || null,
      attends: form.attends.trim() || null,
      gender: form.gender || null,
      age: idade,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || form.phone.trim() || null,
      email: form.email.trim() || null,
      invite_status: form.invite_status,
      companions_planned: Number(form.companions_planned) || 0,
      table_number: form.table_number.trim() || null,
      favor_type: form.favor_type.trim() || null,
      dietary_notes: form.dietary_notes.trim() || null,
      notes: form.notes.trim() || null,
      last_contact_at: form.last_contact_at || null,
      next_action: form.next_action.trim() || null,
      next_action_at: form.next_action_at || null,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-oliva-escuro/50" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={convidado ? `Ficha de ${convidado.full_name}` : "Novo convidado"}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-terra/20 bg-creme-claro shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-terra/20 bg-creme-claro px-6 py-5">
          <Avatar nome={form.full_name || "?"} />
          <div className="min-w-0 flex-1">
            <h2 className="titulo-serif truncate text-2xl text-oliva">
              {convidado ? convidado.full_name : "Novo convidado"}
            </h2>
            {convidado?.user_id && (
              <p className="text-sm text-terra">Tem conta no site</p>
            )}
          </div>
          <button
            ref={fecharRef}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="p-2 text-terra transition-colors hover:text-oliva"
          >
            <Icone nome="fechar" />
          </button>
        </header>

        <form onSubmit={salvar} className="flex-1 space-y-6 px-6 py-6">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <Campo id="nome" rotulo="Nome completo">
            <input id="nome" required className="campo" value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} />
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="grupo" rotulo="Família / grupo">
              <select id="grupo" className="campo" value={form.group_id}
                onChange={(e) => set("group_id", e.target.value)}>
                <option value="">Sem grupo</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Campo>
            <Campo id="lado" rotulo="Lado">
              <select id="lado" className="campo" value={form.side}
                onChange={(e) => set("side", e.target.value)}>
                <option value="">—</option>
                <option value="noivo">Noivo</option>
                <option value="noiva">Noiva</option>
              </select>
            </Campo>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="rel" rotulo="Relação">
              <input id="rel" className="campo" placeholder="Prima, Tio, Amigo…"
                value={form.relationship} onChange={(e) => set("relationship", e.target.value)} />
            </Campo>
            <Campo id="papel" rotulo="Papel na cerimônia">
              <input id="papel" className="campo" placeholder="Madrinha, Padrinho…"
                value={form.ceremony_role} onChange={(e) => set("ceremony_role", e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Campo id="sexo" rotulo="Sexo">
              <select id="sexo" className="campo" value={form.gender}
                onChange={(e) => set("gender", e.target.value)}>
                <option value="">—</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </Campo>
            <Campo id="idade" rotulo="Idade">
              <input id="idade" inputMode="numeric" className="campo" value={form.age}
                onChange={(e) => set("age", e.target.value)} />
            </Campo>
            <Campo id="lembr" rotulo="Lembrancinha">
              <input id="lembr" className="campo" value={form.favor_type}
                onChange={(e) => set("favor_type", e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="fone" rotulo="Telefone / WhatsApp">
              <input id="fone" className="campo" placeholder="85-9xxxx-xxxx" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </Campo>
            <Campo id="email" rotulo="E-mail">
              <input id="email" type="email" className="campo" value={form.email}
                onChange={(e) => set("email", e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Campo id="status" rotulo="Status do convite">
              <select id="status" className="campo" value={form.invite_status}
                onChange={(e) => set("invite_status", e.target.value as StatusConvite)}>
                {ETAPAS_CONVITE.map((s) => (
                  <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
                ))}
              </select>
            </Campo>
            <Campo id="acomp" rotulo="Acompanhantes">
              <input id="acomp" inputMode="numeric" className="campo"
                value={form.companions_planned}
                onChange={(e) => set("companions_planned", e.target.value)} />
            </Campo>
            <Campo id="mesa" rotulo="Mesa">
              <input id="mesa" className="campo" value={form.table_number}
                onChange={(e) => set("table_number", e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="ult" rotulo="Último contato">
              <input id="ult" type="date" className="campo" value={form.last_contact_at}
                onChange={(e) => set("last_contact_at", e.target.value)} />
            </Campo>
            <Campo id="prox-data" rotulo="Retornar em">
              <input id="prox-data" type="date" className="campo" value={form.next_action_at}
                onChange={(e) => set("next_action_at", e.target.value)} />
            </Campo>
          </div>

          <Campo id="prox" rotulo="Próxima ação">
            <input id="prox" className="campo" placeholder="Ligar, mandar convite…"
              value={form.next_action} onChange={(e) => set("next_action", e.target.value)} />
          </Campo>

          <Campo id="rest" rotulo="Restrições alimentares">
            <input id="rest" className="campo" value={form.dietary_notes}
              onChange={(e) => set("dietary_notes", e.target.value)} />
          </Campo>

          <Campo id="obs" rotulo="Observações">
            <textarea id="obs" rows={3} className="campo resize-y" value={form.notes}
              onChange={(e) => set("notes", e.target.value)} />
          </Campo>

          {/* Colunas da planilha sem campo próprio — preservadas, não descartadas. */}
          {convidado && Object.keys(convidado.extra ?? {}).length > 0 && (
            <div className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
              <p className="versalete mb-2 text-xs text-terra">Da planilha</p>
              <dl className="space-y-1 text-sm text-terra">
                {Object.entries(convidado.extra).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-oliva">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </form>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-terra/20 bg-creme-claro px-6 py-4">
          <Botao type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : convidado ? "Salvar" : "Adicionar"}
          </Botao>
          <Botao type="button" variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          {convidado && !convidado.user_id && (
            <button
              type="button"
              onClick={remover}
              className="versalete ml-auto text-xs text-red-800 underline underline-offset-4"
            >
              Remover
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      {children}
    </div>
  );
}
