"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { MusicaDoSite } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco } from "@/components/painel";
import { Icone } from "@/components/Icones";

const LIMITE_MB = 12;

/**
 * Música que toca na página Nossa História.
 *
 * O arquivo é de vocês: compre a faixa (iTunes, Amazon, Google Play) e
 * envie o MP3 aqui. O site não baixa música de lugar nenhum — só toca o
 * que for enviado por este formulário.
 */
export function EditorMusica({ musica }: { musica: MusicaDoSite }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState(musica.title ?? "");
  const [artista, setArtista] = useState(musica.artist ?? "");
  const [caminho, setCaminho] = useState(musica.file_path);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const url = urlDoSite(caminho);

  async function enviarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setOk(null);

    if (!arquivo.type.startsWith("audio/")) {
      setErro("Escolha um arquivo de áudio (MP3, M4A, OGG ou WAV).");
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo tem mais de ${LIMITE_MB} MB. Use um MP3 de qualidade menor.`);
      return;
    }

    setEnviando(true);
    try {
      const supabase = criarClienteNavegador();
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "mp3";
      const novo = `musica/${crypto.randomUUID()}.${extensao}`;

      const { error } = await supabase.storage
        .from("site")
        .upload(novo, arquivo, { contentType: arquivo.type });
      if (error) throw new Error(error.message);

      // O arquivo antigo só sai depois que o novo subiu.
      const antigo = caminho;
      const { error: erroBanco } = await supabase
        .from("site_music")
        .update({ file_path: novo })
        .eq("id", true);
      if (erroBanco) throw new Error(erroBanco.message);

      if (antigo) await supabase.storage.from("site").remove([antigo]);

      setCaminho(novo);
      setOk("Música enviada. Ela já está tocando na página Nossa História.");
      router.refresh();
    } catch {
      setErro("Não deu para enviar o arquivo. Tente de novo.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover() {
    setErro(null);
    setOk(null);
    const supabase = criarClienteNavegador();
    const antigo = caminho;

    const { error } = await supabase
      .from("site_music")
      .update({ file_path: null })
      .eq("id", true);
    if (error) {
      setErro("Não deu para remover a música.");
      return;
    }

    if (antigo) await supabase.storage.from("site").remove([antigo]);
    setCaminho(null);
    setOk("Música removida. O player some do site.");
    router.refresh();
  }

  async function salvarNomes(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);

    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("site_music")
      .update({ title: titulo.trim() || null, artist: artista.trim() || null })
      .eq("id", true);

    setSalvando(false);
    if (error) {
      setErro("Não deu para salvar.");
      return;
    }
    setOk("Salvo.");
    router.refresh();
  }

  return (
    <Bloco
      titulo="Nossa música"
      descricao="Toca na página Nossa História, só depois que a pessoa clicar em “Ouvir nossa música”."
    >
      <div className="space-y-6">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {ok && <Aviso tipo="ok">{ok}</Aviso>}

        {url ? (
          <div className="rounded-sm border border-terra/20 bg-creme p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="titulo-serif text-lg text-oliva">
                {titulo || "Música do site"}
                {artista && <span className="text-base text-terra"> — {artista}</span>}
              </p>
              <button
                type="button"
                onClick={remover}
                className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-red-800 underline underline-offset-4"
              >
                <Icone nome="fechar" className="h-4 w-4" />
                Remover
              </button>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={url} controls preload="none" className="mt-4 w-full" />
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-terra/30 px-6 py-8 text-center">
            <p className="titulo-serif text-lg text-terra italic">
              Nenhuma música enviada ainda.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-terra">
              Envie o arquivo da música que vocês compraram (MP3, M4A, OGG ou
              WAV, até {LIMITE_MB} MB). Enquanto não tiver arquivo, o player
              nem aparece no site.
            </p>
          </div>
        )}

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            id="arquivo-musica"
            onChange={(e) => void enviarArquivo(e.target.files?.[0])}
          />
          <Botao
            type="button"
            variante="contorno"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            <Icone nome="musica" className="h-4 w-4" />
            {enviando ? "Enviando…" : url ? "Trocar arquivo" : "Enviar arquivo"}
          </Botao>
        </div>

        <form onSubmit={salvarNomes} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="musica-titulo">Nome da música</Rotulo>
            <input
              id="musica-titulo"
              className="campo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="A Thousand Years"
            />
          </div>
          <div>
            <Rotulo htmlFor="musica-artista">Artista</Rotulo>
            <input
              id="musica-artista"
              className="campo"
              value={artista}
              onChange={(e) => setArtista(e.target.value)}
              placeholder="Christina Perri"
            />
          </div>
          <div className="sm:col-span-2">
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar nomes"}
            </Botao>
          </div>
        </form>
      </div>
    </Bloco>
  );
}
