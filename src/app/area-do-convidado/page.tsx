import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { meuConvidado } from "@/lib/convidado";
import { ROTULOS_RSVP, type Rsvp } from "@/lib/tipos";
import { CASAMENTO } from "@/lib/config";
import { Secao } from "@/components/Secao";
import { BotaoLink } from "@/components/Botao";
import { Divisor } from "@/components/Ornamentos";
import { BotaoSair } from "@/components/BotaoSair";
import { ResgatarCodigo } from "./ResgatarCodigo";

export const metadata: Metadata = { title: "Minha área" };
export const dynamic = "force-dynamic";

export default async function AreaDoConvidado() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?proximo=/area-do-convidado");

  const eu = await meuConvidado();

  // Logado, mas a conta ainda não está ligada a ninguém da lista: em vez
  // de devolver para o login (que daria a volta e voltaria para cá), pede
  // o código do convite.
  if (!eu) {
    return (
      <Secao sobretitulo="Área do convidado" titulo="Quase lá">
        <ResgatarCodigo />
      </Secao>
    );
  }

  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("*")
    .eq("guest_id", eu.id)
    .maybeSingle();
  const perfil = eu;

  const resposta = rsvp as Rsvp | null;
  const primeiroNome = (perfil?.full_name ?? "").trim().split(" ")[0];

  return (
    <Secao
      sobretitulo="Área do convidado"
      titulo={primeiroNome ? `Oi, ${primeiroNome}` : "Sua área"}
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-sm border border-terra/20 bg-creme-claro p-8 text-center">
          <p className="versalete text-xs text-terra">Sua resposta</p>

          {resposta ? (
            <>
              <p className="titulo-serif mt-4 text-3xl text-oliva">
                {ROTULOS_RSVP[resposta.status]}
              </p>
              {resposta.status !== "nao_vou" && (
                <p className="mt-3 text-sm text-terra">
                  {resposta.companions === 0
                    ? "Você vem sozinho(a)."
                    : `Com ${resposta.companions} acompanhante${resposta.companions > 1 ? "s" : ""}.`}
                </p>
              )}
              {resposta.message && (
                <>
                  <Divisor className="my-6" />
                  <p className="titulo-serif text-base text-terra italic">
                    “{resposta.message}”
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="titulo-serif mt-4 text-xl text-terra italic">
              Você ainda não confirmou presença.
            </p>
          )}

          <BotaoLink href="/confirmar" className="mt-8" variante={resposta ? "contorno" : "solido"}>
            {resposta ? "Alterar resposta" : "Confirmar presença"}
          </BotaoLink>
        </div>

        <div className="mt-8 rounded-sm border border-terra/20 bg-creme-claro p-8 text-center">
          <p className="versalete text-xs text-terra">O grande dia</p>
          <p className="titulo-serif mt-4 text-2xl text-oliva">{CASAMENTO.dataExtenso}</p>
          <p className="mt-2 text-sm text-terra">
            Cerimônia às {CASAMENTO.horaCerimonia} · {CASAMENTO.local.nome}
          </p>
          <p className="mt-1 text-sm text-terra">Traje: {CASAMENTO.trajes}</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <BotaoLink href="/presentes" variante="lavanda">
            Lista de presentes
          </BotaoLink>
          {perfil?.is_admin && (
            <BotaoLink href="/admin" variante="contorno">
              Painel dos noivos
            </BotaoLink>
          )}
          <BotaoSair />
        </div>
      </div>
    </Secao>
  );
}
