"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import { tempoRelativo } from "@/lib/formato";
import {
  descreverEvento,
  estaOnline,
  JANELA_ONLINE_MS,
  nomeDaPagina,
  VISUAL_EVENTO,
  type EventoConvidado,
} from "@/lib/movimento";
import { Avatar } from "@/components/Avatar";
import { Bloco } from "@/components/painel";
import { Icone } from "@/components/Icones";

type Pessoa = { id: string; full_name: string; avatar_path: string | null };
type EventoComPessoa = EventoConvidado & { pessoa: Pessoa | null };
type Online = Pessoa & { last_seen_at: string; last_seen_path: string | null };

type Dados = {
  eventos: EventoComPessoa[];
  online: Online[];
  ultimo: Online | null;
  abriram: number;
  comCodigo: number;
  cadastrados: number;
  ativos7: number;
};

const POR_PAGINA = 15;
/** De quanto em quanto tempo o bloco se atualiza sozinho. */
const INTERVALO_MS = 30_000;

const linkDaFicha = (id: string) => `/admin/convidados?convidado=${id}`;

/**
 * O que os convidados andam fazendo no site: quem está online agora, quantos
 * abriram o convite e criaram cadastro, e a linha do tempo das últimas
 * atividades. Os noivos não aparecem aqui — o que eles fazem não conta.
 */
