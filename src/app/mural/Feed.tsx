"use client";

import { useState, type FormEvent } from "react";
import type { Publicacao } from "@/lib/tipos";
import { tempoRelativo } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";
import { Coracao } from "@/components/Ornamentos";

export function Feed({
  publicacoes,
  meuId,
  souAdmin,
  aoMudar,
}: {
  publicacoes: Publicacao[];
  meuId: string;
  souAdmin: boolean;
  aoMudar: () => void;
}) {
  if (publicacoes.length === 0) {
    return (
      <p className="titulo-serif py-10 text-center text-lg text-terra italic">
        O mural ainda está em branco. Seja o primeiro a postar!
      </p>
    );
  }

  return (
    <ul className="space-y-8">
      {publicacoes.map((post) => (
        <CartaoPost
          key={post.id}
          post={post}
          meuId={meuId}
          souAdmin={souAdmin}
          aoMudar={aoMudar}
        />
      ))}
    </ul>
  );
}

function CartaoPost({
  post,
  meuId,
  souAdmin,
  aoMudar,
}: {
  post: Publicacao;
  meuId: string;
  souAdmin: boolean;
  aoMudar: () => void;
}) {
  // Curtida com resposta otimista: o coração pinta na hora, sem esperar a rede.
  const [curti, setCurti] = useState(post.eu_curti);
  const [total, setTotal] = useState(post.curtidas);
  const [comentando, setComentando] = useState(false);
  const [denunciado, setDenunciado] = useState(false);

  const meu = post.author_id === meuId;
  const nome = post.autor?.full_name ?? "Convidado";

  async function alternarCurtida() {
    const novo = !curti;
    setCurti(novo);
    setTotal((t) => t + (novo ? 1 : -1));

    const supabase = criarClienteNavegador();
    const { error } = novo
      ? await supabase.from("post_likes").insert({ post_id: post.id, guest_id: meuId })
      : await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("guest_id", meuId);

    if (error) {
      // Desfaz o otimismo se o banco recusou.
      setCurti(!novo);
      setTotal((t) => t + (novo ? -1 : 1));
    }
  }

  async function apagar() {
    if (!confirm("Apagar esta publicação?")) return;
    const supabase = criarClienteNavegador();
    await supabase.from("posts").delete().eq("id", post.id);
    if (post.image_path) await supabase.storage.from("mural").remove([post.image_path]);
    aoMudar();
  }

  async function denunciar() {
    const motivo = prompt("O que há de errado com esta publicação? (opcional)");
    if (motivo === null) return;
    const supabase = criarClienteNavegador();
    await supabase.from("post_reports").insert({
      post_id: post.id,
      reporter_id: meuId,
      reason: motivo.trim() || null,
    });
    setDenunciado(true);
  }

  return (
    <li className="overflow-hidden rounded-sm border border-terra/20 bg-creme-claro">
      <header className="flex items-center gap-3 px-6 py-4">
        <Avatar nome={nome} />
        <div className="min-w-0 flex-1">
          <p className="titulo-serif truncate text-lg text-oliva">{meu ? "Você" : nome}</p>
          <p className="text-xs text-terra">{tempoRelativo(post.created_at)}</p>
        </div>
        {post.is_hidden && (
          <span className="versalete rounded-full bg-red-800/15 px-3 py-1 text-xs text-red-900">
            Oculto
          </span>
        )}
      </header>

      {post.caption && (
        <p className="whitespace-pre-wrap px-6 pb-4 text-base leading-relaxed text-terra">
          {post.caption}
        </p>
      )}

      {post.imagem_url && (
        // URL assinada e temporária: o otimizador do next/image não se aplica.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imagem_url}
          alt={post.caption ?? `Foto publicada por ${nome}`}
          loading="lazy"
          className="w-full bg-creme-escuro"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-terra/15 px-6 py-4">
        <button
          type="button"
          onClick={alternarCurtida}
          aria-pressed={curti}
          className={`inline-flex items-center gap-2 text-sm transition-colors ${
            curti ? "text-lavanda" : "text-terra hover:text-lavanda"
          }`}
        >
          <Coracao className={`w-4 ${curti ? "" : "opacity-45"}`} />
          {total > 0 ? total : ""} {total === 1 ? "curtida" : total > 1 ? "curtidas" : "Curtir"}
        </button>

        <button
          type="button"
          onClick={() => setComentando((v) => !v)}
          className="text-sm text-terra transition-colors hover:text-oliva"
        >
          {post.comentarios.length > 0
            ? `${post.comentarios.length} ${post.comentarios.length === 1 ? "comentário" : "comentários"}`
            : "Comentar"}
        </button>

        <div className="ml-auto flex items-center gap-4">
          {(meu || souAdmin) && (
            <button
              type="button"
              onClick={apagar}
              className="versalete text-xs text-red-800 underline underline-offset-4"
            >
              Apagar
            </button>
          )}
          {!meu && !souAdmin && (
            <button
              type="button"
              onClick={denunciar}
              disabled={denunciado}
              className="versalete text-xs text-terra/70 underline underline-offset-4 disabled:no-underline"
            >
              {denunciado ? "Denunciado" : "Denunciar"}
            </button>
          )}
        </div>
      </div>

      {(comentando || post.comentarios.length > 0) && (
        <Comentarios
          post={post}
          meuId={meuId}
          souAdmin={souAdmin}
          mostrarCampo={comentando}
          aoMudar={aoMudar}
        />
      )}
    </li>
  );
}

function Comentarios({
  post,
  meuId,
  souAdmin,
  mostrarCampo,
  aoMudar,
}: {
  post: Publicacao;
  meuId: string;
  souAdmin: boolean;
  mostrarCampo: boolean;
  aoMudar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = texto.trim();
    if (!corpo) return;

    setEnviando(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, guest_id: meuId, body: corpo });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível comentar agora.");
      return;
    }
    setTexto("");
    aoMudar();
  }

  async function apagar(id: string) {
    const supabase = criarClienteNavegador();
    await supabase.from("post_comments").delete().eq("id", id);
    aoMudar();
  }

  return (
    <div className="border-t border-terra/15 bg-creme px-6 py-5">
      {post.comentarios.length > 0 && (
        <ul className="space-y-4">
          {post.comentarios.map((c) => {
            const nome = c.autor?.full_name ?? "Convidado";
            const meuComentario = c.guest_id === meuId;
            return (
              <li key={c.id} className="flex items-start gap-3">
                <Avatar nome={nome} tamanho="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="titulo-serif text-base text-oliva">
                      {meuComentario ? "Você" : nome}
                    </span>
                    <span className="ml-2 text-xs text-terra/75">
                      {tempoRelativo(c.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-terra">
                    {c.body}
                  </p>
                </div>
                {(meuComentario || souAdmin) && (
                  <button
                    type="button"
                    onClick={() => apagar(c.id)}
                    aria-label="Apagar comentário"
                    className="versalete shrink-0 text-xs text-terra/60 underline underline-offset-4 hover:text-red-800"
                  >
                    Apagar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {mostrarCampo && (
        <form onSubmit={enviar} className="mt-5 flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor={`c-${post.id}`} className="sr-only">
              Escreva um comentário
            </label>
            <input
              id={`c-${post.id}`}
              className="campo"
              placeholder="Escreva um comentário…"
              maxLength={1000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            {erro && <p className="mt-2 text-sm text-red-800">{erro}</p>}
          </div>
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="versalete titulo-serif rounded-sm bg-oliva px-5 py-3 text-xs text-creme-claro transition-colors hover:bg-oliva-escuro disabled:opacity-50"
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </form>
      )}
    </div>
  );
}
