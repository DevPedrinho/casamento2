"use client";

import { useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { tempoRelativo } from "@/lib/formato";
import {
  descreverEvento,
  estaOnline,
  nomeDaPagina,
  VISUAL_EVENTO,
  type EventoConvidado,
} from "@/lib/movimento";
import { CartaoFicha } from "@/components/Ficha";
import { Icone } from "@/components/Icones";

const MOSTRAR = 12;

/**
 * Na ficha do convidado: está online? quando entrou por último? e a linha
 * do tempo do que fez no site (abriu o convite, cadastrou, confirmou…).
 */
export function AtividadeNoSite({
  guestId,
  ultimoAcesso,
  ultimaPagina,
}: {
  guestId: string;
  ultimoAcesso: string | null;
  ultimaPagina: string | null;
}) {
  const [eventos, setEventos] = useState<EventoConvidado[] | null>(null);
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    let ativo = true;
    setEventos(null);
    void criarClienteNavegador()
      .from("guest_events")
      .select("id, guest_id, kind, meta, created_at")
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (ativo) setEventos((data ?? []) as EventoConvidado[]);
      });
    return () => {
      ativo = false;
    };
  }, [guestId]);

  const online = estaOnline(ultimoAcesso);
  const pagina = nomeDaPagina(ultimaPagina);
  const primeiraAbertura = eventos
    ?.filter((e) => e.kind === "abriu_link" || e.kind === "abriu_convite")
    .at(-1);
  const visiveis = todos ? eventos : eventos?.slice(0, MOSTRAR);

  return (
    <CartaoFicha titulo="Atividade no site">
      <p className="flex items-center gap-2 text-sm text-terra">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-oliva" : "bg-terra/30"}`} />
        {online ? (
          <span className="font-medium text-oliva">Online agora{pagina ? ` · em ${pagina}` : ""}</span>
        ) : ultimoAcesso ? (
          <span>
            Último acesso {tempoRelativo(ultimoAcesso)}
            {pagina ? ` · em ${pagina}` : ""}
          </span>
        ) : (
          <span>Ainda não entrou no site</span>
        )}
      </p>
      {primeiraAbertura && (
        <p className="mt-1 text-sm text-terra">
          Abriu o convite pela primeira vez {tempoRelativo(primeiraAbertura.created_at)}
        </p>
      )}

      {eventos === null ? (
        <p className="mt-3 text-sm text-terra">Carregando…</p>
      ) : eventos.length === 0 ? (
        <p className="mt-3 text-sm text-terra italic">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ol className="mt-3 space-y-2 border-t border-terra/15 pt-3">
          {visiveis?.map((e) => {
            const visual = VISUAL_EVENTO[e.kind];
            return (
              <li key={e.id} className="flex gap-3 text-sm leading-snug">
                <Icone nome={visual.icone} className={`mt-0.5 h-4 w-4 shrink-0 ${visual.tom}`} />
                <span className="min-w-0 flex-1 text-terra">
                  <span className="first-letter:uppercase block">{descreverEvento(e)}</span>
                  <span className="text-xs text-terra/80">
                    {e.meta?.historico ? "antes do registro · " : ""}
                    {new Date(e.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {eventos && eventos.length > MOSTRAR && (
        <button
          type="button"
          onClick={() => setTodos((t) => !t)}
          className="versalete mt-3 text-xs text-oliva underline-offset-4 hover:underline"
        >
          {todos ? "Mostrar menos" : `Ver tudo (${eventos.length})`}
        </button>
      )}
    </CartaoFicha>
  );
}
