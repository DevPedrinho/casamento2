import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { codigoCompleto, normalizarCodigo } from "@/lib/codigo";
import { Convite } from "../Convite";
import { montarConvite } from "../carregar";

export const metadata: Metadata = {
  title: "Convite",
  description: "Você está convidado para o nosso casamento.",
  // O link é de uma pessoa só: nada de aparecer em busca.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Resposta de public.convite_por_codigo. */
type DonoDoConvite = { ok: boolean; nome?: string; conta?: boolean };

/**
 * O convite individual: o mesmo código de oito caracteres que o convidado
 * já recebe para se cadastrar. Nada de token novo — o link é
 * /convite/ABCD2345 (com ou sem o traço).
 *
 * Código que não existe não vira erro: abre o convite, só que sem nome.
 */
export default async function ConviteIndividual({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));
  const supabase = await criarClienteServidor();

  const [{ data: resposta }, { data: sessao }] = await Promise.all([
    codigoCompleto(codigo)
      ? supabase.rpc("convite_por_codigo", { p_codigo: codigo })
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);

  const dono = resposta as DonoDoConvite | null;
  const logado = Boolean(sessao.user);

  // O botão de confirmar leva ao passo certo para esta pessoa:
  // já entrou → confirma; tem conta mas não entrou → entra;
  // ainda não tem conta → cadastro com o código já preenchido.
  let confirmarHref = "/confirmar";
  if (!logado && dono?.ok) {
    confirmarHref = dono.conta
      ? "/entrar?proximo=/confirmar"
      : `/cadastrar?codigo=${codigo}&proximo=/confirmar`;
  }

  const props = await montarConvite({
    convidado: dono?.ok ? (dono.nome ?? null) : null,
    confirmarHref,
  });
  return <Convite {...props} />;
}
