"use client";

import { useEffect, useState } from "react";
import { Great_Vibes } from "next/font/google";
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

/**
 * A letra cursiva do nome. Carregada só aqui (preload desligado): o resto
 * do site não baixa este arquivo.
 */
const manuscrita = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap", preload: false });

// Horizontal, 3:2 — como um convite de papel fotografado.
const LARGURA = 1500;
const ALTURA = 1000;

/** Faixa do meio, entre a lavanda e a capela: o nome nunca passa disso. */
const LARGURA_SEGURA_NOME = 580;
/** Faixa vertical do nome: entre o fio com coração e "para o casamento de".
 *  A cursiva tem laçadas altas e caudas longas — tudo cabe aqui dentro. */
const NOME_TOPO = 388;
const NOME_BASE = 598;
const CENTRO = LARGURA / 2;

// Os tons do tema (globals.css).
const COR = {
  papel: "#f5eee3",
  oliva: "#666a46",
  lavanda: "#6e5a80",
  lavandaClaro: "#b7a8c4",
  terra: "#5e4a3b",
};

/** Só arquivos do próprio site: imagem de outra origem "suja" o canvas. */
const ARTE = {
  monograma: "/img/monograma-dp.png",
  igreja: "/img/convite/igreja-interior.webp",
  lavanda: "/img/convite/ramo-lavanda.webp",
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
  let x = CENTRO - total / 2;
  ctx.textAlign = "left";
  letras.forEach((l, i) => {
    ctx.fillText(l, x, y);
    x += larguras[i] + espaco;
  });
}

/** Sorteio com semente: o papel sai igual em todo card. */
function sorteio(semente: number) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Papel artesanal: um grão bem leve e manchas de aquarela lilás. */
function pintarPapel(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COR.papel;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  const acaso = sorteio(22052027);
  const manchas: [number, number, number][] = [
    [120, 130, 260],
    [300, 60, 180],
    [80, 520, 220],
    [1240, 90, 240],
    [1420, 260, 200],
    [1320, 930, 230],
  ];
  for (const [x, y, r] of manchas) {
    // Várias bolhas pequenas e tortas formam uma mancha que não parece gradiente.
    for (let i = 0; i < 9; i++) {
      const bx = x + (acaso() - 0.5) * r;
      const by = y + (acaso() - 0.5) * r * 0.7;
      const br = r * (0.35 + acaso() * 0.45);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, "rgba(183, 168, 196, 0.055)");
      g.addColorStop(0.7, "rgba(183, 168, 196, 0.025)");
      g.addColorStop(1, "rgba(183, 168, 196, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
  }

  // Grão do papel.
  const imagem = ctx.getImageData(0, 0, LARGURA, ALTURA);
  const px = imagem.data;
  for (let i = 0; i < px.length; i += 4) {
    const v = (acaso() - 0.5) * 10;
    px[i] += v;
    px[i + 1] += v;
    px[i + 2] += v;
  }
  ctx.putImageData(imagem, 0, 0);
}

/** A capela na lateral direita, em lápis sobre o papel, sumindo rumo ao centro. */
function pintarCapela(ctx: CanvasRenderingContext2D, igreja: HTMLImageElement) {
  const altura = ALTURA;
  const largura = (igreja.width / igreja.height) * altura;
  const x = LARGURA - largura + 20;

  const camada = document.createElement("canvas");
  camada.width = LARGURA;
  camada.height = ALTURA;
  const c = camada.getContext("2d");
  if (!c) return;
  c.drawImage(igreja, x, 0, largura, altura);

  // Some da esquerda para a direita…
  c.globalCompositeOperation = "destination-in";
  const lateral = c.createLinearGradient(x, 0, x + largura * 0.55, 0);
  lateral.addColorStop(0, "rgba(0,0,0,0)");
  lateral.addColorStop(1, "rgba(0,0,0,1)");
  c.fillStyle = lateral;
  c.fillRect(0, 0, LARGURA, ALTURA);
  // …e suaviza no alto e embaixo, para não bater na moldura.
  const vertical = c.createLinearGradient(0, 0, 0, ALTURA);
  vertical.addColorStop(0, "rgba(0,0,0,0.25)");
  vertical.addColorStop(0.18, "rgba(0,0,0,1)");
  vertical.addColorStop(0.85, "rgba(0,0,0,1)");
  vertical.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = vertical;
  c.fillRect(0, 0, LARGURA, ALTURA);

  // "multiply": o branco do desenho vira papel, o traço fica como lápis.
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(camada, 0, 0);
  ctx.restore();
}

/** Ramos de lavanda subindo do canto inferior esquerdo. */
function pintarLavanda(ctx: CanvasRenderingContext2D, lavanda: HTMLImageElement) {
  const proporcao = lavanda.width / lavanda.height;

  // Um ramo de trás, menor e mais claro, deitado para a esquerda.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.translate(150, ALTURA + 20);
  ctx.rotate(-0.32);
  ctx.drawImage(lavanda, -40, -620, 620 * proporcao, 620);
  ctx.restore();

  // O ramo principal.
  ctx.save();
  ctx.globalAlpha = 0.95;
  const altura = 680;
  ctx.drawImage(lavanda, -30, ALTURA - altura + 30, altura * proporcao, altura);
  ctx.restore();
}

/** Fio com coração no meio, como nos títulos do site. */
function fioComCoracao(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = COR.terra;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CENTRO - 130, y);
  ctx.lineTo(CENTRO - 24, y);
  ctx.moveTo(CENTRO + 24, y);
  ctx.lineTo(CENTRO + 130, y);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = COR.lavanda;
  ctx.beginPath();
  ctx.moveTo(CENTRO, y + 10);
  ctx.bezierCurveTo(CENTRO - 18, y - 2, CENTRO - 10, y - 14, CENTRO, y - 5);
  ctx.bezierCurveTo(CENTRO + 10, y - 14, CENTRO + 18, y - 2, CENTRO, y + 10);
  ctx.fill();
}

