"use client";

import { useEffect, useState } from "react";
import { CASAMENTO } from "@/lib/config";
import { ACAO_FICHA } from "@/components/Ficha";

/**
 * O card visual do convite: uma imagem com o nome do convidado, para ir
 * junto da mensagem no WhatsApp.
 *
 * É só um acessório. O link wa.me (o "mandar no WhatsApp" ao lado) só
 * carrega texto — não há como anexar imagem por ele —, então o card é
 * gerado aqui, no navegador, e sai por "baixar imagem". Se qualquer
 * coisa falhar, aparece um aviso e o envio pela
 * mensagem segue como sempre: nada aqui toca no convite, no código ou no
 * banco.
 */

const LARGURA = 1080;
const ALTURA = 1350; // 4:5 — o WhatsApp mostra grande, sem cortar.

// Os tons do tema (globals.css).
const COR = {
  fundo: "#f7f1e8",
  oliva: "#666a46",
  lavanda: "#6e5a80",
  terra: "#5e4a3b",
};

/** Só arquivos do próprio site: imagem de outra origem "suja" o canvas. */
const ARTE = {
  monograma: "/img/monograma-dp.png",
  igreja: "/img/convite/igreja-interior.webp",
  ramo: "/img/ramo-floral.png",
  ramoEspelhado: "/img/ramo-floral-espelhado.png",
};

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error(`não carregou ${src}`));
    img.src = src;
  });
}

/** As fontes que o site já carrega (next/font), pelo nome que ganharam. */
function fontesDoSite() {
  const estilo = getComputedStyle(document.body);
  const titulo = estilo.getPropertyValue("--fonte-titulo").trim() || "Georgia, serif";
  const corpo = estilo.getPropertyValue("--fonte-corpo").trim() || "system-ui, sans-serif";
  return { titulo, corpo };
}

/** Texto centralizado com espaço entre letras, desenhado letra a letra —
 *  o letterSpacing do canvas ainda não vale em todo navegador. */
function espacado(ctx: CanvasRenderingContext2D, texto: string, y: number, espaco: number) {
  const letras = [...texto];
  const larguras = letras.map((l) => ctx.measureText(l).width);
  const total = larguras.reduce((s, w) => s + w, 0) + espaco * (letras.length - 1);
  let x = (LARGURA - total) / 2;
  ctx.textAlign = "left";
  letras.forEach((l, i) => {
    ctx.fillText(l, x, y);
    x += larguras[i] + espaco;
  });
}

