import { CASAMENTO } from "@/lib/config";
import { formatarCodigo } from "@/lib/codigo";

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

export function mensagemDoConvite(nome: string, codigo: string | null): string {
  const primeiro = nome.trim().split(" ")[0] || "você";
  const site = enderecoDoSite();

  return [
    `Oi, ${primeiro}! 💜`,
    "",
    `${CASAMENTO.noiva} e ${CASAMENTO.noivo} vão casar em ${CASAMENTO.dataExtenso} e você está na lista.`,
    "",
    `Seu código do convite: ${formatarCodigo(codigo)}`,
    `Confirme sua presença em ${site}/cadastrar`,
    "",
    "Use o código no cadastro — ele é só seu.",
  ].join("\n");
}

/**
 * Link do WhatsApp com a mensagem pronta.
 *
 * Números da planilha vêm em formatos variados; aqui fica só o que
 * interessa: dígitos, com o 55 do Brasil na frente quando falta.
 */
export function linkWhatsApp(telefone: string | null, texto: string): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;

  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
}
