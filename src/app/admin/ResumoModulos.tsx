import Link from "next/link";
import { reais } from "@/lib/formato";
import { Bloco } from "@/components/painel";
import {
  BarraEmpilhada,
  BarrasInterativas,
  BarrasSemanais,
  Rosca,
  type Fatia,
  type Semana,
} from "@/components/graficos";
import { Icone, type NomeIcone } from "@/components/Icones";

/**
 * Um gráfico por módulo, no dashboard.
 *
 * Cada bloco responde à pergunta principal daquela página e leva até ela:
 * a rosca dos convidados abre a lista já recortada, o pedaço do funil abre
 * os fornecedores naquela etapa, a categoria abre as despesas dela. Os
 * números vêm prontos da página (servidor); aqui só se desenha.
 */

export type NumeroChave = {
  rotulo: string;
  valor: string | number;
  tom?: "oliva" | "lavanda" | "alerta" | "neutro";
};

export type DadosResumo = {
  convidados: {
    total: number;
    fatias: Fatia[];
    numeros: NumeroChave[];
  };
  tarefas: {
    status: Fatia[];
    fases: Fatia[];
    numeros: NumeroChave[];
  };
  fornecedores: {
    funil: Fatia[];
    numeros: NumeroChave[];
  };
  financeiro: {
    orcamento: Fatia[];
    orcamentoTotal: number;
    categorias: Fatia[];
    numeros: NumeroChave[];
  };
  mural: {
    semanas: Semana[];
    numeros: NumeroChave[];
  };
};

export function ResumoModulos({ dados }: { dados: DadosResumo }) {
  const { convidados, tarefas, fornecedores, financeiro, mural } = dados;

  return (
    <section aria-labelledby="resumo-modulos" className="space-y-6">
      <div>
        <h2 id="resumo-modulos" className="titulo-serif text-2xl text-oliva sm:text-3xl">
          Resumo por módulo
        </h2>
        <p className="mt-1.5 text-sm text-terra">
          O essencial de cada página, num gráfico. Toque num pedaço para abrir a lista já
          recortada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------- Convidados ---------- */}
        <Bloco
          titulo="Convidados"
          descricao="Quem já respondeu, quem ainda falta e quem nem recebeu o convite."
          acao={<Abrir href="/admin/convidados" icone="convidados" />}
        >
          <Rosca itens={convidados.fatias} total={convidados.total} legendaCentro="convidados" />
          <Numeros itens={convidados.numeros} />
        </Bloco>

        {/* ---------- Tarefas ---------- */}
        <Bloco
          titulo="Tarefas"
          descricao="O checklist por situação e as fases que ainda têm pendência."
          acao={<Abrir href="/admin/checklist" icone="tarefas" />}
        >
          <BarraEmpilhada itens={tarefas.status} vazio="Nenhuma tarefa cadastrada ainda." />
          {tarefas.fases.length > 0 && (
            <div className="mt-6 border-t border-terra/15 pt-5">
              <p className="versalete mb-3 text-xs text-terra">Pendentes por fase</p>
              <BarrasInterativas itens={tarefas.fases} tom={1} sufixo="pendentes" />
            </div>
          )}
          <Numeros itens={tarefas.numeros} />
        </Bloco>

        {/* ---------- Fornecedores ---------- */}
        <Bloco
          titulo="Fornecedores"
          descricao="O funil: da pesquisa ao contrato fechado."
          acao={<Abrir href="/admin/fornecedores" icone="fornecedores" />}
        >
          <BarraEmpilhada itens={fornecedores.funil} vazio="Nenhum fornecedor cadastrado ainda." />
          <Numeros itens={fornecedores.numeros} />
        </Bloco>

        {/* ---------- Financeiro ---------- */}
        <Bloco
          titulo="Financeiro"
          descricao={
            financeiro.orcamentoTotal > 0
              ? `Do orçamento de ${reais(financeiro.orcamentoTotal)}: o que já saiu, o que falta e o que sobra.`
              : "Sem orçamento total definido: a barra mostra só o que já está comprometido."
          }
          acao={<Abrir href="/admin/financeiro" icone="financeiro" />}
        >
          <BarraEmpilhada
            itens={financeiro.orcamento}
            total={financeiro.orcamentoTotal}
            moeda
            vazio="Nenhum valor lançado no orçamento ainda."
          />
          {financeiro.categorias.length > 0 && (
            <div className="mt-6 border-t border-terra/15 pt-5">
              <p className="versalete mb-3 text-xs text-terra">Maiores categorias</p>
              <BarrasInterativas itens={financeiro.categorias} tom={2} moeda />
            </div>
          )}
          <Numeros itens={financeiro.numeros} />
        </Bloco>

        {/* ---------- Mural ---------- */}
        <div className="lg:col-span-2">
          <Bloco
            titulo="Mural"
            descricao="Publicações e stories por semana, nas últimas oito semanas."
            acao={<Abrir href="/admin/mural" icone="mural" />}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <BarrasSemanais semanas={mural.semanas} tom={3} legenda="Publicações no mural" />
              <Numeros itens={mural.numeros} coluna />
            </div>
          </Bloco>
        </div>
      </div>
    </section>
  );
}

/** Link discreto no canto do bloco: leva à página do módulo. */
function Abrir({ href, icone }: { href: string; icone: NomeIcone }) {
  return (
    <Link
      href={href}
      className="versalete inline-flex min-h-11 items-center gap-2 text-xs text-oliva underline underline-offset-4 transition-colors hover:text-oliva-escuro"
    >
      <Icone nome={icone} className="h-4 w-4" />
      Abrir
    </Link>
  );
}

/** A linha de números-chave sob o gráfico. */
function Numeros({ itens, coluna = false }: { itens: NumeroChave[]; coluna?: boolean }) {
  if (itens.length === 0) return null;
  const tons = {
    oliva: "text-oliva",
    lavanda: "text-lavanda",
    alerta: "text-red-800",
    neutro: "text-oliva",
  } as const;

  return (
    <dl
      className={`mt-5 border-t border-terra/15 pt-4 ${
        coluna
          ? "grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-1 lg:min-w-44 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
          : "flex flex-wrap gap-x-7 gap-y-3"
      }`}
    >
      {itens.map((n) => (
        <div key={n.rotulo}>
          <dt className="versalete text-xs text-terra">{n.rotulo}</dt>
          <dd className={`titulo-serif text-xl tabular-nums lining-nums ${tons[n.tom ?? "neutro"]}`}>
            {n.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