async function desenharCard(nome: string): Promise<Blob> {
  const { titulo, corpo } = fontesDoSite();
  // Pede as variações usadas no card; se alguma não vier, o desenho segue
  // com o que a página já tem (no pior caso, a fonte reserva) — fonte
  // nunca impede o card.
  await Promise.allSettled([
    document.fonts.load(`italic 400 120px ${titulo}`),
    document.fonts.load(`500 60px ${titulo}`),
    document.fonts.load(`400 30px ${corpo}`),
  ]);
  await document.fonts.ready;
  const [monograma, igreja, ramo, ramoEspelhado] = await Promise.all([
    carregar(ARTE.monograma),
    carregar(ARTE.igreja),
    carregar(ARTE.ramo),
    carregar(ARTE.ramoEspelhado),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  // Fundo creme e, bem de leve, o desenho da igreja por trás de tudo.
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  const escala = Math.max(LARGURA / igreja.width, ALTURA / igreja.height);
  ctx.globalAlpha = 0.13;
  ctx.drawImage(
    igreja,
    (LARGURA - igreja.width * escala) / 2,
    (ALTURA - igreja.height * escala) / 2,
    igreja.width * escala,
    igreja.height * escala,
  );
  ctx.globalAlpha = 1;

  // Um véu creme no miolo, para o texto ler limpo sobre o desenho.
  const veu = ctx.createRadialGradient(LARGURA / 2, 700, 80, LARGURA / 2, 700, 560);
  veu.addColorStop(0, "rgba(247, 241, 232, 0.92)");
  veu.addColorStop(1, "rgba(247, 241, 232, 0)");
  ctx.fillStyle = veu;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Moldura fina em lavanda.
  ctx.strokeStyle = COR.lavanda;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, LARGURA - 88, ALTURA - 88);
  ctx.globalAlpha = 1;

  // Ramos nos cantos de baixo.
  const alturaRamo = 330;
  const larguraRamo = (ramo.width / ramo.height) * alturaRamo;
  ctx.globalAlpha = 0.9;
  ctx.drawImage(ramo, 70, ALTURA - alturaRamo - 70, larguraRamo, alturaRamo);
  ctx.drawImage(ramoEspelhado, LARGURA - larguraRamo - 70, ALTURA - alturaRamo - 70, larguraRamo, alturaRamo);
  ctx.globalAlpha = 1;

  // Monograma no alto.
  const alturaMono = 230;
  const larguraMono = (monograma.width / monograma.height) * alturaMono;
  ctx.drawImage(monograma, (LARGURA - larguraMono) / 2, 110, larguraMono, alturaMono);

  ctx.textBaseline = "alphabetic";

  // "Você recebeu um convite especial"
  ctx.fillStyle = COR.terra;
  ctx.font = `400 32px ${corpo}`;
  espacado(ctx, "VOCÊ RECEBEU", 452, 9);
  espacado(ctx, "UM CONVITE ESPECIAL", 500, 9);

  // O nome: grande, em itálico — e diminui até caber.
  ctx.fillStyle = COR.oliva;
  let tamanho = 160;
  ctx.font = `italic 400 ${tamanho}px ${titulo}`;
  while (ctx.measureText(nome).width > LARGURA - 200 && tamanho > 60) {
    tamanho -= 6;
    ctx.font = `italic 400 ${tamanho}px ${titulo}`;
  }
  ctx.textAlign = "center";
  ctx.fillText(nome, LARGURA / 2, 680);

  // Fio com coração, como no site.
  const yFio = 745;
  ctx.strokeStyle = COR.terra;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LARGURA / 2 - 150, yFio);
  ctx.lineTo(LARGURA / 2 - 26, yFio);
  ctx.moveTo(LARGURA / 2 + 26, yFio);
  ctx.lineTo(LARGURA / 2 + 150, yFio);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = COR.lavanda;
  ctx.beginPath();
  const cx = LARGURA / 2;
  ctx.moveTo(cx, yFio + 11);
  ctx.bezierCurveTo(cx - 20, yFio - 2, cx - 11, yFio - 15, cx, yFio - 6);
  ctx.bezierCurveTo(cx + 11, yFio - 15, cx + 20, yFio - 2, cx, yFio + 11);
  ctx.fill();

  ctx.fillStyle = COR.terra;
  ctx.font = `italic 400 46px ${titulo}`;
  ctx.textAlign = "center";
  ctx.fillText("para o casamento de", LARGURA / 2, 830);

  ctx.fillStyle = COR.oliva;
  ctx.font = `500 70px ${titulo}`;
  espacado(ctx, `${CASAMENTO.noiva} & ${CASAMENTO.noivo}`.toUpperCase(), 925, 10);

  ctx.fillStyle = COR.lavanda;
  ctx.font = `400 32px ${corpo}`;
  espacado(ctx, CASAMENTO.dataExtenso.toUpperCase(), 990, 8);

  return new Promise((ok, falha) =>
    canvas.toBlob((blob) => (blob ? ok(blob) : falha(new Error("imagem vazia"))), "image/png"),
  );
}

export function CardConvite({
  nome,
  codigo,
}: {
  /** O primeiro nome, o mesmo da saudação da mensagem. */
  nome: string;
  /** Só para dar nome ao arquivo. */
  codigo: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Trocou de convidado: o card anterior não vale mais.
  useEffect(() => {
    setUrl(null);
    setErro(null);
  }, [nome, codigo]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function gerar() {
    setErro(null);
    setGerando(true);
    try {
      const blob = await desenharCard(nome);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setErro("Não deu para gerar o card agora — o envio pela mensagem continua normal.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="mt-3 border-t border-terra/15 pt-3">
      {!url ? (
        <button type="button" onClick={gerar} disabled={gerando} className={`${ACAO_FICHA} text-oliva`}>
          {gerando ? "gerando o card…" : "card do convite (imagem)"}
        </button>
      ) : (
        <div>
          <img
            src={url}
            alt={`Card do convite de ${nome}`}
            className="w-full max-w-[16rem] rounded-sm border border-terra/20 shadow-sm"
          />
          <div className="mt-2">
            <a href={url} download={`convite-${codigo}.png`} className={`${ACAO_FICHA} text-oliva`}>
              baixar imagem
            </a>
          </div>
          <p className="mt-1 text-xs text-terra/85">
            A imagem não tem link clicável: o link do convite vai sempre no texto da mensagem.
          </p>
        </div>
      )}
      {erro && <p className="mt-2 text-sm text-red-800">{erro}</p>}
    </div>
  );
}
