import type { StatusConvite } from "@/lib/tipos";

/** A cor de cada etapa do convite, a mesma na lista, na ficha e no CRM. */
export const TOM_STATUS: Record<StatusConvite, "neutro" | "oliva" | "lavanda" | "alerta" | "apagado"> = {
  nao_contatado: "neutro",
  convite_enviado: "lavanda",
  visualizou: "lavanda",
  aguardando: "lavanda",
  confirmado: "oliva",
  nao_vai: "apagado",
  follow_up: "alerta",
};
