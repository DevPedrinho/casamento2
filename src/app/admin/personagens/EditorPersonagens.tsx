"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ROTULOS_SECAO_PERSONAGEM,
  SECOES_PERSONAGEM,
  TEXTOS_PERSONAGENS_PADRAO,
  type PersonagemCerimonia,
  type SecaoPersonagem,
  type TextosPersonagens,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";
import { FichaPersonagem } from "./FichaPersonagem";

export type ConvidadoResumo = { id: string; full_name: string; side: "noivo" | "noiva" | null };
export type PessoaNoPainel = PersonagemCerimonia & { url: string | null };

/** O que cada seção é, explicado para quem edita. */
const DICA_SECAO: Record<SecaoPersonagem, string> = {
  protagonistas: "Os noivos. Cartão grande, com o texto do “Conhecer melhor”.",
  raizes: "Pais e quem criou. Quatro cartões lado a lado.",
  ao_lado: "Madrinhas, padrinhos e amigos. O grupo vira aba na página.",
  cortejo: "Daminha, florista, pajem — os pequenos grandes papéis.",
};

/**
 * O módulo que edita a página pública /personagens: os textos da página e
 * cada pessoa, seção por seção, com foto, papel e ordem.
 *
 * Quem aponta para um convidado da lista também fica em destaque no mural,
 * com a etiqueta do papel — o painel cuida disso ao salvar.
 */
