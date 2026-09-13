import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { carregarCasamento } from "@/lib/configuracoes";
import { meuConvidado } from "@/lib/convidado";
import type {
  Acompanhante,
  Genero,
  Presenca,
  Rsvp,
  TipoLocal,
  Vinculo,
} from "@/lib/tipos";
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

  // Tudo que a tela precisa saber sobre esta pessoa.
  const [{ data: rsvp }, { data: acompanhantes }, { data: ficha }, { data: locais }] =
    await Promise.all([
      supabase.from("rsvps").select("*").eq("guest_id", eu.id).maybeSingle(),
      supabase
        .from("rsvp_companions")
        .select("*")
        .eq("guest_id", eu.id)
        .order("created_at"),
      supabase
        .from("guests")
        .select("relationship_kind, attends, age, gender")
        .eq("id", eu.id)
        .maybeSingle(),
      supabase.from("event_venues").select("kind, name").order("sort_order"),
    ]);

  const casamento = await carregarCasamento();

  const onde = (tipo: TipoLocal) =>
    (locais ?? []).find((l) => l.kind === tipo)?.name ?? null;

  const minhaFicha = ficha as {
    relationship_kind: Vinculo | null;
    attends: Presenca | null;
    age: number | null;
    gender: Genero | null;
  } | null;

  return (
    <FormRsvp
      nome={eu.full_name}
      rsvpInicial={(rsvp as Rsvp | null) ?? null}
      acompanhantesIniciais={(acompanhantes ?? []) as Acompanhante[]}
      vinculoInicial={minhaFicha?.relationship_kind ?? null}
      presencaInicial={minhaFicha?.attends ?? null}
      idadeInicial={minhaFicha?.age ?? null}
      generoInicial={minhaFicha?.gender ?? null}
      ondeCerimonia={onde("cerimonia")}
      ondeRecepcao={onde("recepcao")}
      regras={casamento.regrasAcompanhante}
      prazo={casamento.prazoRsvp}
    />
  );
}
