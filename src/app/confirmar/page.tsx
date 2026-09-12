import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import { meuConvidado } from "@/lib/convidado";
import type { Acompanhante, Rsvp } from "@/lib/tipos";
import { CartaoForm } from "@/components/CartaoForm";
import { BotaoLink } from "@/components/Botao";
import { FormRsvp } from "./FormRsvp";

export const metadata: Metadata = {
  title: "Confirmar Presença",
  description: "Confirme sua presença no nosso casamento.",
};

export const dynamic = "force-dynamic";

export default async function Confirmar() {
  const supabase = await criarClienteServidor();
  const eu = await meuConvidado();

  // Já entrou, mas a conta ainda não está ligada a ninguém da lista:
  // o código do convite resolve isso na área do convidado.
  if (!eu) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/area-do-convidado");
  }

  // Visitante sem cadastro: convite para criar a conta primeiro.
  if (!eu) {
    return (
      <CartaoForm
        sobretitulo="Confirmação de presença"
        titulo="Primeiro, seu cadastro"
        descricao="Para confirmar presença a gente precisa saber quem é você. Leva menos de um minuto."
        rodape={
          <>
            Já tem cadastro?{" "}
            <Link href="/entrar?proximo=/confirmar" className="inline-flex min-h-11 items-center text-oliva underline underline-offset-4">
              Entrar
            </Link>
          </>
        }
      >
        <BotaoLink href="/cadastrar?proximo=/confirmar" className="w-full">
          Criar meu cadastro
        </BotaoLink>
      </CartaoForm>
    );
  }

  // Tudo que a tela precisa saber sobre o convite desta pessoa.
  const [{ data: rsvp }, { data: acompanhantes }, { data: limite }, { data: ficha }] =
    await Promise.all([
      supabase.from("rsvps").select("*").eq("guest_id", eu.id).maybeSingle(),
      supabase
        .from("rsvp_companions")
        .select("*")
        .eq("guest_id", eu.id)
        .order("created_at"),
      supabase.rpc("limite_do_convite", { p_guest: eu.id }),
      supabase
        .from("guests")
        .select("group_id, grupo:guest_groups!guests_group_id_fkey ( name, invite_limit )")
        .eq("id", eu.id)
        .maybeSingle(),
    ]);

  const casamento = await carregarCasamento();

  const grupoBruto = (ficha as { grupo: unknown } | null)?.grupo;
  const grupo = (Array.isArray(grupoBruto) ? grupoBruto[0] : grupoBruto) as
    | { name: string; invite_limit: number | null }
    | null
    | undefined;

  // Quando o convite é de família, alguém da casa pode já ter confirmado
  // parte dos lugares por outro login.
  let usadosPorOutros = 0;
  const grupoId = (ficha as { group_id: string | null } | null)?.group_id;

  if (grupoId && grupo?.invite_limit) {
    const { data: irmaos } = await supabase
      .from("guests")
      .select("id, rsvps ( status, companions )")
      .eq("group_id", grupoId)
      .neq("id", eu.id);

    usadosPorOutros = (irmaos ?? []).reduce((soma, linha) => {
      const bruto = (linha as { rsvps: unknown }).rsvps;
      const resposta = (Array.isArray(bruto) ? bruto[0] : bruto) as
        | { status: string; companions: number }
        | null
        | undefined;
      if (!resposta || resposta.status === "nao_vou") return soma;
      return soma + 1 + (resposta.companions ?? 0);
    }, 0);
  }

  return (
    <FormRsvp
      nome={eu.full_name}
      rsvpInicial={(rsvp as Rsvp | null) ?? null}
      acompanhantesIniciais={(acompanhantes ?? []) as Acompanhante[]}
      limite={typeof limite === "number" ? limite : 1}
      lugaresUsadosPorOutros={usadosPorOutros}
      nomeDoGrupo={grupo?.name ?? null}
      regras={casamento.regrasAcompanhante}
      prazo={casamento.prazoRsvp}
    />
  );
}