async function desenharCard(nome: string): Promise<Blob> {
  const { titulo, corpo } = fontesDoSite();
  const cursiva = manuscrita.style.fontFamily;
  // A lista traz também a fonte reserva; a conferência é só da cursiva.
  const soCursiva = cursiva.split(",")[0].trim();

  // Pede as variações usadas no card; se alguma não vier, o desenho segue
  // com o que a página já tem (no pior caso, a fonte reserva) — fonte
  // nunca impede o card.
  await Promise.allSettled([
    document.fonts.load(`400 160px ${cursiva}`, nome),
    document.fonts.load(`500 60px ${titulo}`),
    document.fonts.load(`400 30px ${corpo}`),
  ]);
  await document.fonts.ready;
  // Sem a cursiva, o nome vai no itálico da Cormorant — elegante do mesmo jeito.
  const fonteDoNome = document.fonts.check(`400 160px ${soCursiva}`, nome)
    ? (px: number) => `400 ${px}px ${cursiva}`
    : (px: number) => `italic 400 ${px}px ${titulo}`;

  const [monograma, igreja, lavanda] = await Promise.all([
    carregar(ARTE.monograma),
    carregar(ARTE.igreja),
    carregar(ARTE.lavanda),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.imageSmoothingQuality = "high";

  pintarPapel(ctx);
  pintarCapela(ctx, igreja);
  pintarLavanda(ctx, lavanda);

  // Moldura fina em lavanda.
  ctx.save();
  ctx.strokeStyle = COR.lavanda;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, LARGURA - 60, ALTURA - 60);
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, LARGURA - 80, ALTURA - 80);
  ctx.restore();

  // Monograma no alto, presente sem mandar.
  const alturaMono = 150;
  const larguraMono = (monograma.width / monograma.height) * alturaMono;
  ctx.drawImage(monograma, CENTRO - larguraMono / 2, 62, larguraMono, alturaMono);

  ctx.textBaseline = "alphabetic";

  // "Você recebeu / um convite especial"
  ctx.fillStyle = COR.terra;
  ctx.font = `500 40px ${titulo}`;
  espacado(ctx, "VOCÊ RECEBEU", 272, 10);
  espacado(ctx, "UM CONVITE ESPECIAL", 322, 10);

  fioComCoracao(ctx, 362);

  // O nome: o maior destaque. Diminui aos poucos até caber na faixa —
  // na largura e na altura de verdade das letras (laçadas e caudas).
  ctx.fillStyle = COR.lavanda;
  ctx.textAlign = "center";
  const caixa = NOME_BASE - NOME_TOPO;
  let tamanho = 190;
  let medida: TextMetrics;
  for (;;) {
    ctx.font = fonteDoNome(tamanho);
    medida = ctx.measureText(nome);
    const alto = medida.actualBoundingBoxAscent + medida.actualBoundingBoxDescent;
    if ((medida.width <= LARGURA_SEGURA_NOME && alto <= caixa) || tamanho <= 60) break;
    tamanho -= 4;
  }
  // Centraliza o desenho real das letras dentro da faixa.
  const sobra = caixa - (medida.actualBoundingBoxAscent + medida.actualBoundingBoxDescent);
  ctx.fillText(nome, CENTRO, NOME_TOPO + Math.max(0, sobra) / 2 + medida.actualBoundingBoxAscent);

  ctx.fillStyle = COR.terra;
  ctx.font = `500 28px ${titulo}`;
  espacado(ctx, "PARA O CASAMENTO DE", 636, 7);

  ctx.fillStyle = COR.oliva;
  ctx.font = `500 66px ${titulo}`;
  espacado(ctx, `${CASAMENTO.noiva} & ${CASAMENTO.noivo}`.toUpperCase(), 722, 9);

  // Um raminho miúdo de lavanda, deitado, entre os nomes e a data.
  const prop = lavanda.width / lavanda.height;
  ctx.save();
  ctx.translate(CENTRO, 782);
  ctx.rotate(-Math.PI / 2 + 0.95);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(lavanda, -(60 * prop) / 2, -30, 60 * prop, 60);
  ctx.restore();

  ctx.fillStyle = COR.lavanda;
  ctx.font = `400 32px ${corpo}`;
  espacado(ctx, CASAMENTO.dataExtenso.toUpperCase(), 862, 8);

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
            className="w-full max-w-[22rem] rounded-sm border border-terra/20 shadow-sm"
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
