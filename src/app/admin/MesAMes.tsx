import Link from "next/link";
import { Selo } from "@/components/painel";

export type TipoDoItem = "financeiro" | "tarefa" | "fornecedor" | "crm" | "dia";

export type ItemDoMes = {
  /** Data ISO (AAAA-MM-DD). Sem data, o item entra no mês atual, sem dia. */
  data: string | null;
  titulo: string;
  detalhe?: string | null;
  tipo: TipoDoItem;
  href: string;
  /** Prioridade alta, quando for tarefa. */
  alta?: boolean;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ROTULO_TIPO: Record<TipoDoItem, string> = {
  financeiro: "financeiro",
  tarefa: "tarefa",
  fornecedor: "fornecedor",
  crm: "crm",
  dia: "o dia",
};

/** A cor da barrinha à esquerda de cada item: pagamentos em terra, tarefas em oliva. */
const FAIXA: Record<TipoDoItem, string> = {
  financeiro: "border-l-terra",
  tarefa: "border-l-oliva",
  fornecedor: "border-l-terra",
  crm: "border-l-lavanda",
  dia: "border-l-lavanda",
};

/** Como o painel descreve um mês: "9 a 12 meses antes", "Último mês"… */
export function faseDoMes(mesesAntes: number): string {
  if (mesesAntes >= 12) return "12+ meses antes";
  if (mesesAntes >= 9) return "9 a 12 meses antes";
  if (mesesAntes >= 6) return "6 a 9 meses antes";
  if (mesesAntes >= 3) return "3 a 6 meses antes";
  if (mesesAntes >= 1) return "1 a 3 meses antes";
  return "o mês";
}

/**
 * O calendário do planejamento: mês a mês, de hoje até o casamento, tudo o
 * que tem data — pagamento, tarefa, retorno de fornecedor — na ordem em que
 * chega. Meses vazios em sequência viram uma linha só, para lembrar que ali
 * faltam prazos. O que já venceu fica marcado no mês atual.
 */
export function MesAMes({
  itens,
  hoje,
  diaDoCasamento,
  semPrazo,
}: {
  itens: ItemDoMes[];
  /** AAAA-MM-DD */
  hoje: string;
  /** AAAA-MM-DD */
  diaDoCasamento: string;
  /** Quantas tarefas abertas ainda não têm prazo. */
  semPrazo: number;
}) {
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  const [anoDia, mesDia] = diaDoCasamento.split("-").map(Number);
  const totalDeMeses = Math.max(1, (anoDia - anoHoje) * 12 + (mesDia - mesHoje) + 1);

  // Cada item cai no mês da data; o que venceu e o que não tem data ficam no mês atual.
  const chaveDoMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;
  const porMes = new Map<string, ItemDoMes[]>();
  for (const item of itens) {
    const chave = !item.data || item.data < hoje ? chaveDoMes(anoHoje, mesHoje) : item.data.slice(0, 7);
    porMes.set(chave, [...(porMes.get(chave) ?? []), item]);
  }

  type Linha = { chave: string; rotulo: string; sub: string; itens: ItemDoMes[]; atual: boolean; ultimo: boolean };
  const linhas: Linha[] = [];
  for (let i = 0; i < totalDeMeses; i++) {
    const indice = mesHoje - 1 + i;
    const ano = anoHoje + Math.floor(indice / 12);
    const mes = (indice % 12) + 1;
    const chave = chaveDoMes(ano, mes);
    const doMes = (porMes.get(chave) ?? []).sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
    const ultimo = i === totalDeMeses - 1;
    const mesesAntes = totalDeMeses - 1 - i;
    linhas.push({
      chave,
      rotulo: MESES_LONGOS[mes - 1],
      sub: i === 0 ? `hoje é dia ${Number(hoje.slice(8, 10))}` : ultimo ? "o mês" : faseDoMes(mesesAntes),
      itens: doMes,
      atual: i === 0,
      ultimo,
    });
  }

  // Meses vazios seguidos (fora o atual e o último) viram uma linha só.
  const compactas: (Linha | { vazios: Linha[] })[] = [];
  for (const linha of linhas) {
    const vazia = linha.itens.length === 0 && !linha.atual && !linha.ultimo;
    const anterior = compactas[compactas.length - 1];
    if (vazia && anterior && "vazios" in anterior) anterior.vazios.push(linha);
    else if (vazia) compactas.push({ vazios: [linha] });
    else compactas.push(linha);
  }

  return (
    <div>
      {compactas.map((bloco) => {
        if ("vazios" in bloco) {
          const primeiro = bloco.vazios[0];
          const derradeiro = bloco.vazios[bloco.vazios.length - 1];
          const rotulo =
            bloco.vazios.length === 1
              ? primeiro.rotulo
              : `${primeiro.rotulo.slice(0, 3)} – ${derradeiro.rotulo.slice(0, 3)}`;
          return (
            <div key={primeiro.chave} className="grid grid-cols-[5.25rem_1fr] gap-3.5 border-t border-terra/15 py-3.5 sm:gap-4">
              <div className="titulo-serif text-xl leading-tight text-oliva">
                {rotulo}
                <span className="block font-sans text-xs text-terra/70">{primeiro.sub}</span>
              </div>
              <p className="self-center rounded-sm border border-dashed border-terra/25 px-3 py-2.5 text-sm text-terra/80">
                Nada com data.
                {semPrazo > 0 && (
                  <>
                    {" "}
                    <Link href="/admin/checklist" className="text-oliva underline underline-offset-4">
                      {semPrazo} tarefa{semPrazo === 1 ? "" : "s"} sem prazo
                    </Link>{" "}
                    — vale distribuir por aqui.
                  </>
                )}
              </p>
            </div>
          );
        }

        const linha = bloco;
        return (
          <div
            key={linha.chave}
            className={`grid grid-cols-[5.25rem_1fr] gap-3.5 py-3.5 first:pt-0 sm:gap-4 ${
              linha.atual ? "-mx-3 rounded-sm bg-lavanda/8 px-3" : "border-t border-terra/15"
            }`}
          >
            <div className={`titulo-serif text-xl leading-tight ${linha.atual || linha.ultimo ? "text-lavanda" : "text-oliva"}`}>
              {linha.rotulo}
              <span className="block font-sans text-xs text-terra/70">{linha.sub}</span>
            </div>

            {linha.itens.length === 0 ? (
              <p className="self-center text-sm text-terra/70">Nada marcado.</p>
            ) : (
              <ul className="space-y-2">
                {linha.itens.map((item, i) => {
                  const vencido = item.data !== null && item.data < hoje;
                  const dia = item.data ? String(Number(item.data.slice(8, 10))) : "—";
                  const mesDoItem = item.data && item.data.slice(0, 7) !== linha.chave ? MESES[Number(item.data.slice(5, 7)) - 1] : null;
                  return (
                    <li key={`${item.href}-${i}`}>
                      <Link
                        href={item.href}
                        className={`grid grid-cols-[2.25rem_1fr] items-center gap-2.5 rounded-sm border border-l-[3px] border-terra/20 px-3 py-2.5 text-sm transition-colors hover:border-oliva/40 sm:grid-cols-[2.25rem_1fr_auto] ${
                          vencido ? "border-l-red-800 bg-red-50/50" : `${FAIXA[item.tipo]} ${item.tipo === "dia" ? "bg-creme-claro" : "bg-creme"}`
                        }`}
                      >
                        <span className="text-terra tabular-nums lining-nums">
                          {dia}
                          {mesDoItem && <span className="block text-[0.65rem] leading-none">{mesDoItem}</span>}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate ${item.tipo === "dia" ? "titulo-serif text-lg text-oliva" : "text-oliva"}`}>
                            {item.titulo}
                          </span>
                          {item.detalhe && <span className="block truncate text-xs text-terra/85">{item.detalhe}</span>}
                        </span>
                        <span className="hidden sm:block">
                          {vencido ? (
                            <Selo tom="alerta">vencido</Selo>
                          ) : item.alta ? (
                            <Selo tom="oliva">alta</Selo>
                          ) : (
                            <Selo tom={item.tipo === "dia" || item.tipo === "crm" ? "lavanda" : "neutro"}>{ROTULO_TIPO[item.tipo]}</Selo>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