export function MovimentoConvidados() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [erro, setErro] = useState(false);
  // Um relógio que anda sozinho, para "há 2 min" e "online" não congelarem.
  const [, setTique] = useState(0);

  const carregar = useCallback(async (quantos: number) => {
    const supabase = criarClienteNavegador();
    const agora = Date.now();
    const desdeOnline = new Date(agora - JANELA_ONLINE_MS).toISOString();
    const desde7 = new Date(agora - 7 * 86_400_000).toISOString();
    const pessoa = "id, full_name, avatar_path";

    const [eventos, online, ultimo, aberturas, comCodigo, cadastrados, ativos7] = await Promise.all([
      supabase
        .from("guest_events")
        .select(`id, guest_id, kind, meta, created_at, pessoa:guests(${pessoa})`)
        .order("created_at", { ascending: false })
        .limit(quantos),
      supabase
        .from("guests")
        .select(`${pessoa}, last_seen_at, last_seen_path`)
        .eq("is_admin", false)
        .gte("last_seen_at", desdeOnline)
        .order("last_seen_at", { ascending: false }),
      supabase
        .from("guests")
        .select(`${pessoa}, last_seen_at, last_seen_path`)
        .eq("is_admin", false)
        .not("last_seen_at", "is", null)
        .order("last_seen_at", { ascending: false })
        .limit(1),
      supabase.from("guest_events").select("guest_id").in("kind", ["abriu_link", "abriu_convite"]),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("is_admin", false)
        .not("access_code", "is", null),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("is_admin", false)
        .not("user_id", "is", null),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("is_admin", false)
        .gte("last_seen_at", desde7),
    ]);

    if (eventos.error) {
      setErro(true);
      return;
    }
    setErro(false);

    // O embed do PostgREST vem ora objeto, ora array de um item.
    const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

    setDados({
      eventos: (eventos.data ?? []).map((e) => {
        const bruto = e as unknown as EventoConvidado & { pessoa: Pessoa | Pessoa[] | null };
        return { ...bruto, pessoa: um(bruto.pessoa) };
      }),
      online: (online.data ?? []) as Online[],
      ultimo: ((ultimo.data ?? [])[0] as Online | undefined) ?? null,
      abriram: new Set((aberturas.data ?? []).map((a) => a.guest_id)).size,
      comCodigo: comCodigo.count ?? 0,
      cadastrados: cadastrados.count ?? 0,
      ativos7: ativos7.count ?? 0,
    });
  }, []);

  useEffect(() => {
    void carregar(limite);
    const id = window.setInterval(() => {
      // Aba escondida não precisa gastar consulta.
      if (document.visibilityState === "visible") void carregar(limite);
      setTique((t) => t + 1);
    }, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar, limite]);

  const online = dados?.online.filter((p) => estaOnline(p.last_seen_at)) ?? [];

  return (
    <Bloco
      titulo="Movimento dos convidados"
      descricao="Quem está no site, quem abriu o convite e o que fizeram. Atualiza sozinho."
    >
      {!dados ? (
        <p className="text-sm text-terra">{erro ? "Não deu para carregar agora." : "Carregando…"}</p>
      ) : (
        <div className="space-y-6">
          {/* ---------- Agora ---------- */}
          <div>
            <p className="versalete flex items-center gap-2 text-xs text-terra">
              <span className="relative flex h-2.5 w-2.5">
                {online.length > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-oliva opacity-60" />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online.length > 0 ? "bg-oliva" : "bg-terra/30"}`} />
              </span>
              {online.length > 0 ? `Online agora · ${online.length}` : "Ninguém no site agora"}
            </p>

            {online.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {online.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={linkDaFicha(p.id)}
                      className="flex items-center gap-3 rounded-sm px-1 py-1 transition-colors hover:bg-oliva/5"
                    >
                      <Avatar nome={p.full_name} url={urlDoSite(p.avatar_path)} tamanho="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-oliva-escuro">{p.full_name}</span>
                        {nomeDaPagina(p.last_seen_path) && (
                          <span className="block truncate text-xs text-terra">em {nomeDaPagina(p.last_seen_path)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              dados.ultimo && (
                <p className="mt-2 text-sm text-terra">
                  Último acesso:{" "}
                  <Link href={linkDaFicha(dados.ultimo.id)} className="font-medium text-oliva underline-offset-4 hover:underline">
                    {dados.ultimo.full_name.split(" ")[0]}
                  </Link>
                  , {tempoRelativo(dados.ultimo.last_seen_at)}
                </p>
              )
            )}
          </div>

          {/* ---------- Números ---------- */}
          <dl className="grid grid-cols-3 gap-2 border-y border-terra/15 py-4 text-center">
            <Numero rotulo="Abriram o convite" valor={dados.abriram} de={dados.comCodigo} />
            <Numero rotulo="Com cadastro" valor={dados.cadastrados} de={dados.comCodigo} />
            <Numero rotulo="Entraram em 7 dias" valor={dados.ativos7} />
          </dl>

          {/* ---------- Linha do tempo ---------- */}
          <div>
            <p className="versalete text-xs text-terra">Últimas atividades</p>
            {dados.eventos.length === 0 ? (
              <p className="mt-3 text-sm text-terra italic">
                Assim que alguém abrir o convite ou entrar no site, aparece aqui.
              </p>
            ) : (
              <ol className="mt-3 space-y-1">
                {dados.eventos.map((e) => {
                  const visual = VISUAL_EVENTO[e.kind];
                  return (
                    <li key={e.id}>
                      <Link
                        href={linkDaFicha(e.guest_id)}
                        className="flex gap-3 rounded-sm px-1 py-1.5 transition-colors hover:bg-oliva/5"
                      >
                        <Icone nome={visual.icone} className={`mt-0.5 h-4 w-4 shrink-0 ${visual.tom}`} />
                        <span className="min-w-0 flex-1 text-sm leading-snug text-terra">
                          <span className="font-medium text-oliva-escuro">
                            {e.pessoa?.full_name.split(" ").slice(0, 2).join(" ") ?? "Convidado"}
                          </span>{" "}
                          {descreverEvento(e)}
                          <span className="block text-xs text-terra/80">
                            {e.meta?.historico ? "antes do registro · " : ""}
                            {tempoRelativo(e.created_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
            {dados.eventos.length >= limite && (
              <button
                type="button"
                onClick={() => setLimite((l) => l + POR_PAGINA)}
                className="versalete mt-3 text-xs text-oliva underline-offset-4 hover:underline"
              >
                Ver mais
              </button>
            )}
          </div>
        </div>
      )}
    </Bloco>
  );
}

function Numero({ rotulo, valor, de }: { rotulo: string; valor: number; de?: number }) {
  return (
    <div>
      <dd className="titulo-serif text-2xl leading-none text-oliva tabular-nums">
        {valor}
        {de !== undefined && de > 0 && <span className="text-base text-terra/80">/{de}</span>}
      </dd>
      <dt className="mt-1.5 text-xs leading-tight text-terra">{rotulo}</dt>
    </div>
  );
}
