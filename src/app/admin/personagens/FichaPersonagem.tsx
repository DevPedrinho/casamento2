"use client";

import { useState, type FormEvent } from "react";
import {
  ROTULOS_SECAO_PERSONAGEM,
  SECOES_PERSONAGEM,
  type SecaoPersonagem,
} from "@/lib/tipos";
import { urlDoSite } from "@/lib/storage";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { UploadImagem } from "@/components/UploadImagem";
import { ACAO_FICHA, CartaoFicha, Ficha } from "@/components/Ficha";
import type { ConvidadoResumo, PessoaNoPainel } from "./EditorPersonagens";

/** Papéis sugeridos — atalho, não camisa de força. */
const PAPEIS = [
  "Noiva", "Noivo",
  "Mãe da Noiva", "Pai da Noiva", "Mãe do Noivo", "Pai do Noivo",
  "Madrinha", "Padrinho", "Daminha", "Florista", "Pajem", "Celebrante",
];

/**
 * Cria ou edita uma pessoa da página. Abre na mesma ficha dos outros
 * módulos, mas aqui a ficha é o formulário: foto, papel, seção, texto.
 */
export function FichaPersonagem({
  pessoa,
  secaoInicial,
  convidados,
  grupos,
  proximaOrdem,
  aoFechar,
  aoSalvar,
}: {
  pessoa: PessoaNoPainel | null;
  secaoInicial: SecaoPersonagem;
  convidados: ConvidadoResumo[];
  /** Grupos já usados em "ao nosso lado", para sugerir. */
  grupos: string[];
  proximaOrdem: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [form, setForm] = useState({
    name: pessoa?.name ?? "",
    role_label: pessoa?.role_label ?? "",
    section: pessoa?.section ?? secaoInicial,
    group_label: pessoa?.group_label ?? "",
    description: pessoa?.description ?? "",
    long_text: pessoa?.long_text ?? "",
    guest_id: pessoa?.guest_id ?? "",
    is_active: pessoa?.is_active ?? true,
  });
  const [imagem, setImagem] = useState<string | null>(pessoa?.image_path ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  /** Ao escolher um convidado, o nome vem junto se ainda estiver vazio. */
  function escolherConvidado(id: string) {
    const c = convidados.find((x) => x.id === id);
    setForm((f) => ({ ...f, guest_id: id, name: f.name.trim() || c?.full_name || "" }));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!form.name.trim()) {
      setErro("Dê um nome à pessoa.");
      return;
    }
    if (!form.role_label.trim()) {
      setErro("Escreva o papel: Madrinha, Pai da Noiva…");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      name: form.name.trim(),
      role_label: form.role_label.trim(),
      section: form.section,
      group_label: form.section === "ao_lado" ? form.group_label.trim() || null : null,
      description: form.description.trim() || null,
      long_text: form.section === "protagonistas" ? form.long_text.trim() || null : null,
      guest_id: form.guest_id || null,
      image_path: imagem,
      is_active: form.is_active,
    };

    const { error } = pessoa
      ? await supabase.from("ceremony_people").update(dados).eq("id", pessoa.id)
      : await supabase.from("ceremony_people").insert({ ...dados, sort_order: proximaOrdem });

    if (error) {
      setSalvando(false);
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }

    // Quem está ligado a um convidado ganha a etiqueta do papel no mural.
    if (dados.guest_id) {
      await supabase
        .from("guests")
        .update({ is_featured: true, ceremony_role: dados.role_label })
        .eq("id", dados.guest_id);
    }

    setSalvando(false);
    aoSalvar();
  }

  async function remover() {
    if (!pessoa) return;
    if (!confirm(`Tirar ${pessoa.name} da página? A foto também sai.`)) return;
    const supabase = criarClienteNavegador();
    if (pessoa.image_path) await supabase.storage.from("site").remove([pessoa.image_path]);
    await supabase.from("ceremony_people").delete().eq("id", pessoa.id);
    aoSalvar();
  }

  return (
    <Ficha
      rotuloAria={pessoa ? `Editar ${pessoa.name}` : "Nova pessoa na página"}
      aoFechar={aoFechar}
      cabecalho={
        <>
          <p className="versalete text-xs text-terra">{ROTULOS_SECAO_PERSONAGEM[form.section]}</p>
          <h2 className="titulo-serif mt-1 text-2xl leading-tight text-oliva">
            {form.name.trim() || (pessoa ? pessoa.name : "Nova pessoa")}
          </h2>
        </>
      }
      rodape={
        <>
          <Botao type="button" onClick={salvar} disabled={salvando} className="flex-1 sm:flex-none">
            {salvando ? "Salvando…" : pessoa ? "Salvar" : "Adicionar"}
          </Botao>
          <Botao type="button" variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          {pessoa && (
            <button type="button" onClick={remover} className={`${ACAO_FICHA} ml-auto px-3 text-red-800`}>
              Remover
            </button>
          )}
        </>
      }
    >
      <form onSubmit={salvar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <CartaoFicha titulo="Foto">
          <UploadImagem
            pasta="personagens"
            caminhoAtual={imagem}
            urlAtual={urlDoSite(imagem)}
            aoEnviar={setImagem}
            aoRemover={() => setImagem(null)}
            rotulo="Retrato (fica quadrado na página)"
            proporcao="aspect-square"
          />
        </CartaoFicha>

        <CartaoFicha titulo="Quem é">
          <div className="space-y-4">
            <div>
              <Rotulo htmlFor="p-nome">Nome como aparece na página</Rotulo>
              <input id="p-nome" required className="campo" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="p-papel">Papel</Rotulo>
                <input id="p-papel" list="papeis-personagem" required className="campo" placeholder="Madrinha, Pai da Noiva…" value={form.role_label} onChange={(e) => set("role_label", e.target.value)} />
                <datalist id="papeis-personagem">
                  {PAPEIS.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <Rotulo htmlFor="p-secao">Bloco da página</Rotulo>
                <select id="p-secao" className="campo" value={form.section} onChange={(e) => set("section", e.target.value as SecaoPersonagem)}>
                  {SECOES_PERSONAGEM.map((s) => (
                    <option key={s} value={s}>{ROTULOS_SECAO_PERSONAGEM[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            {form.section === "ao_lado" && (
              <div>
                <Rotulo htmlFor="p-grupo">Grupo (vira aba na página)</Rotulo>
                <input id="p-grupo" list="grupos-personagem" className="campo" placeholder="Madrinhas, Padrinhos, Amigos…" value={form.group_label} onChange={(e) => set("group_label", e.target.value)} />
                <datalist id="grupos-personagem">
                  {[...new Set(["Madrinhas", "Padrinhos", ...grupos])].map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
            )}
            <div>
              <Rotulo htmlFor="p-convidado">Convidado da lista (opcional)</Rotulo>
              <select id="p-convidado" className="campo" value={form.guest_id} onChange={(e) => escolherConvidado(e.target.value)}>
                <option value="">Não está na lista de convidados</option>
                {convidados.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-relaxed text-terra/90">
                Ligado a um convidado, ganha a etiqueta do papel no mural e o que publicar sobe no feed.
              </p>
            </div>
          </div>
        </CartaoFicha>

        <CartaoFicha titulo="Texto">
          <div className="space-y-4">
            <div>
              <Rotulo htmlFor="p-desc">Frase do cartão</Rotulo>
              <textarea id="p-desc" rows={3} className="campo resize-y" placeholder="Uma amizade que faz a vida mais leve." value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            {form.section === "protagonistas" && (
              <div>
                <Rotulo htmlFor="p-longo">Texto do “Conhecer melhor”</Rotulo>
                <textarea id="p-longo" rows={6} className="campo resize-y" value={form.long_text} onChange={(e) => set("long_text", e.target.value)} />
              </div>
            )}
          </div>
        </CartaoFicha>

        <CartaoFicha titulo="Visibilidade">
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-5 w-5 accent-[var(--color-oliva)]" />
            <span className="text-sm text-terra">Aparece na página do site</span>
          </label>
        </CartaoFicha>
      </form>
    </Ficha>
  );
}
