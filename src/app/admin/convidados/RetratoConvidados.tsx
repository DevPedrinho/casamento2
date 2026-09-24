"use client";

import { useMemo } from "react";
import {
  PRESENCAS,
  ROTULOS_PRESENCA,
  ROTULOS_VINCULO,
  VINCULOS,
  type ConvidadoCompleto,
  type Genero,
  type Vinculo,
} from "@/lib/tipos";
import {
  contaNoTotal,
  ehDeColo,
  ehNoivo,
  FAIXAS_ETARIAS,
  faixaEtaria,
  ROTULOS_LEMBRANCA,
  tipoDeLembranca,
  type TipoLembranca,
} from "@/lib/idade";
import { Bloco, Indicador } from "@/components/painel";
import { BarrasInterativas, Rosca, type Fatia } from "@/components/graficos";

export type FiltroDoRetrato =
  | { eixo: "vinculo"; valor: string }
  | { eixo: "faixa"; valor: string }
  | { eixo: "genero"; valor: string }
  | { eixo: "lado"; valor: string }
  | { eixo: "presenca"; valor: string }
  | { eixo: "lembranca"; valor: string };

/** Valor de filtro para "a ficha não diz". */
export const NAO_INFORMADO = "nao_informado";

const ORDEM_LEMBRANCA: TipoLembranca[] = [
  "mulher",
  "homem",
  "idoso",
  "adolescente",
  "infantil",
  "adulto_sem_genero",
  "sem_idade",
];

/**
 * O retrato dos convidados, ao lado da lista que ele descreve. Cada fatia
 * é um filtro: o clique recorta a lista na hora, sem sair da página.
 *
 * Todo gráfico daqui soma o mesmo total: a lista sem os noivos, com as
 * crianças de colo — elas também ganham lembrancinha. O que falta na ficha
 * vira a barra "Não informado", em vez de sumir da conta.
 */
