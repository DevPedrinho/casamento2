import { redirect } from "next/navigation";

/** Local do evento agora mora dentro de Configurações; o endereço antigo leva até lá. */
export default function LocaisPage() {
  redirect("/admin/configuracoes#local-do-evento");
}
