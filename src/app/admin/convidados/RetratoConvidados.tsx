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
import { contaNoTotal } from "@/lib/idade";
import { Bloco, Indicador } from "@/components/painel";
import { BarrasInterativas, Rosca, type Fatia } from "@/components/graficos";

export type FiltroDoRetrato =
  | { eixo: "vinculo"; valor: string }
  | { eixo: "faixa"; valor: string }
  | { eixo: "genero"; valor: string }
  | { eixo: "lado"; valor: string }
  | { eixo: "presenca"; valor: string };

const FAIXAS = ["Criança", "Adolescente", "Adulto", "Idoso"];

/**
 * O retrato dos convidados, ao lado da lista que ele descreve. Cada fatia
 * é um filtro: o clique recorta a lista na hora, sem sair da página.
 * Fica fechado por padrão para a lista continuar a uma rolada de distância.
 */
export function RetratoConvidados({
  convidados,
  aoFiltrar,
}: {
  convidados: ConvidadoCompleto[];
  aoFiltrar: (filtro: FiltroDoRetrato) => void;
}) {
  const retrato = useMemo(() => {
    // Acompanhante já é cadastro próprio; criança de colo fica fora das contas.
    const contam = convidados.filter(contaNoTotal);
    const confirmados = contam.filter((c) => c.invite_status === "confirmado");
    const responderam = confirmados.filter((c) => c.attends !== null);
    const naRecepcao = responderam.filter((c) => c.attends === "ambos" || c.attends === "recepcao");
    const criancas = naRecepcao.filter((c) => c.age !== null && c.age < 12).length;

    const presenca: Fatia[] = PRESENCAS.map((chave) => ({
      chave,
      rotulo: ROTULOS_PRESENCA[chave],
      valor: responderam.filter((c) => c.attends === chave).length,
    })).filter((f) => f.valor > 0);

    const contarPor = <T extends string>(valores: (T | null)[], ordem: T[], rotulos: Record<T, string>): Fatia[] =>
      ordem
        .map((chave) => ({ chave, rotulo: rotulos[chave], valor: valores.filter((v) => v === chave).length }))
        .filter((f) => f.valor > 0);

    return {
      naRecepcao: naRecepcao.length,
      adultos: naRecepcao.length - criancas,
      criancas,
      familias: new Set(contam.map((c) => c.group_id).filter(Boolean)).size,
      presenca,
      responderam: responderam.length,
      porVinculo: contarPor<Vinculo>(contam.map((c) => c.relationship_kind), VINCULOS, ROTULOS_VINCULO).sort((a, b) => b.valor - a.valor),
      porFaixa: FAIXAS.map((faixa) => ({ chave: faixa, rotulo: faixa, valor: contam.filter((c) => c.age_range === faixa).length })).filter((f) => f.valor > 0),
      porGenero: contarPor<Genero>(contam.map((c) => c.gender), ["feminino", "masculino", "outro"], { feminino: "Feminino", masculino: "Masculino", outro: "Outro" }),
      porLado: (["noiva", "noivo"] as const)
        .map((lado) => ({ chave: lado, rotulo: lado === "noiva" ? "Lado da noiva" : "Lado do noivo", valor: contam.filter((c) => c.side === lado).length }))
        .filter((f) => f.valor > 0),
      semVinculo: contam.filter((c) => !c.relationship_kind).length,
      semFaixa: contam.filter((c) => !c.age_range).length,
    };
  }, [convidados]);

  return (
    <details className="group rounded-sm border border-terra/20 bg-creme-claro">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="titulo-serif block text-2xl text-oliva">Retrato dos convidados</span>
          <span className="mt-1 block text-sm text-terra">
            Quem vem para quê, vínculo, faixa etária, gênero e lado. Toque numa fatia para filtrar a lista.
          </span>
        </span>
        <span className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-oliva">
          <span className="group-open:hidden">abrir</span>
          <span className="hidden group-open:inline">fechar</span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>

      <div className="space-y-6 border-t border-terra/15 px-6 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Na festa" valor={retrato.naRecepcao} tom="oliva" detalhe="o número que o buffet pede" />
          <Indicador rotulo="Adultos" valor={retrato.adultos} />
          <Indicador rotulo="Crianças" valor={retrato.criancas} tom="lavanda" detalhe="até 11 anos" />
          <Indicador rotulo="Famílias" valor={retrato.familias} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloco titulo="Cerimônia, festa ou as duas" descricao="Contado por pessoa confirmada. Toque para ver quem é.">
            <Rosca
              itens={retrato.presenca}
              total={retrato.responderam}
              legendaCentro="pessoas já responderam"
              aoClicar={(chave) => aoFiltrar({ eixo: "presenca", valor: chave })}
            />
          </Bloco>

          <Bloco
            titulo="Vínculo com vocês"
            descricao={retrato.semVinculo > 0 ? `${retrato.semVinculo} ainda sem vínculo definido na ficha.` : "Toque para ver a lista de cada grupo."}
          >
            <BarrasInterativas itens={retrato.porVinculo} tom={1} sufixo="convidados" aoClicar={(chave) => aoFiltrar({ eixo: "vinculo", valor: chave })} />
          </Bloco>

          <Bloco
            titulo="Faixa etária"
            descricao={retrato.semFaixa > 0 ? `${retrato.semFaixa} ainda sem faixa preenchida.` : "Toque para ver a lista de cada faixa."}
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