export function EditorPersonagens({
  pessoas,
  textos,
  convidados,
}: {
  pessoas: PessoaNoPainel[];
  textos: TextosPersonagens;
  convidados: ConvidadoResumo[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState<{ pessoa: PessoaNoPainel | null; secao: SecaoPersonagem } | null>(null);
  const [movendo, setMovendo] = useState<string | null>(null);
  const [textosAbertos, setTextosAbertos] = useState(false);

  const ativos = pessoas.filter((p) => p.is_active);
  const semFoto = ativos.filter((p) => !p.image_path).length;
  const semTexto = ativos.filter((p) => !p.description?.trim()).length;

  /** Troca de lugar com o vizinho: a ordem é só o número, então é uma dupla de updates. */
  async function mover(pessoa: PessoaNoPainel, direcao: -1 | 1) {
    const daSecao = pessoas.filter((p) => p.section === pessoa.section);
    const i = daSecao.findIndex((p) => p.id === pessoa.id);
    const vizinho = daSecao[i + direcao];
    if (!vizinho) return;
    setMovendo(pessoa.id);
    const supabase = criarClienteNavegador();
    // Se dois têm o mesmo número, a troca não mudaria nada: renumera pela posição.
    const ordemA = i + 1 + direcao;
    const ordemB = i + 1;
    await Promise.all([
      supabase.from("ceremony_people").update({ sort_order: ordemA }).eq("id", pessoa.id),
      supabase.from("ceremony_people").update({ sort_order: ordemB }).eq("id", vizinho.id),
    ]);
    setMovendo(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Site</p>
          <h1 className="titulo-serif mt-2 text-3xl text-oliva sm:text-4xl lg:text-5xl">
            Personagens da cerimônia
          </h1>
          <p className="mt-3 max-w-2xl text-base text-terra">
            A página pública com quem caminha com vocês até o altar: foto, papel e
            uma frase para cada pessoa. Quem está ligado a um convidado ganha também
            a etiqueta do papel no mural.
          </p>
        </div>
        <Link
          href="/personagens"
          target="_blank"
          rel="noopener noreferrer"
          className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-oliva underline underline-offset-4"
        >
          Ver a página no site
          <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Na página" valor={ativos.length} tom="oliva" />
        <Indicador rotulo="Sem foto" valor={semFoto} tom={semFoto > 0 ? "alerta" : "oliva"} detalhe={semFoto > 0 ? "aparecem com iniciais" : "todas com foto"} />
        <Indicador rotulo="Sem frase" valor={semTexto} tom={semTexto > 0 ? "lavanda" : "oliva"} />
        <Indicador rotulo="Escondidos" valor={pessoas.length - ativos.length} />
      </div>

      {/* ---------- Textos da página ---------- */}
      <Bloco
        titulo="Textos da página"
        descricao="Título, abertura, o subtítulo de cada bloco e a frase de fechamento."
        acao={
          <Botao type="button" variante="contorno" onClick={() => setTextosAbertos((v) => !v)}>
            {textosAbertos ? "Fechar" : "Editar textos"}
          </Botao>
        }
      >
        {textosAbertos ? (
          <FormTextos
            textos={textos}
            aoSalvar={() => {
              setTextosAbertos(false);
              router.refresh();
            }}
          />
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="versalete text-xs text-terra">Título</dt>
              <dd className="titulo-serif text-lg text-oliva">{textos.titulo}</dd>
            </div>
            <div>
              <dt className="versalete text-xs text-terra">Abertura</dt>
              <dd className="text-terra italic">“{textos.abertura}”</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="versalete text-xs text-terra">Fechamento</dt>
              <dd className="text-terra italic">“{textos.fechamento}”</dd>
            </div>
          </dl>
        )}
      </Bloco>

      {/* ---------- Uma seção por bloco da página ---------- */}
      {SECOES_PERSONAGEM.map((secao) => {
        const daSecao = pessoas.filter((p) => p.section === secao);
        return (
          <Bloco
            key={secao}
            titulo={ROTULOS_SECAO_PERSONAGEM[secao]}
            descricao={DICA_SECAO[secao]}
            acao={
              <Botao type="button" onClick={() => setAberta({ pessoa: null, secao })}>
                <Icone nome="mais" className="h-4 w-4" />
                Adicionar
              </Botao>
            }
          >
            {daSecao.length === 0 ? (
              <Vazio>Ninguém aqui ainda.</Vazio>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {daSecao.map((p, i) => (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-sm border px-3 py-3 transition-colors ${
                      p.is_active ? "border-terra/20 bg-creme" : "border-terra/15 bg-creme/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setAberta({ pessoa: p, secao })}
                      aria-label={`Editar ${p.name}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-terra/20 bg-creme-escuro">
                        {p.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-terra/60">
                            sem foto
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`titulo-serif block truncate text-lg ${p.is_active ? "text-oliva" : "text-terra/60"}`}>
                          {p.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-terra">
                          <span>{p.role_label}</span>
                          {p.group_label && <Selo tom="lavanda">{p.group_label}</Selo>}
                          {!p.is_active && <Selo tom="apagado">escondido</Selo>}
                          {!p.description?.trim() && p.is_active && <Selo tom="alerta">sem frase</Selo>}
                        </span>
                      </span>
                    </button>

                    <span className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => mover(p, -1)}
                        disabled={i === 0 || movendo !== null}
                        aria-label="Subir"
                        className="flex h-8 w-9 items-center justify-center rounded-sm border border-terra/25 text-sm text-terra disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(p, 1)}
                        disabled={i === daSecao.length - 1 || movendo !== null}
                        aria-label="Descer"
                        className="flex h-8 w-9 items-center justify-center rounded-sm border border-terra/25 text-sm text-terra disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        );
      })}

      {aberta && (
        <FichaPersonagem
          pessoa={aberta.pessoa}
          secaoInicial={aberta.secao}
          convidados={convidados}
          grupos={[...new Set(pessoas.map((p) => p.group_label?.trim()).filter(Boolean) as string[])]}
          proximaOrdem={pessoas.filter((p) => p.section === aberta.secao).length + 1}
          aoFechar={() => setAberta(null)}
          aoSalvar={() => {
            setAberta(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Os textos da página, campo a campo. Vazio volta para o padrão. */
function FormTextos({ textos, aoSalvar }: { textos: TextosPersonagens; aoSalvar: () => void }) {
  const [form, setForm] = useState<TextosPersonagens>(textos);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const CAMPOS: { chave: keyof TextosPersonagens; rotulo: string; longo?: boolean }[] = [
    { chave: "titulo", rotulo: "Título da página" },
    { chave: "abertura", rotulo: "Frase de abertura", longo: true },
    { chave: "protagonistas_sub", rotulo: "Subtítulo de “Os protagonistas”" },
    { chave: "raizes_sub", rotulo: "Subtítulo de “Nossas raízes”" },
    { chave: "ao_lado_sub", rotulo: "Subtítulo de “Quem caminha ao nosso lado”" },
    { chave: "cortejo_sub", rotulo: "Subtítulo de “Nosso cortejo”" },
    { chave: "fechamento", rotulo: "Frase de fechamento", longo: true },
  ];

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    // Só o que difere do padrão vai para o banco; o resto continua padrão.
    const texts: Partial<TextosPersonagens> = {};
    for (const c of CAMPOS) {
      const v = form[c.chave].trim();
      if (v && v !== TEXTOS_PERSONAGENS_PADRAO[c.chave]) texts[c.chave] = v;
    }
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("ceremony_page").update({ texts }).eq("id", true);
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    aoSalvar();
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.chave} className={c.longo ? "sm:col-span-2" : ""}>
            <Rotulo htmlFor={`txt-${c.chave}`}>{c.rotulo}</Rotulo>
            {c.longo ? (
              <textarea
                id={`txt-${c.chave}`}
                rows={2}
                className="campo resize-y"
                value={form[c.chave]}
                onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })}
              />
            ) : (
              <input
                id={`txt-${c.chave}`}
                className="campo"
                value={form[c.chave]}
                onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar textos"}
        </Botao>
        <Botao type="button" variante="contorno" onClick={() => setForm(TEXTOS_PERSONAGENS_PADRAO)}>
          Voltar ao padrão
        </Botao>
      </div>
    </form>
  );
}