export function RetratoConvidados({
  convidados,
  aoFiltrar,
}: {
  convidados: ConvidadoCompleto[];
  aoFiltrar: (filtro: FiltroDoRetrato) => void;
}) {
  const retrato = useMemo(() => {
    const todos = convidados.filter((c) => !ehNoivo(c));
    const naBarra = todos.filter(contaNoTotal).length;
    const colo = todos.filter(ehDeColo).length;

    // O buffet cobra por pessoa confirmada na festa: sem colo, sem os noivos
    // contados à parte — é o mesmo número da barra de convidados.
    const naRecepcao = convidados
      .filter(contaNoTotal)
      .filter((c) => c.invite_status === "confirmado" && (c.attends === "ambos" || c.attends === "recepcao"));
    const criancas = naRecepcao.filter((c) => c.age !== null && c.age < 12).length;

    /** Conta por chave e acrescenta "Não informado" quando falta dado — soma sempre o total. */
    function distribuir<T extends string>(
      chaveDe: (c: ConvidadoCompleto) => T | null,
      ordem: readonly T[],
      rotulos: Record<T, string>,
    ): Fatia[] {
      const fatias: Fatia[] = ordem
        .map((chave) => ({ chave, rotulo: rotulos[chave], valor: todos.filter((c) => chaveDe(c) === chave).length }))
        .filter((f) => f.valor > 0);
      const semDado = todos.filter((c) => chaveDe(c) === null).length;
      if (semDado > 0) fatias.push({ chave: NAO_INFORMADO, rotulo: "Não informado", valor: semDado });
      return fatias;
    }

    // Presença: quem confirmou e escolheu, quem não vai, e o resto.
    const confirmadosComEscolha = todos.filter((c) => c.invite_status === "confirmado" && c.attends !== null);
    const presenca: Fatia[] = [
      ...PRESENCAS.map((chave) => ({
        chave,
        rotulo: ROTULOS_PRESENCA[chave],
        valor: confirmadosComEscolha.filter((c) => c.attends === chave).length,
      })),
      { chave: "nao_vai", rotulo: "Não vão", valor: todos.filter((c) => c.invite_status === "nao_vai").length },
      {
        chave: "sem_resposta",
        rotulo: "Ainda sem resposta",
        detalhe: "Não confirmaram ou confirmaram sem dizer a que vão",
        valor: todos.filter(
          (c) => c.invite_status !== "nao_vai" && !(c.invite_status === "confirmado" && c.attends !== null),
        ).length,
      },
    ].filter((f) => f.valor > 0);

    // Lembrancinhas, com o recorte por gênero onde ele decide o presente.
    const recorteDeGenero = (lista: ConvidadoCompleto[], fem: [string, string], masc: [string, string]) => {
      const f = lista.filter((c) => c.gender === "feminino").length;
      const m = lista.filter((c) => c.gender === "masculino").length;
      const resto = lista.length - f - m;
      const plural = (n: number, [um, varios]: [string, string]) => `${n} ${n === 1 ? um : varios}`;
      return [f && plural(f, fem), m && plural(m, masc), resto && `${resto} sem gênero`].filter(Boolean).join(" · ");
    };
    const lembrancas: Fatia[] = ORDEM_LEMBRANCA.map((tipo) => {
      const grupo = todos.filter((c) => tipoDeLembranca(c) === tipo);
      const detalhe =
        tipo === "idoso"
          ? recorteDeGenero(grupo, ["idosa", "idosas"], ["idoso", "idosos"])
          : tipo === "adolescente" || tipo === "infantil"
            ? recorteDeGenero(grupo, ["menina", "meninas"], ["menino", "meninos"])
            : tipo === "adulto_sem_genero"
              ? "Complete o gênero na ficha"
              : tipo === "sem_idade"
                ? "Complete a idade ou a faixa na ficha"
                : undefined;
      return { chave: tipo, rotulo: ROTULOS_LEMBRANCA[tipo], valor: grupo.length, detalhe: detalhe || undefined };
    }).filter((f) => f.valor > 0);

    return {
      total: todos.length,
      naBarra,
      colo,
      naRecepcao: naRecepcao.length,
      adultos: naRecepcao.length - criancas,
      criancas,
      familias: new Set(todos.map((c) => c.group_id).filter(Boolean)).size,
      presenca,
      lembrancas,
      porVinculo: distribuir<Vinculo>((c) => c.relationship_kind, VINCULOS, ROTULOS_VINCULO),
      porFaixa: distribuir(
        faixaEtaria,
        FAIXAS_ETARIAS,
        Object.fromEntries(FAIXAS_ETARIAS.map((f) => [f, f])) as Record<(typeof FAIXAS_ETARIAS)[number], string>,
      ),
      porGenero: distribuir<Genero>(
        (c) => c.gender,
        ["feminino", "masculino", "outro"],
        { feminino: "Feminino", masculino: "Masculino", outro: "Outro" },
      ),
      porLado: distribuir<"noiva" | "noivo">(
        (c) => c.side,
        ["noiva", "noivo"],
        { noiva: "Lado da noiva", noivo: "Lado do noivo" },
      ),
    };
  }, [convidados]);

  return (
    <details className="group rounded-sm border border-terra/20 bg-creme-claro">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="titulo-serif block text-2xl text-oliva">Retrato dos convidados</span>
          <span className="mt-1 block text-sm text-terra">
            Lembrancinhas, presença, vínculo, faixa etária, gênero e lado. Toque numa fatia para filtrar a lista.
          </span>
        </span>
        <span className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-oliva">
          <span className="group-open:hidden">abrir</span>
          <span className="hidden group-open:inline">fechar</span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>

      <div className="space-y-6 border-t border-terra/15 px-6 py-6 sm:px-8">
        {/* ---------- De onde vem o total ---------- */}
        <div className="rounded-sm border border-oliva/25 bg-oliva/5 px-5 py-4">
          <p className="titulo-serif text-xl text-oliva tabular-nums lining-nums sm:text-2xl">
            {retrato.naBarra} da barra de convidados + {retrato.colo} {retrato.colo === 1 ? "criança" : "crianças"} de colo
            {" = "}
            <strong className="font-semibold">{retrato.total} na lista</strong>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-terra">
            Noivo e noiva não entram. Cada gráfico abaixo soma {retrato.total}; o que falta na
            ficha aparece como &ldquo;Não informado&rdquo; e, ao tocar, abre a lista de quem
            precisa completar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Indicador rotulo="Na lista" valor={retrato.total} detalhe="com colo, sem os noivos" />
          <Indicador rotulo="Na festa" valor={retrato.naRecepcao} tom="oliva" detalhe="confirmados · o que o buffet pede" />
          <Indicador rotulo="Adultos" valor={retrato.adultos} detalhe="na festa" />
          <Indicador rotulo="Crianças" valor={retrato.criancas} tom="lavanda" detalhe="na festa · 4 a 11 anos" />
          <Indicador rotulo="Famílias" valor={retrato.familias} />
        </div>

        {/* ---------- Lembrancinhas ---------- */}
        <Bloco
          titulo="Tipo de lembrancinha"
          descricao="Quantas de cada tipo encomendar. A idade decide a faixa; entre os adultos, o gênero decide entre a lembrança de mulher e a de homem."
        >
          <BarrasInterativas
            itens={retrato.lembrancas}
            tom={6}
            sufixo="convidados"
            aoClicar={(chave) => aoFiltrar({ eixo: "lembranca", valor: chave })}
          />
          <p className="mt-4 border-t border-terra/15 pt-3 text-base text-oliva">
            Total: <strong className="font-semibold tabular-nums lining-nums">{retrato.total}</strong> lembrancinhas
          </p>
        </Bloco>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloco
            titulo="Cerimônia, festa ou as duas"
            descricao="Quem confirmou e a que vai, quem não vai e quem ainda não respondeu."
          >
            <Rosca
              itens={retrato.presenca}
              total={retrato.total}
              legendaCentro="convidados"
              aoClicar={(chave) => aoFiltrar({ eixo: "presenca", valor: chave })}
            />
          </Bloco>

          <Bloco titulo="Vínculo com vocês" descricao="Toque para ver a lista de cada grupo.">
            <BarrasInterativas itens={retrato.porVinculo} tom={1} sufixo="convidados" aoClicar={(chave) => aoFiltrar({ eixo: "vinculo", valor: chave })} />
          </Bloco>

          <Bloco
            titulo="Faixa etária"
            descricao="Pela idade, quando a ficha tem; senão, pela faixa anotada."
          >
            <BarrasInterativas itens={retrato.porFaixa} tom={0} sufixo="convidados" aoClicar={(chave) => aoFiltrar({ eixo: "faixa", valor: chave })} />
          </Bloco>

          <Bloco titulo="Gênero" descricao="Como cada convidado se identifica na ficha.">
            <BarrasInterativas itens={retrato.porGenero} tom={3} sufixo="convidados" aoClicar={(chave) => aoFiltrar({ eixo: "genero", valor: chave })} />
          </Bloco>

          <Bloco titulo="De que lado" descricao="Quem veio da noiva e quem veio do noivo.">
            <BarrasInterativas itens={retrato.porLado} tom={5} sufixo="convidados" aoClicar={(chave) => aoFiltrar({ eixo: "lado", valor: chave })} />
          </Bloco>
        </div>
      </div>
    </details>
  );
}
