"use client";

import { useRef, useState, type DragEvent } from "react";
import { comprimirFoto } from "@/lib/imagem";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Icone } from "@/components/Icones";

/**
 * Seleciona, arrasta, comprime e envia uma imagem para o bucket público
 * do site. Guarda o caminho no storage — nunca base64 no banco.
 */
export function UploadImagem({
  pasta,
  caminhoAtual,
  urlAtual,
  aoEnviar,
  aoRemover,
  rotulo = "Imagem",
  proporcao = "aspect-4/3",
}: {
  /** Prefixo da pasta no bucket, ex.: "presentes" ou "timeline". */
  pasta: string;
  caminhoAtual: string | null;
  urlAtual: string | null;
  aoEnviar: (caminho: string) => void;
  aoRemover: () => void;
  rotulo?: string;
  proporcao?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mostrando = previa ?? urlAtual;

  async function processar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);

    try {
      const foto = await comprimirFoto(arquivo);
      setPrevia(foto.previa);

      const caminho = `${pasta}/${crypto.randomUUID()}.jpg`;
      const supabase = criarClienteNavegador();
      const { error } = await supabase.storage
        .from("site")
        .upload(caminho, foto.arquivo, { contentType: "image/jpeg" });

      if (error) throw new Error("upload");

      // A imagem antiga só sai depois que a nova subiu.
      if (caminhoAtual) {
        await supabase.storage.from("site").remove([caminhoAtual]);
      }
      aoEnviar(caminho);
    } catch (e) {
      setPrevia(null);
      setErro(
        e instanceof Error && e.message !== "upload"
          ? e.message
          : "Não foi possível enviar a imagem. Tente de novo.",
      );
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function aoSoltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastando(false);
    void processar(evento.dataTransfer.files?.[0]);
  }

  async function remover() {
    if (caminhoAtual) {
      const supabase = criarClienteNavegador();
      await supabase.storage.from("site").remove([caminhoAtual]);
    }
    setPrevia(null);
    aoRemover();
  }

  return (
    <div>
      <p className="versalete mb-2 text-xs text-terra">{rotulo}</p>

      {mostrando ? (
        <div className={`relative overflow-hidden rounded-sm border border-terra/25 ${proporcao}`}>
          {/* Prévia local ou URL pública — o otimizador do next/image não se aplica. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mostrando} alt="Prévia" className="h-full w-full object-cover" />

          {enviando && (
            <div className="absolute inset-0 flex items-center justify-center bg-creme-claro/80">
              <span className="titulo-serif text-base text-oliva">Enviando…</span>
            </div>
          )}

          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              aria-label="Trocar imagem"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-creme-claro/95 text-oliva shadow-sm transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Icone nome="mural" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={remover}
              disabled={enviando}
              aria-label="Excluir imagem"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-creme-claro/95 text-red-800 shadow-sm transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Icone nome="fechar" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          disabled={enviando}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed px-6 py-10 transition-colors ${
            arrastando
              ? "border-oliva bg-oliva/5"
              : "border-terra/30 hover:border-oliva hover:bg-creme-escuro/30"
          } disabled:opacity-60`}
        >
          <Icone nome="mural" className="h-8 w-8 text-terra/70" />
          <span className="titulo-serif text-base text-oliva">
            {enviando ? "Enviando…" : "Selecionar ou arrastar imagem"}
          </span>
          <span className="text-sm text-terra/80">JPG, PNG ou WebP · até 25 MB</span>
        </button>
      )}

      {erro && <p className="mt-2 text-sm text-red-800">{erro}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => processar(e.target.files?.[0])}
      />
    </div>
  );
}
