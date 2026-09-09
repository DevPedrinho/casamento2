"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { GrupoConvidados } from "@/lib/tipos";
import { chaveDeNome, lerCsv, type Planilha } from "@/lib/csv";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

/** Campos do sistema que uma coluna da planilha pode alimentar. */
const CAMPOS = [
  { valor: "", rotulo: "— ignorar —" },
  { valor: "full_name", rotulo: "Nome completo *" },
  { valor: "grupo", rotulo: "Família / grupo" },
  { valor: "side", rotulo: "Lado (noivo/noiva)" },
  { valor: "relationship", rotulo: "Relação" },
  { valor: "ceremony_role", rotulo: "Papel na cerimônia" },
  { valor: "attends", rotulo: "Onde participa" },
  { valor: "gender", rotulo: "Sexo" },
  { valor: "phone", rotulo: "Telefone / WhatsApp" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "age", rotulo: "Idade" },
  { valor: "age_range", rotulo: "Faixa etária" },
  { valor: "favor_type", rotulo: "Tipo de lembrancinha" },
  { valor: "table_number", rotulo: "Mesa" },
  { valor: "notes", rotulo: "Observações" },
  { valor: "extra", rotulo: "Guardar como informação extra" },
] as const;

/** Palpite de mapeamento a partir do nome da coluna. */
function adivinhar(coluna: string): string {
  const c = chaveDeNome(coluna);
  if (c.includes("nome")) return "full_name";
  if (c.includes("familia") || c.includes("grupo")) return "grupo";
  if (c === "lado") return "side";
  if (c.includes("relacao") || c.includes("parentesco")) return "relationship";
  if (c.includes("personagem") || c.includes("papel")) return "ceremony_role";
  if (c === "local" || c.includes("participa")) return "attends";
  if (c.includes("sexo") || c.includes("genero")) return "gender";
  if (c.includes("telefone") || c.includes("whats") || c.includes("celular")) return "phone";
  if (c.includes("mail")) return "email";
  if (c === "idade") return "age";
  if (c.includes("faixa")) return "age_range";
  if (c.includes("lembranc")) return "favor_type";
  if (c.includes("mesa")) return "table_number";
  if (c.includes("obs")) return "notes";
  // Colunas sem campo correspondente são preservadas, não descartadas.
  return "extra";
}

const ETAPAS = ["Arquivo", "Prévia", "Mapeamento", "Duplicidades", "Confirmação", "Resumo"];

type LinhaPreparada = {
  dados: Record<string, string>;
  extra: Record<string, string>;
  chave: string;
  duplicada: boolean;
  incompleta: boolean;
};

