"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Denuncia, Publicacao } from "@/lib/tipos";
import { tempoRelativo, tempoRestante } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";

export function ModeracaoMural({
  publicacoes,
  stories,
  denuncias,
}: {
  publicacoes: Publicacao[];
  stories: Publicacao[];
  denuncias: Denuncia[];
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"feed" | "stories" | "denuncias">(
    denuncias.length > 0 ? "denuncias" : "feed",
  );

  const ocultos = publicacoes.filter((p) => p.is_hidden).length;
  const comentarios = publicacoes.reduce((s, p) => s + p.comentarios.length, 0);

  const abas = [
    ["feed", `Feed (${publicacoes.length})`],
    ["stories", `Stories (${stories.length})`],
    ["denuncias", `Denúncias (${denuncias.length})`],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Publicações" valor={publicacoes.length} />
        <Indicador rotulo="Stories no ar" valor={stories.length} tom="lavanda" />
        <Indicador rotulo="Comentários" valor={comentarios} />
        <Indicador
          rotulo="Denúncias"
          valor={denuncias.length}
          tom={denuncias.length > 0 ? "alerta" : "oliva"}
          detalhe={ocultos > 0 ? `${ocultos} oculta(s)` : undefined}
        />
      </div>

      <Bloco
        titulo="Moderação do mural"
        descricao="Ocultar tira a publicação do mural sem apagá-la. Apagar remove de vez, junto com a foto."
      >
        <div className="mb-7 flex flex-wrap gap-2.5">
          {abas.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setAba(valor)}
              aria-pressed={aba === valor}
              className={`versalete titulo-serif rounded-full border px-4 py-2 text-xs transition-colors ${
                aba === valor
                  ? "border-oliva bg-oliva text-creme-claro"
                  : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === "denuncias" ? (
          <ListaDenuncias
            denuncias={denuncias}
            publicacoes={[...publicacoes, ...stories]}
            aoMudar={() => router.refresh()}
          />
        ) : (
          <ListaPosts
            posts={aba === "feed" ? publicacoes : stories}
            aoMudar={() => router.refresh()}
          />
        )}
      </Bloco>
    </div>
  );
}

function ListaPosts({ posts, aoMudar }: { posts: Publicacao[]; aoMudar: () => void }) {
  if (posts.length === 0) return <Vazio>Nada publicado por aqui ainda.</Vazio>;

  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <LinhaPost key={post.id} post={post} aoMudar={aoMudar} />
      ))}
    </ul>
  );
}

function LinhaPost({ post, aoMudar }: { post: Publicacao; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const nome = post.autor?.full_name ?? "Convidado";

  async function alternarOculto() {
    setOcupado(true);
    const supabase = criarClienteNavegador();
    await supabase
      .from("posts")
      .update({
        is_hidden: !post.is_hidden,
        hidden_reason: post.is_hidden ? null : "Ocultado pelos noivos",
      })
      .eq("id", post.id);
    setOcupado(false);
    aoMudar();
  }

  async function apagar() {
    if (!confirm(`Apagar a publicação de ${nome}? Isso não pode ser desfeito.`)) return;
    setOcupado(true);
    const supabase = criarClienteNavegador();
    await supabase.from("posts").delete().eq("id", post.id);
    if (post.image_path) await supabase.storage.from("mural").remove([post.image_path]);
    setOcupado(false);
    aoMudar();
  }

  return (
    <li
      className={`rounded-sm border border-terra/20 bg-creme p-5 ${post.is_hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-4">
        <Avatar nome={nome} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="titulo-serif text-lg text-oliva">{nome}</p>
            <span className="text-xs text-terra">{tempoRelativo(post.created_at)}</span>
            {post.is_hidden && <Selo tom="alerta">Oculto</Selo>}
            {post.expires_at && <Selo tom="lavanda">some em {tempoRestante(post.expires_at)}</Selo>}
          </div>

          {post.caption && (
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-terra">
              {post.caption}
            </p>
          )}

          {post.imagem_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imagem_url}
              alt={`Foto publicada por ${nome}`}
              loading="lazy"
              className="mt-3 max-h-64 rounded-sm border border-terra/20 object-contain"
            />
          )}

          {post.comentarios.length > 0 && (
            <p className="mt-3 text-sm text-terra/85">
              {post.comentarios.length}{" "}
              {post.comentarios.length === 1 ? "comentário" : "comentários"}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-5 border-t border-terra/15 pt-4">
            <button
              type="button"
              onClick={alternarOculto}
              disabled={ocupado}
              className="versalete text-xs text-oliva underline underline-offset-4 disabled:opacity-50"
            >
              {post.is_hidden ? "Mostrar de novo" : "Ocultar do mural"}
            </button>
            <button
              type="button"
              onClick={apagar}
              disabled={ocupado}
              className="versalete text-xs text-red-800 underline underline-offset-4 disabled:opacity-50"
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function ListaDenuncias({
  denuncias,
  publicacoes,
  aoMudar,
}: {
  denuncias: Denuncia[];
  publicacoes: Publicacao[];
  aoMudar: () => void;
}) {
  if (denuncias.length === 0) {
    return <Vazio>Nenhuma denúncia. O mural está tranquilo.</Vazio>;
  }

  async function dispensar(id: string) {
    const supabase = criarClienteNavegador();
    await supabase.from("post_reports").delete().eq("id", id);
    aoMudar();
  }

  return (
    <ul className="space-y-4">
      {denuncias.map((d) => {
        const alvo = publicacoes.find((p) => p.id === d.post_id) ?? null;
        return (
          <li key={d.id} className="rounded-sm border border-red-800/25 bg-red-50/60 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="titulo-serif text-lg text-oliva">
                Denúncia de {d.denunciante?.full_name ?? "convidado"}
              </p>
              <span className="text-xs text-terra">{tempoRelativo(d.created_at)}</span>
            </div>

            {d.reason && (
              <p className="mt-2 text-base leading-relaxed text-terra">“{d.reason}”</p>
            )}

            {alvo ? (
              <div className="mt-4 border-t border-red-800/15 pt-4">
                <p className="text-sm text-terra">
                  Sobre a publicação de{" "}
                  <strong className="font-medium">
                    {alvo.autor?.full_name ?? "convidado"}
                  </strong>
                  {alvo.caption ? `: “${alvo.caption.slice(0, 120)}”` : ""}
                </p>
                <LinhaPost post={alvo} aoMudar={aoMudar} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-terra/80">
                A publicação denunciada já não existe mais.
              </p>
            )}

            <div className="mt-4">
              <Botao type="button" variante="contorno" onClick={() => dispensar(d.id)}>
                Dispensar denúncia
              </Botao>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
