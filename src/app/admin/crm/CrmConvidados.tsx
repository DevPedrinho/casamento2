"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import {
  ETAPAS_CONVITE,
  ROTULOS_CONVITE,
  type ConvidadoCompleto,
  type StatusConvite,
} from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";
import { Indicador, Vazio } from "@/components/painel";

/** Cores da coluna, para o funil ser legível de relance. */
const TOM_COLUNA: Record<StatusConvite, string> = {
  nao_contatado: "border-terra/30",
  convite_enviado: "border-lavanda/50",
  visualizou: "border-lavanda/50",
  aguardando: "border-lavanda/50",
  confirmado: "border-oliva/50",
  nao_vai: "border-terra/20",
  follow_up: "border-red-800/40",
};

export function CrmConvidados({ convidados }: { convidados: ConvidadoCompleto[] }) {
  const router = useRouter();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<StatusConvite | null>(null);
  // Move o card na hora; o banco confirma logo atrás.
  const [otimista, setOtimista] = useState<Record<string, StatusConvite>>({});

  const statusDe = (c: ConvidadoCompleto) => otimista[c.id] ?? c.invite_status;

  const colunas = useMemo(
    () =>
      ETAPAS_CONVITE.map((etapa) => ({
        etapa,
        itens: convidados.filter((c) => statusDe(c) === etapa),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convidados, otimista],
  );

  const totalPessoas = convidados
    .filter((c) => statusDe(c) === "confirmado")
    .reduce((s, c) => s + 1 + c.companions_planned, 0);

  async function mover(convidado: ConvidadoCompleto, destino: StatusConvite) {
    if (statusDe(convidado) === destino) return;

    const anterior = statusDe(convidado);
    setOtimista((o) => ({ ...o, [convidado.id]: destino }));

    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("guests")
      .update({
        invite_status: destino,
        last_contact_at: new Date().toISOString().slice(0, 10),
      })
      .eq("id", convidado.id);

    if (error) {
      // Volta o card se o banco recusou.
      setOtimista((o) => ({ ...o, [convidado.id]: anterior }));
      return;
    }
    router.refresh();
  }

  function aoSoltar(evento: DragEvent, destino: StatusConvite) {
    evento.preventDefault();
    setColunaAlvo(null);
    setArrastando(null);
    const id = evento.dataTransfer.getData("text/plain");
    const convidado = convidados.find((c) => c.id === id);
    if (convidado) void mover(convidado, destino);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="versalete titulo-serif text-xs text-terra">Funil do convite</p>
        <h1 className="titulo-serif mt-2 text-4xl text-oliva">CRM de convidados</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-terra">
          Arraste os cards entre as etapas. O status muda no mesmo cadastro que o
          gerenciador de convidados usa — não existe lista paralela.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="No funil" valor={convidados.length} />
        <Indicador
          rotulo="Confirmados"
          valor={colunas.find((c) => c.etapa === "confirmado")?.itens.length ?? 0}
          tom="oliva"
          detalhe={`${totalPessoas} pessoas`}
        />
        <Indicador
          rotulo="Sem convite"
          valor={colunas.find((c) => c.etapa === "nao_contatado")?.itens.length ?? 0}
          tom="alerta"
        />
        <Indicador
          rotulo="Follow-up"
          valor={colunas.find((c) => c.etapa === "follow_up")?.itens.length ?? 0}
          tom="lavanda"
        />
      </div>

      {/* Kanban: rola na horizontal, como manda o formato */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        <div className="flex w-max gap-4">
          {colunas.map(({ etapa, itens }) => (
            <section
              key={etapa}
              onDragOver={(e) => {
                e.preventDefault();
                setColunaAlvo(etapa);
              }}
              onDragLeave={() => setColunaAlvo((c) => (c === etapa ? null : c))}
              onDrop={(e) => aoSoltar(e, etapa)}
              className={`flex w-72 shrink-0 flex-col rounded-sm border-2 bg-creme-claro transition-colors ${
                colunaAlvo === etapa ? "border-oliva bg-oliva/5" : TOM_COLUNA[etapa]
              }`}
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-terra/15 px-4 py-3.5">
                <h2 className="versalete titulo-serif text-xs text-oliva">
                  {ROTULOS_CONVITE[etapa]}
                </h2>
                <span className="titulo-serif text-base text-terra tabular-nums lining-nums">
                  {itens.length}
                </span>
              </header>

              <div className="flex-1 space-y-2.5 p-3">
                {itens.length === 0 ? (
                  <p className="py-6 text-center text-sm text-terra/60">Vazio</p>
                ) : (
                  itens.map((c) => (
                    <CardConvidado
                      key={c.id}
                      convidado={c}
                      arrastando={arrastando === c.id}
                      aoIniciarArraste={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setArrastando(c.id);
                      }}
                      aoTerminarArraste={() => setArrastando(null)}
                      aoMover={(destino) => mover(c, destino)}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {convidados.length === 0 && <Vazio>Nenhum convidado cadastrado ainda.</Vazio>}
    </div>
  );
}

function CardConvidado({
  convidado: c,
  arrastando,
  aoIniciarArraste,
  aoTerminarArraste,
  aoMover,
}: {
  convidado: ConvidadoCompleto;
  arrastando: boolean;
  aoIniciarArraste: (e: DragEvent) => void;
  aoTerminarArraste: () => void;
  aoMover: (destino: StatusConvite) => void;
}) {
  const dias = diasAte(c.next_action_at);
  const urgente = dias !== null && dias <= 3;
  const fone = (c.whatsapp ?? c.phone ?? "").replace(/\D/g, "");

  return (
    <article
      draggable
      onDragStart={aoIniciarArraste}
      onDragEnd={aoTerminarArraste}
      className={`cursor-grab rounded-sm border border-terra/20 bg-creme p-3.5 transition-opacity active:cursor-grabbing ${
        arrastando ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar nome={c.full_name} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="titulo-serif truncate text-base text-oliva">{c.full_name}</p>
          <p className="truncate text-sm text-terra">
            {c.grupo?.name ?? "Sem grupo"}
            {c.companions_planned > 0 && ` · +${c.companions_planned}`}
          </p>
        </div>
      </div>

      {c.ceremony_role && (
        <p className="versalete mt-2 text-xs text-lavanda">{c.ceremony_role}</p>
      )}

      {fone && (
        <a
          href={`https://wa.me/55${fone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block truncate text-sm text-terra underline underline-offset-4 hover:text-oliva"
        >
          {c.whatsapp ?? c.phone}
        </a>
      )}

      {c.next_action && (
        <p className={`mt-2 text-sm ${urgente ? "font-medium text-red-800" : "text-terra"}`}>
          {c.next_action}
          {c.next_action_at && ` — ${formatarData(c.next_action_at)}`}
        </p>
      )}

      {c.last_contact_at && (
        <p className="mt-1.5 text-xs text-terra/70">
          último contato {formatarData(c.last_contact_at)}
        </p>
      )}

      {/* No celular não dá para arrastar: o seletor faz o mesmo trabalho. */}
      <label className="versalete mt-3 block text-xs text-terra lg:hidden">
        Mover
        <select
          value={c.invite_status}
          onChange={(e) => aoMover(e.target.value as StatusConvite)}
          className="mt-1 w-full rounded-sm border border-terra/30 bg-creme-claro px-2 py-1.5 text-sm normal-case tracking-normal text-oliva"
        >
          {ETAPAS_CONVITE.map((s) => (
            <option key={s} value={s}>{ROTULOS_CONVITE[s]}</option>
          ))}
        </select>
      </label>
    </article>
  );
}
