"use client";

import { useRef, useState } from "react";
import type { FaixaDoSite } from "@/lib/musica";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import type { ConfiguracaoConvite } from "@/lib/tipos";
import { Botao } from "@/components/Botao";
import { Icone } from "@/components/Icones";
import { Ajuda, RotuloConfig, SecaoSalvavel } from "../configuracoes/ui";

const LIMITE_MB = 12;

type Coluna = Exclude<keyof ConfiguracaoConvite, "id" | "texts">;

/**
 * Convite Digital → Música. Por padrão toca a mesma de Nossa História; dá
 * para trocar por uma faixa só do convite, enviada aqui como na Timeline
 * (o arquivo é de vocês — o site só toca o que for enviado).
 */
export function MusicaConvite({
  form,
  set,
  sujo,
  aoSalvar,
  gravarArquivo,
  musicaHistoria,
}: {
  form: ConfiguracaoConvite;
  set: <C extends Coluna>(coluna: C, valor: ConfiguracaoConvite[C]) => void;
  sujo: boolean;
  aoSalvar: () => Promise<string | null>;
  gravarArquivo: (caminho: string | null) => Promise<string | null>;
  musicaHistoria: FaixaDoSite;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const propria = urlDoSite(form.music_file_path);
  const tocando = form.music_use_story ? musicaHistoria.arquivo : propria;
  const nome = form.music_title?.trim() || (form.music_use_story ? musicaHistoria.titulo : "Nossa música");

  async function enviarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
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
      const novo = `musica/convite-${crypto.randomUUID()}.${extensao}`;
      const { error } = await supabase.storage.from("site").upload(novo, arquivo, { contentType: arquivo.type });
      if (error) throw new Error(error.message);

      // O arquivo antigo só sai depois que o novo está gravado.
      const antigo = form.music_file_path;
      const problema = await gravarArquivo(novo);
      if (problema) throw new Error(problema);
      if (antigo) await supabase.storage.from("site").remove([antigo]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para enviar o arquivo. Tente de novo.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removerArquivo() {
    const antigo = form.music_file_path;
    const problema = await gravarArquivo(null);
    if (problema) {
      setErro(problema);
      return;
    }
    if (antigo) await criarClienteNavegador().storage.from("site").remove([antigo]);
  }

  const caixa = "flex cursor-pointer items-start gap-3 text-base text-oliva-escuro";
  const marca = "mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-oliva)]";

  return (
    <SecaoSalvavel
      id="musica"
      titulo="Música"
      descricao="Começa no toque em “abrir o convite” — nunca antes — e segue enquanto a pessoa lê."
      sujo={sujo}
      aoSalvar={aoSalvar}
    >
      <div className="space-y-6">
        <label className={caixa}>
          <input
            type="checkbox"
            checked={form.music_enabled}
            onChange={(e) => set("music_enabled", e.target.checked)}
            className={marca}
          />
          <span>
            Música ativa
            <span className="block text-sm text-terra">Desligada, o convite abre em silêncio e sem controle de som.</span>
          </span>
        </label>

        <div className={`space-y-6 ${form.music_enabled ? "" : "pointer-events-none opacity-50"}`}>
          <label className={caixa}>
            <input
              type="checkbox"
              checked={form.music_use_story}
              onChange={(e) => set("music_use_story", e.target.checked)}
              className={marca}
            />
            <span>
              Usar a música de Nossa História
              <span className="block text-sm text-terra">
                Hoje: {musicaHistoria.titulo}
                {musicaHistoria.artista ? ` — ${musicaHistoria.artista}` : ""}. Trocar lá troca aqui também.
              </span>
            </span>
          </label>

          {!form.music_use_story && (
            <div className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
              <p className="versalete titulo-serif text-sm text-oliva-escuro">Faixa só do convite</p>
              {erro && (
                <p role="alert" className="mt-2 text-sm font-medium text-red-800">
                  {erro}
                </p>
              )}
              {!propria && (
                <Ajuda>
                  Nenhum arquivo enviado. Enquanto não houver, o convite fica em silêncio — ou volte a
                  usar a música de Nossa História.
                </Ajuda>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  id="convite-arquivo-musica"
                  onChange={(e) => void enviarArquivo(e.target.files?.[0])}
                />
                <Botao type="button" variante="contorno" disabled={enviando} onClick={() => inputRef.current?.click()}>
                  <Icone nome="musica" className="h-4 w-4" />
                  {enviando ? "Enviando…" : propria ? "Trocar arquivo" : "Enviar arquivo"}
                </Botao>
                {propria && (
                  <button
                    type="button"
                    onClick={removerArquivo}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-red-800 underline underline-offset-4"
                  >
                    Remover arquivo
                  </button>
                )}
              </div>
              <Ajuda>MP3, M4A, OGG ou WAV, até {LIMITE_MB} MB. O arquivo sobe e fica gravado na hora.</Ajuda>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <RotuloConfig htmlFor="convite-musica-nome">Nome exibido</RotuloConfig>
              <input
                id="convite-musica-nome"
                className="campo"
                placeholder={form.music_use_story ? musicaHistoria.titulo : "Nossa música"}
                value={form.music_title ?? ""}
                onChange={(e) => set("music_title", e.target.value || null)}
              />
              <Ajuda>Aparece no controle discreto do convite. Em branco, usa o nome da faixa.</Ajuda>
            </div>
            <div>
              <RotuloConfig htmlFor="convite-musica-volume">
                Volume inicial · {Math.round(form.music_volume * 100)}%
              </RotuloConfig>
              <input
                id="convite-musica-volume"
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={form.music_volume}
                onChange={(e) => set("music_volume", Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-oliva)]"
              />
              <Ajuda>Uns 50% é confortável — lembre que muita gente abre com o celular no volume alto.</Ajuda>
            </div>
          </div>

          <label className={caixa}>
            <input
              type="checkbox"
              checked={form.music_loop}
              onChange={(e) => set("music_loop", e.target.checked)}
              className={marca}
            />
            <span>
              Repetir em loop
              <span className="block text-sm text-terra">Quando a faixa termina, começa de novo.</span>
            </span>
          </label>

          {tocando && (
            <div>
              <p className="versalete titulo-serif mb-2 text-sm text-oliva-escuro">Ouvir · {nome}</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={tocando} controls preload="none" className="w-full" />
            </div>
          )}
        </div>
      </div>
    </SecaoSalvavel>
  );
}
