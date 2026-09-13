"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Avatar } from "@/components/Avatar";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

export type Personagem = {
  id: string;
  full_name: string;
  side: "noivo" | "noiva" | null;
  ceremony_role: string | null;
  is_featured: boolean;
  featured_order: number | null;
  user_id: string | null;
};

/**
 * Papéis sugeridos.
 *
 * É lista de atalho, não camisa de força: o campo aceita qualquer texto,
 * porque cada casamento inventa os seus ("leva-alianças", "cerimonialista
 * da família").
 */
const PAPEIS = [
  "Madrinha",
  "Padrinho",
  "Mãe da Noiva",
  "Pai da Noiva",
  "Mãe do Noivo",
  "Pai do Noivo",
  "Daminha",
  "Florista",
  "Pajem",
  "Noiva",
  "Noivo",
];

/**
 * Quem são os personagens principais.
 *
 * O que essa marcação faz, na prática: a pessoa ganha a etiqueta do papel no
 * mural — no feed, nos stories e nos comentários — e o que ela publica sobe
 * para o topo do feed nas primeiras 24 horas. É a diferença entre a foto da
 * madrinha e a foto de mais um convidado.
 */
export function Personagens({ convidados }: { convidados: Personagem[] }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const supabase = criarClienteNavegador();

  const destaques = useMemo(
    () =>
      convidados
        .filter((c) => c.is_featured)
        .sort(
          (a, b) =>
            (a.featured_order ?? 999) - (b.featured_order ?? 999) ||
            (a.ceremony_role ?? "zzz").localeCompare(b.ceremony_role ?? "zzz", "pt-BR") ||
            a.full_name.localeCompare(b.full_name, "pt-BR"),
        ),
    [convidados],
  );

  const candidatos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return convidados
      .filter((c) => !c.is_featured && c.full_name.toLowerCase().includes(termo))
      .slice(0, 8);
  }, [busca, convidados]);

  const semPapel = destaques.filter((c) => !c.ceremony_role?.trim()).length;
  const semCadastro = destaques.filter((c) => !c.user_id).length;

  async function salvar(id: string, dados: Partial<Personagem>) {
    setSalvando(id);
    await supabase.from("guests").update(dados).eq("id", id);
    setSalvando(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="versalete titulo-serif text-xs text-terra">Mural e cerimônia</p>
        <h1 className="titulo-serif mt-2 text-4xl text-oliva sm:text-5xl">
          Personagens principais
        </h1>
        <p className="mt-3 max-w-2xl text-base text-terra">
          Madrinhas, padrinhos, pais, daminha — quem tem papel no dia. No mural
          eles aparecem com a etiqueta do papel, e o que publicam fica no topo
          do feed nas primeiras 24 horas.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Em destaque" valor={destaques.length} tom="oliva" />
        <Indicador
          rotulo="Sem papel escrito"
          valor={semPapel}
          tom={semPapel > 0 ? "alerta" : "oliva"}
          detalhe={semPapel > 0 ? "a etiqueta fica vazia" : "todas com etiqueta"}
        />
        <Indicador
          rotulo="Ainda sem cadastro"
          valor={semCadastro}
          tom={semCadastro > 0 ? "lavanda" : "oliva"}
          detalhe="não publicam no mural"
        />
        <Indicador rotulo="Convidados" valor={convidados.length} />
      </div>

      {/* ---------- Adicionar ---------- */}
      <Bloco
        titulo="Colocar alguém em destaque"
        descricao="Busque pelo nome. Quem já está na lista de convidados entra com um toque."
      >
        <div>
          <Rotulo htmlFor="busca-personagem">Buscar convidado</Rotulo>
          <div className="relative">
            <Icone
              nome="busca"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terra/60"
            />
            <input
              id="busca-personagem"
              className="campo pl-10"
              placeholder="Comece a digitar o nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {busca.trim() && candidatos.length === 0 && (
          <p className="mt-4 text-sm text-terra">
            Ninguém novo com esse nome. Quem já está em destaque aparece na lista
            abaixo.
          </p>
        )}

        {candidatos.length > 0 && (
          <ul className="mt-4 space-y-2">
            {candidatos.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    void salvar(c.id, { is_featured: true });
                    setBusca("");
                  }}
                  disabled={salvando === c.id}
                  className="flex w-full items-center gap-3 rounded-sm border border-terra/25 bg-creme px-4 py-3 text-left transition-colors hover:border-oliva/50"
                >
                  <Avatar nome={c.full_name} tamanho="sm" />
                  <span className="titulo-serif flex-1 text-base text-oliva">
                    {c.full_name}
                  </span>
                  <Icone nome="mais" className="h-4 w-4 text-oliva" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {/* ---------- A lista ---------- */}
      <Bloco
        titulo="Em destaque"
        descricao="A ordem manda em quem aparece primeiro. Deixe vazio para ordenar pelo papel."
      >
        {destaques.length === 0 ? (
          <Vazio>Ninguém em destaque ainda.</Vazio>
        ) : (
          <ul className="space-y-2.5">
            {destaques.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-terra/20 bg-creme px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar nome={c.full_name} tamanho="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="titulo-serif block truncate text-lg text-oliva">
                      {c.full_name}
                    </span>
                    <span className="block text-sm text-terra">
                      {c.side ? `Lado d${c.side === "noiva" ? "a noiva" : "o noivo"}` : "—"}
                      {!c.user_id && " · ainda não se cadastrou"}
                    </span>
                  </span>
                  {c.ceremony_role?.trim() ? (
                    <Selo tom="lavanda">{c.ceremony_role}</Selo>
                  ) : (
                    <Selo tom="alerta">sem papel</Selo>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
                  <div>
                    <Rotulo htmlFor={`papel-${c.id}`}>Papel na cerimônia</Rotulo>
                    <input
                      id={`papel-${c.id}`}
                      list="papeis-sugeridos"
                      className="campo"
                      placeholder="Madrinha, Padrinho…"
                      defaultValue={c.ceremony_role ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (c.ceremony_role ?? "")) {
                          void salvar(c.id, { ceremony_role: v || null });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Rotulo htmlFor={`ordem-${c.id}`}>Ordem</Rotulo>
                    <input
                      id={`ordem-${c.id}`}
                      type="number"
                      min={1}
                      max={99}
                      inputMode="numeric"
                      className="campo"
                      placeholder="—"
                      defaultValue={c.featured_order ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim() ? Number(e.target.value) : null;
                        if (v !== c.featured_order) void salvar(c.id, { featured_order: v });
                      }}
                    />
                  </div>
                  <Botao
                    type="button"
                    variante="contorno"
                    disabled={salvando === c.id}
                    onClick={() => salvar(c.id, { is_featured: false })}
                  >
                    Tirar do destaque
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        )}

        <datalist id="papeis-sugeridos">
          {PAPEIS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Bloco>
    </div>
  );
}
