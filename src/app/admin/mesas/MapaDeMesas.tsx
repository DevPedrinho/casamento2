"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ROTULOS_PRESENCA_CURTO,
  type Acompanhante,
  type GrupoConvidados,
  type Mesa,
  type Presenca,
  type StatusConvite,
} from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

export type ConvidadoDaMesa = {
  id: string;
  full_name: string;
  group_id: string | null;
  table_id: string | null;
  attends: Presenca | null;
  invite_status: StatusConvite;
  age: number | null;
  is_featured: boolean;
  ceremony_role: string | null;
};

/** Uma cadeira: o titular ou alguém que ele trouxe. */
type Cadeira = {
  chave: string;
  nome: string;
  idade: number | null;
  presenca: Presenca | null;
  papel: string | null;
  /** Acompanhante senta com quem o trouxe; só o titular é movido. */
  titularId: string;
  eAcompanhante: boolean;
};

/**
 * O mapa de mesas.
 *
 * Quem vem é contado por cadeira, não por convite: o acompanhante ocupa um
 * lugar igual ao do titular. Mas quem se move é o titular — arrastar a
 * família inteira de uma vez é o que os noivos realmente querem fazer, e
 * ninguém senta longe de quem trouxe.
 */
export function MapaDeMesas({
  mesas,
  convidados,
  acompanhantes,
  grupos,
}: {
  mesas: Mesa[];
  convidados: ConvidadoDaMesa[];
  acompanhantes: Acompanhante[];
  grupos: GrupoConvidados[];
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [lugaresNovo, setLugaresNovo] = useState("8");
  const [busca, setBusca] = useState("");
  const [soFesta, setSoFesta] = useState(true);

  const supabase = criarClienteNavegador();

  /** Só entra no mapa quem vai à festa: a cerimônia não tem mesa marcada. */
  const vaiAFesta = (p: Presenca | null) => p === "ambos" || p === "recepcao";

  const porTitular = useMemo(() => {
    const mapa = new Map<string, Acompanhante[]>();
    for (const a of acompanhantes) {
      mapa.set(a.guest_id, [...(mapa.get(a.guest_id) ?? []), a]);
    }
    return mapa;
  }, [acompanhantes]);

  /** Cada titular vira um grupinho de cadeiras que anda junto. */
  const grupinhos = useMemo(() => {
    return convidados
      .filter((c) => c.invite_status !== "nao_vai")
      .filter((c) => !soFesta || vaiAFesta(c.attends) || c.attends === null)
      .map((c) => {
        const meus = porTitular.get(c.id) ?? [];
        const cadeiras: Cadeira[] = [
          {
            chave: c.id,
            nome: c.full_name,
            idade: c.age,
            presenca: c.attends,
            papel: c.ceremony_role,
            titularId: c.id,
            eAcompanhante: false,
          },
          ...meus
            .filter((a) => !soFesta || vaiAFesta(a.attends) || a.attends === null)
            .map((a) => ({
              chave: a.id,
              nome: a.full_name,
              idade: a.age,
              presenca: a.attends,
              papel: null,
              titularId: c.id,
              eAcompanhante: true,
            })),
        ];
        return { titular: c, cadeiras };
      });
  }, [convidados, porTitular, soFesta]);

  const porMesa = useMemo(() => {
    const mapa = new Map<string, typeof grupinhos>();
    const soltos: typeof grupinhos = [];
    for (const g of grupinhos) {
      if (!g.titular.table_id) soltos.push(g);
      else mapa.set(g.titular.table_id, [...(mapa.get(g.titular.table_id) ?? []), g]);
    }
    return { mapa, soltos };
  }, [grupinhos]);

  const totalCadeiras = grupinhos.reduce((s, g) => s + g.cadeiras.length, 0);
  const sentados = grupinhos
    .filter((g) => g.titular.table_id)
    .reduce((s, g) => s + g.cadeiras.length, 0);
  const lugaresCriados = mesas.reduce((s, m) => s + m.seats, 0);

  const semMesa = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return porMesa.soltos;
    return porMesa.soltos.filter((g) =>
      g.cadeiras.some((c) => c.nome.toLowerCase().includes(termo)),
    );
  }, [busca, porMesa.soltos]);

  async function criarMesa() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    setSalvando(true);
    await supabase.from("wedding_tables").insert({
      name: nome,
      seats: Number(lugaresNovo) || 8,
      sort_order: mesas.length,
    });
    setNomeNovo("");
    setSalvando(false);
    router.refresh();
  }

  /** Uma mesa por grupo familiar, com o tamanho já no ponto. */
  async function criarPelosGrupos() {
    const jaExistem = new Set(mesas.map((m) => m.name.toLowerCase()));
    const novas = grupos
      .filter((g) => !jaExistem.has(g.name.toLowerCase()))
      .map((g, i) => {
        const pessoas = grupinhos
          .filter((x) => x.titular.group_id === g.id)
          .reduce((s, x) => s + x.cadeiras.length, 0);
        return {
          name: g.name,
          seats: Math.min(30, Math.max(2, pessoas || 8)),
          sort_order: mesas.length + i,
        };
      });
    if (novas.length === 0) return;
    setSalvando(true);
    await supabase.from("wedding_tables").insert(novas);
    setSalvando(false);
    router.refresh();
  }

  async function mover(titularId: string, mesaId: string | null) {
    setSalvando(true);
    await supabase.from("guests").update({ table_id: mesaId }).eq("id", titularId);
    setSelecionado(null);
    setSalvando(false);
    router.refresh();
  }

  async function apagarMesa(mesa: Mesa) {
    setSalvando(true);
    await supabase.from("wedding_tables").delete().eq("id", mesa.id);
    setSalvando(false);
    router.refresh();
  }

  async function mudarLugares(mesa: Mesa, lugares: number) {
    setSalvando(true);
    await supabase.from("wedding_tables").update({ seats: lugares }).eq("id", mesa.id);
    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="versalete titulo-serif text-xs text-terra">Recepção</p>
        <h1 className="titulo-serif mt-2 text-3xl text-oliva sm:text-4xl lg:text-5xl">Mesas</h1>
        <p className="mt-3 max-w-2xl text-base text-terra">
          Quem vai à festa precisa de uma cadeira. Escolha uma pessoa da lista
          de fora e toque na mesa onde ela senta — os acompanhantes vão junto.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Mesas" valor={mesas.length} detalhe={`${lugaresCriados} lugares`} />
        <Indicador rotulo="Vão à festa" valor={totalCadeiras} detalhe="pessoas" />
        <Indicador rotulo="Já sentadas" valor={sentados} tom="oliva" />
        <Indicador
          rotulo="Sem mesa"
          valor={totalCadeiras - sentados}
          tom={totalCadeiras - sentados > 0 ? "alerta" : "oliva"}
        />
      </div>

      {/* ---------- Criar mesa ---------- */}
      <Bloco
        titulo="Criar mesa"
        descricao="Dê um nome que vocês reconheçam de longe: “Mesa dos avós” vale mais que “Mesa 4”."
        acao={
          grupos.length > 0 ? (
            <Botao type="button" variante="contorno" onClick={criarPelosGrupos} disabled={salvando}>
              Criar uma por família
            </Botao>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <div>
            <Rotulo htmlFor="mesa-nome">Nome da mesa</Rotulo>
            <input
              id="mesa-nome"
              className="campo"
              placeholder="Mesa dos padrinhos"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
            />
          </div>
          <div>
            <Rotulo htmlFor="mesa-lugares">Lugares</Rotulo>
            <input
              id="mesa-lugares"
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              className="campo"
              value={lugaresNovo}
              onChange={(e) => setLugaresNovo(e.target.value)}
            />
          </div>
          <Botao type="button" onClick={criarMesa} disabled={salvando || !nomeNovo.trim()}>
            Criar
          </Botao>
        </div>
      </Bloco>

      {/* ---------- Quem ainda não sentou ---------- */}
      <Bloco
        titulo="Sem mesa"
        descricao={
          selecionado
            ? "Agora toque na mesa onde essa pessoa senta."
            : "Toque em alguém para escolher a mesa."
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Rotulo htmlFor="busca-mesa">Buscar</Rotulo>
            <input
              id="busca-mesa"
              className="campo"
              placeholder="Nome de quem você procura"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={soFesta}
              onChange={(e) => setSoFesta(e.target.checked)}
              className="h-5 w-5 accent-[var(--color-oliva)]"
            />
            <span className="text-sm text-terra">Só quem vai à festa</span>
          </label>
        </div>

        {semMesa.length === 0 ? (
          <Vazio>Todo mundo tem lugar. 💜</Vazio>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {semMesa.map((g) => (
              <li key={g.titular.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelecionado(selecionado === g.titular.id ? null : g.titular.id)
                  }
                  aria-pressed={selecionado === g.titular.id}
                  className={`min-h-11 rounded-sm border px-4 py-2 text-left text-sm transition-colors ${
                    selecionado === g.titular.id
                      ? "border-oliva bg-oliva text-creme-claro"
                      : "border-terra/25 bg-creme text-oliva hover:border-oliva/50"
                  }`}
                >
                  {g.titular.full_name}
                  {g.cadeiras.length > 1 && (
                    <span className="opacity-75"> +{g.cadeiras.length - 1}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {/* ---------- As mesas ---------- */}
      {mesas.length === 0 ? (
        <Bloco titulo="O salão">
          <Vazio>Nenhuma mesa criada ainda.</Vazio>
        </Bloco>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {mesas.map((mesa) => {
            const nela = porMesa.mapa.get(mesa.id) ?? [];
            const ocupados = nela.reduce((s, g) => s + g.cadeiras.length, 0);
            const cheia = ocupados > mesa.seats;

            return (
              <section
                key={mesa.id}
                className={`rounded-sm border bg-creme-claro p-6 ${
                  cheia ? "border-red-800/40" : "border-terra/20"
                }`}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="titulo-serif text-2xl text-oliva">{mesa.name}</h2>
                    <p className="mt-1 text-sm text-terra">
                      {ocupados} de {mesa.seats} lugares
                      {cheia && " — passou da conta"}
                    </p>
                  </div>
                  {cheia && <Selo tom="alerta">lotada</Selo>}
                </header>

                {selecionado && (
                  <Botao
                    type="button"
                    variante="contorno"
                    onClick={() => mover(selecionado, mesa.id)}
                    disabled={salvando}
                    className="mt-4 w-full"
                  >
                    Sentar aqui
                  </Botao>
                )}

                {nela.length === 0 ? (
                  <p className="mt-4 rounded-sm border border-dashed border-terra/30 px-4 py-5 text-center text-sm text-terra">
                    Mesa vazia.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {nela.map((g) => (
                      <li
                        key={g.titular.id}
                        className="flex items-start justify-between gap-3 rounded-sm border border-terra/15 bg-creme px-4 py-3"
                      >
                        <div className="min-w-0">
                          {g.cadeiras.map((c) => (
                            <p key={c.chave} className="truncate text-sm text-oliva">
                              {c.nome}
                              {c.papel && (
                                <span className="versalete ml-2 text-xs text-lavanda">
                                  {c.papel}
                                </span>
                              )}
                              {c.presenca && c.presenca !== "ambos" && (
                                <span className="ml-2 text-xs text-terra">
                                  {ROTULOS_PRESENCA_CURTO[c.presenca]}
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => mover(g.titular.id, null)}
                          disabled={salvando}
                          aria-label={`Tirar ${g.titular.full_name} da mesa`}
                          className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-terra transition-colors hover:text-red-800"
                        >
                          <Icone nome="fechar" className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-terra/15 pt-4">
                  <label className="flex min-h-11 items-center gap-2 text-terra">
                    <span className="versalete text-xs">Lugares</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      inputMode="numeric"
                      defaultValue={mesa.seats}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v && v !== mesa.seats) void mudarLugares(mesa, v);
                      }}
                      aria-label={`Lugares na ${mesa.name}`}
                      className="campo w-20 py-2"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => apagarMesa(mesa)}
                    disabled={salvando}
                    className="versalete ml-auto inline-flex min-h-11 items-center text-xs text-red-800 underline underline-offset-4"
                  >
                    Apagar mesa
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
