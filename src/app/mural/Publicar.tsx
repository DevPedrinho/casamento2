"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { caminhoDaFoto, comprimirFoto, type FotoPronta } from "@/lib/imagem";
import { HORAS_DO_STORY, type TipoPost } from "@/lib/tipos";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Aviso } from "@/components/CartaoForm";

const MAX_LEGENDA = 2000;

export function Publicar({
  meuId,
  meuNome,
  aoPublicar,
}: {
  meuId: string;
  meuNome: string;
  aoPublicar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<FotoPronta | null>(null);
  const [legenda, setLegenda] = useState("");
  const [tipo, setTipo] = useState<TipoPost>("feed");
  const [erro, setErro] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function escolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setPreparando(true);
    try {
      setFoto(await comprimirFoto(arquivo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler a imagem.");
      setFoto(null);
    } finally {
      setPreparando(false);
      // Permite escolher o mesmo arquivo de novo depois de remover.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function limpar() {
    setFoto(null);
    setLegenda("");
    setTipo("feed");
    setErro(null);
  }

  async function publicar() {
    setErro(null);

    const texto = legenda.trim();
    if (!foto && !texto) {
      setErro("Escreva um recado ou escolha uma foto.");
      return;
    }
    if (tipo === "story" && !foto) {
      setErro("Story precisa de foto. Para só texto, publique no feed.");
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();

    let caminho: string | null = null;
    if (foto) {
      caminho = caminhoDaFoto(meuId);
      const { error } = await supabase.storage
        .from("mural")
        .upload(caminho, foto.arquivo, { contentType: "image/jpeg", upsert: false });

      if (error) {
        setErro("Não foi possível enviar a foto. Tente de novo.");
        setEnviando(false);
        return;
      }
    }

    const expiraEm =
      tipo === "story"
        ? new Date(Date.now() + HORAS_DO_STORY * 3_600_000).toISOString()
        : null;

    const { error } = await supabase.from("posts").insert({
      author_id: meuId,
      kind: tipo,
      caption: texto || null,
      image_path: caminho,
      expires_at: expiraEm,
    });

    if (error) {
      // A foto já subiu; sem o post ela viraria lixo no bucket.
      if (caminho) await supabase.storage.from("mural").remove([caminho]);
      setErro("Não foi possível publicar. Tente de novo.");
      setEnviando(false);
      return;
    }

    setEnviando(false);
    limpar();
    aoPublicar();
  }

  return (
    <section className="rounded-sm border border-terra/20 bg-creme-claro p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <Avatar nome={meuNome} />
        <div className="min-w-0 flex-1">
          <label htmlFor="legenda" className="sr-only">
            Escreva um recado
          </label>
          <textarea
            id="legenda"
            rows={3}
            maxLength={MAX_LEGENDA}
            className="campo resize-y"
            placeholder="Conta pra gente… escreva um recado ou poste uma foto."
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
          />

          {foto && (
            <div className="relative mt-4 overflow-hidden rounded-sm border border-terra/20">
              {/* Prévia local: a foto ainda não subiu. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.previa} alt="Prévia da foto escolhida" className="w-full" />
              <button
                type="button"
                onClick={() => setFoto(null)}
                aria-label="Remover foto"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-creme-claro/95 text-oliva shadow-sm transition-colors hover:bg-creme-escuro"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}

          {erro && <div className="mt-4"><Aviso tipo="erro">{erro}</Aviso></div>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={inputRef}
                id="foto"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={escolherFoto}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={preparando || enviando}
                className="versalete titulo-serif inline-flex items-center gap-2 rounded-full border border-terra/30 px-4 py-2 text-xs text-terra transition-colors hover:border-oliva hover:text-oliva disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="10" r="1.8" />
                  <path d="M21 16l-5-5-6 6" />
                </svg>
                {preparando ? "Preparando…" : foto ? "Trocar foto" : "Foto"}
              </button>

              {foto && (
                <div className="flex items-center gap-1.5 rounded-full border border-terra/25 p-1">
                  <BotaoTipo ativo={tipo === "feed"} onClick={() => setTipo("feed")}>
                    Feed
                  </BotaoTipo>
                  <BotaoTipo ativo={tipo === "story"} onClick={() => setTipo("story")}>
                    Story 24h
                  </BotaoTipo>
                </div>
              )}
            </div>

            <Botao type="button" onClick={publicar} disabled={enviando || preparando}>
              {enviando ? "Publicando…" : "Publicar"}
            </Botao>
          </div>
        </div>
      </div>
    </section>
  );
}

function BotaoTipo({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`versalete titulo-serif rounded-full px-3.5 py-1.5 text-xs transition-colors ${
        ativo ? "bg-oliva text-creme-claro" : "text-terra hover:text-oliva"
      }`}
    >
      {children}
    </button>
  );
}
