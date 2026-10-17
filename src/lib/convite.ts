import { CASAMENTO } from "@/lib/config";
import { formatarCodigo, normalizarCodigo } from "@/lib/codigo";

/**
 * O convite pronto para mandar no WhatsApp: mensagem com o código e o
 * link do site. Fica junto do gerador de link para os dois andarem
 * sempre iguais.
 */

/** Endereço do site, para colar no convite. */
export function enderecoDoSite(): string {
  const bruto = process.env.NEXT_PUBLIC_SITE_URL;
  if (bruto) return bruto.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** O convite digital individual: o mesmo código, sem o traço. */
export function linkDoConvite(codigo: string): string {
  return `/convite/${normalizarCodigo(codigo)}`;
}

/** Quem manda o convite pelo WhatsApp, em nome dos noivos. */
const CERIMONIALISTA = "Juliana";

/** O primeiro nome, para a saudação da mensagem e o card do convite. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(" ")[0] || "você";
}

/**
 * A mensagem do convite, escrita pela cerimonialista em nome dos noivos.
 * O negrito é o do WhatsApp (*assim*), e as quebras de linha ficam como
 * estão: o texto vai inteiro para o link, codificado em UTF-8.
 */
export function mensagemDoConvite(nome: string, codigo: string | null): string {
  const primeiro = primeiroNome(nome);
  const site = enderecoDoSite();
  const { noiva, noivo, dataExtenso } = CASAMENTO;
  const link = codigo ? `${site}${linkDoConvite(codigo)}` : `${site}/convite`;

  return [
    `Oi, *${primeiro}*! 💜 Tudo bem?`,
    "",
    `Aqui é a ${CERIMONIALISTA}, cerimonialista da ${noiva} e do ${noivo}. Estou passando para te entregar um convite muito especial: *eles vão se casar!* 💍✨`,
    "",
    `O grande dia será em *${dataExtenso}*, e eles ficaram muito felizes em ter você entre as pessoas escolhidas para compartilhar esse momento tão importante com eles. 🪻`,
    "",
    "Eles prepararam um convite especial para você. Por lá, você poderá conhecer um pouquinho mais da história deles e encontrar todas as informações do casamento:",
    "",
    "💌 *Acesse seu convite aqui:*",
    link,
    "",
    "Para confirmar sua presença, é bem simples:",
    "",
    "1. Acesse o convite pelo link acima;",
    "2. Clique em *“Confirmar presença”*;",
    "3. Faça seu cadastro e crie uma senha;",
    ...(codigo
      ? ["4. Quando solicitado, informe o seu código de convite:", `*${formatarCodigo(codigo)}*`]
      : ["4. Quando solicitado, informe o seu código de convite;"]),
    "5. Preencha as informações solicitadas e finalize a confirmação.",
    "",
    "🔐 *Importante:* esse código é exclusivo do seu convite. Por isso, não o compartilhe com outras pessoas.",
    "",
    "Depois do cadastro, você poderá acessar o site novamente sempre que quiser para consultar os detalhes e acompanhar as novidades do casamento.",
    "",
    `A ${noiva} e o ${noivo} estão preparando tudo com muito carinho e esperam muito poder celebrar esse dia ao seu lado! 💜🪻`,
    "",
    "Se surgir qualquer dúvida sobre o convite ou sobre a confirmação de presença, pode falar comigo por aqui. Será um prazer ajudar!",
    "",
    `*Cerimonial ${noiva} & ${noivo}* 💜`,
  ].join("\n");
}

/**
 * Link do WhatsApp com a mensagem pronta.
 *
 * Números da planilha vêm em formatos variados; aqui fica só o que
 * interessa: dígitos, com o 55 do Brasil na frente quando falta.
 *
 * Vai direto para api.whatsapp.com/send — o wa.me só redireciona para lá,
 * e nesse redirecionamento o WhatsApp do computador às vezes troca os
 * emojis (💜) pelo caractere quebrado U+FFFD. O texto segue em UTF-8 via encodeURIComponent.
 */
export function linkWhatsApp(telefone: string | null, texto: string): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;

  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://api.whatsapp.com/send?phone=${completo}&text=${encodeURIComponent(texto)}`;
}