export function Importador({
  existentes,
  grupos,
}: {
  existentes: { id: string; full_name: string; import_key: string | null }[];
  grupos: GrupoConvidados[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState(0);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [mapa, setMapa] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{
    criados: number;
    atualizados: number;
    duplicados: number;
    incompletos: number;
  } | null>(null);

  const chavesExistentes = useMemo(
    () => new Set(existentes.map((e) => e.import_key ?? chaveDeNome(e.full_name))),
    [existentes],
  );

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    if (!/\.(csv|tsv|txt)$/i.test(arquivo.name)) {
      setErro(
        "Envie um arquivo CSV. No Excel ou no Google Sheets: Arquivo → Salvar como / Baixar → CSV.",
      );
      return;
    }

    const texto = await arquivo.text();
    const lida = lerCsv(texto);

    if (lida.cabecalho.length === 0 || lida.linhas.length === 0) {
      setErro("Não encontrei dados nesse arquivo.");
      return;
    }

    setNomeArquivo(arquivo.name);
    setPlanilha(lida);
    setMapa(lida.cabecalho.map(adivinhar));
    setEtapa(1);
  }

  /** Aplica o mapeamento e classifica cada linha. */
  const preparadas = useMemo<LinhaPreparada[]>(() => {
    if (!planilha) return [];

    return planilha.linhas.map((linha) => {
      const dados: Record<string, string> = {};
      const extra: Record<string, string> = {};

      planilha.cabecalho.forEach((coluna, i) => {
        const campo = mapa[i];
        const valor = (linha[i] ?? "").trim();
        if (!campo || !valor) return;
        if (campo === "extra") extra[coluna] = valor;
        else dados[campo] = valor;
      });

      const nome = dados.full_name ?? "";
      const chave = chaveDeNome(nome);
      return {
        dados,
        extra,
        chave,
        duplicada: Boolean(chave) && chavesExistentes.has(chave),
        incompleta: !nome,
      };
    });
  }, [chavesExistentes, mapa, planilha]);

  const validas = preparadas.filter((p) => !p.incompleta);
  const duplicadas = validas.filter((p) => p.duplicada);
  const novas = validas.filter((p) => !p.duplicada);
  const incompletas = preparadas.filter((p) => p.incompleta);
  const temNome = mapa.includes("full_name");

  async function importar() {
    setImportando(true);
    setErro(null);
    const supabase = criarClienteNavegador();

    // Cria os grupos que ainda não existem, para poder ligar por id.
    const nomesGrupos = new Set(
      validas.map((p) => p.dados.grupo).filter((g): g is string => Boolean(g)),
    );
    const faltando = [...nomesGrupos].filter(
      (n) => !grupos.some((g) => chaveDeNome(g.name) === chaveDeNome(n)),
    );
    if (faltando.length > 0) {
      await supabase.from("guest_groups").insert(faltando.map((name) => ({ name })));
    }

    const { data: todosGrupos } = await supabase.from("guest_groups").select("id, name");
    const idPorGrupo = new Map(
      (todosGrupos ?? []).map((g) => [chaveDeNome(g.name), g.id as string]),
    );

    const SEXO: Record<string, string> = { masculino: "masculino", feminino: "feminino" };
    const LADO: Record<string, string> = { noivo: "noivo", noiva: "noiva" };

    const registros = validas.map((p) => {
      const idade = Number(p.dados.age);
      return {
        full_name: p.dados.full_name,
        import_key: p.chave,
        group_id: p.dados.grupo ? (idPorGrupo.get(chaveDeNome(p.dados.grupo)) ?? null) : null,
        side: LADO[chaveDeNome(p.dados.side ?? "")] ?? null,
        relationship: p.dados.relationship ?? null,
        ceremony_role: p.dados.ceremony_role ?? null,
        attends: p.dados.attends ?? null,
        gender: SEXO[chaveDeNome(p.dados.gender ?? "")] ?? null,
        phone: p.dados.phone ?? null,
        whatsapp: p.dados.phone ?? null,
        email: p.dados.email ?? null,
        age: Number.isFinite(idade) && idade > 0 ? Math.round(idade) : null,
        age_range: p.dados.age_range ?? null,
        favor_type: p.dados.favor_type ?? null,
        table_number: p.dados.table_number ?? null,
        notes: p.dados.notes ?? null,
        extra: p.extra,
      };
    });

    // Em lotes: uma requisição com centenas de linhas costuma estourar.
    let falhou = false;
    for (let i = 0; i < registros.length; i += 100) {
      const { error } = await supabase
        .from("guests")
        .upsert(registros.slice(i, i + 100), { onConflict: "import_key" });
      if (error) {
        falhou = true;
        break;
      }
    }

    setImportando(false);
    if (falhou) {
      setErro("A importação falhou no meio do caminho. Nada foi perdido — tente de novo.");
      return;
    }

    setResultado({
      criados: novas.length,
      atualizados: duplicadas.length,
      duplicados: duplicadas.length,
      incompletos: incompletas.length,
    });
    setEtapa(5);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Convidados</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Importar planilha</h1>
        </div>
        <Link href="/admin/convidados"
          className="versalete text-xs text-oliva underline underline-offset-4">
          Voltar para a lista
        </Link>
      </header>

      {/* ---------- Trilha das etapas ---------- */}
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {ETAPAS.map((nome, i) => (
          <li key={nome} className="flex shrink-0 items-center gap-2">
            <span
              className={`versalete flex items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                i === etapa
                  ? "border-oliva bg-oliva text-creme-claro"
                  : i < etapa
                    ? "border-oliva/40 text-oliva"
                    : "border-terra/25 text-terra/60"
              }`}
            >
              <span className="tabular-nums lining-nums">{i + 1}</span>
              {nome}
            </span>
          </li>
        ))}
      </ol>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {/* ---------- 1. Arquivo ---------- */}
      {etapa === 0 && (
        <Bloco titulo="Escolha o arquivo" descricao="Aceita CSV — é o “Salvar como” do Excel e o “Baixar como” do Google Sheets.">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void escolherArquivo(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full flex-col items-center gap-3 rounded-sm border-2 border-dashed border-terra/30 px-6 py-14 transition-colors hover:border-oliva hover:bg-creme-escuro/30"
          >
            <Icone nome="convidados" className="h-8 w-8 text-terra/70" />
            <span className="titulo-serif text-lg text-oliva">
              Selecionar ou arrastar a planilha
            </span>
            <span className="text-sm text-terra">.csv, separado por vírgula ou ponto e vírgula</span>
          </button>
          <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv"
            className="sr-only" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
        </Bloco>
      )}

      {/* ---------- 2. Prévia ---------- */}
      {etapa === 1 && planilha && (
        <Bloco titulo="Confira os dados" descricao={`${nomeArquivo} · ${planilha.linhas.length} linhas, ${planilha.cabecalho.length} colunas.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-terra/20">
                  {planilha.cabecalho.map((c) => (
                    <th key={c} className="versalete px-3 py-2.5 text-left text-xs text-terra">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planilha.linhas.slice(0, 8).map((linha, i) => (
                  <tr key={i} className="border-b border-terra/10">
                    {planilha.cabecalho.map((_, j) => (
                      <td key={j} className="max-w-52 truncate px-3 py-2.5 text-terra">
                        {linha[j] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {planilha.linhas.length > 8 && (
            <p className="mt-4 text-sm text-terra/80">
              …e mais {planilha.linhas.length - 8} linhas.
            </p>
          )}
          <div className="mt-7 flex gap-3">
            <Botao type="button" onClick={() => setEtapa(2)}>Continuar</Botao>
            <Botao type="button" variante="contorno" onClick={() => setEtapa(0)}>Trocar arquivo</Botao>
          </div>
        </Bloco>
      )}

      {/* ---------- 3. Mapeamento ---------- */}
      {etapa === 2 && planilha && (
        <Bloco titulo="Ligue as colunas aos campos" descricao="O que não tiver campo correspondente é guardado como informação extra — nada da planilha se perde.">
          <ul className="space-y-3">
            {planilha.cabecalho.map((coluna, i) => (
              <li key={coluna} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <span className="titulo-serif truncate text-base text-oliva" title={coluna}>
                  {coluna}
                </span>
                <span className="hidden text-terra/50 sm:block" aria-hidden="true">→</span>
                <select
                  className="campo"
                  aria-label={`Campo para a coluna ${coluna}`}
                  value={mapa[i] ?? ""}
                  onChange={(e) => {
                    const novo = [...mapa];
                    novo[i] = e.target.value;
                    setMapa(novo);
                  }}
                >
                  {CAMPOS.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.rotulo}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          {!temNome && (
            <div className="mt-6">
              <Aviso tipo="erro">
                Aponte alguma coluna para <strong>Nome completo</strong> — é por ele que a
                importação identifica cada pessoa.
              </Aviso>
            </div>
          )}

          <div className="mt-7 flex gap-3">
            <Botao type="button" onClick={() => setEtapa(3)} disabled={!temNome}>
              Continuar
            </Botao>
            <Botao type="button" variante="contorno" onClick={() => setEtapa(1)}>Voltar</Botao>
          </div>
        </Bloco>
      )}

      {/* ---------- 4. Duplicidades ---------- */}
      {etapa === 3 && (
        <Bloco titulo="Possíveis duplicidades" descricao="Comparamos pelo nome, ignorando acento e maiúscula. Quem já existe é atualizado, não duplicado.">
          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Indicador rotulo="Linhas" valor={preparadas.length} />
            <Indicador rotulo="Novos" valor={novas.length} tom="oliva" />
            <Indicador rotulo="Já existem" valor={duplicadas.length} tom="lavanda" />
            <Indicador rotulo="Sem nome" valor={incompletas.length}
              tom={incompletas.length > 0 ? "alerta" : "oliva"} />
          </div>

          {duplicadas.length === 0 ? (
            <Vazio>Nenhuma duplicidade. Todos os registros são novos.</Vazio>
          ) : (
            <ul className="space-y-2">
              {duplicadas.slice(0, 20).map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-4 rounded-sm border border-terra/20 bg-creme px-4 py-3">
                  <span className="titulo-serif truncate text-base text-oliva">
                    {p.dados.full_name}
                  </span>
                  <Selo tom="lavanda">será atualizado</Selo>
                </li>
              ))}
            </ul>
          )}

          {incompletas.length > 0 && (
            <p className="mt-5 text-sm text-terra">
              {incompletas.length} linha{incompletas.length > 1 ? "s" : ""} sem nome
              {incompletas.length > 1 ? " serão ignoradas" : " será ignorada"}.
            </p>
          )}

          <div className="mt-7 flex gap-3">
            <Botao type="button" onClick={() => setEtapa(4)}>Continuar</Botao>
            <Botao type="button" variante="contorno" onClick={() => setEtapa(2)}>Voltar</Botao>
          </div>
        </Bloco>
      )}

      {/* ---------- 5. Confirmação ---------- */}
      {etapa === 4 && (
        <Bloco titulo="Confirmar importação">
          <p className="text-base leading-relaxed text-terra">
            Vamos criar <strong className="text-oliva">{novas.length}</strong> convidado
            {novas.length === 1 ? "" : "s"} e atualizar{" "}
            <strong className="text-oliva">{duplicadas.length}</strong> que já
            existe{duplicadas.length === 1 ? "" : "m"}.
            {incompletas.length > 0 && ` ${incompletas.length} linha(s) sem nome serão ignoradas.`}
          </p>
          <p className="mt-3 text-sm text-terra">
            A atualização só preenche o que estiver vazio ou o que veio na planilha —
            não apaga o que vocês já editaram à mão.
          </p>

          <div className="mt-7 flex gap-3">
            <Botao type="button" onClick={importar} disabled={importando}>
              {importando ? "Importando…" : `Importar ${validas.length} registros`}
            </Botao>
            <Botao type="button" variante="contorno" onClick={() => setEtapa(3)}>Voltar</Botao>
          </div>
        </Bloco>
      )}

      {/* ---------- 6. Resumo ---------- */}
      {etapa === 5 && resultado && (
        <Bloco titulo="Importação concluída">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Indicador rotulo="Convidados criados" valor={resultado.criados} tom="oliva" />
            <Indicador rotulo="Registros atualizados" valor={resultado.atualizados} tom="lavanda" />
            <Indicador rotulo="Duplicidades tratadas" valor={resultado.duplicados} />
            <Indicador rotulo="Linhas incompletas" valor={resultado.incompletos}
              tom={resultado.incompletos > 0 ? "alerta" : "oliva"} />
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Botao type="button" onClick={() => router.push("/admin/convidados")}>
              Ver a lista
            </Botao>
            <Botao type="button" variante="contorno" onClick={() => {
              setEtapa(0);
              setPlanilha(null);
              setResultado(null);
              setNomeArquivo("");
            }}>
              Importar outra planilha
            </Botao>
          </div>
        </Bloco>
      )}
    </div>
  );
}
