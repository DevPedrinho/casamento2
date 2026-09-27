"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IMAGENS_PADRAO,
  SECOES_CONVITE,
  textosDoConvite,
  type ChaveTextoConvite,
} from "@/lib/conviteDigital";
import { enderecoDoSite } from "@/lib/convite";
import type { FaixaDoSite } from "@/lib/musica";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import {
  ROTULOS_LOCAL,
  type ConfiguracaoConvite,
  type ItemManual,
  type LocalEvento,
  type SecaoConvite,
} from "@/lib/tipos";
import { Icone } from "@/components/Icones";
import { UploadImagem } from "@/components/UploadImagem";
import { Ajuda, RotuloConfig, SecaoConfig, SecaoSalvavel } from "../configuracoes/ui";
import { ManualConvite } from "./ManualConvite";
import { MusicaConvite } from "./MusicaConvite";

/** A ordem da página, que o índice do topo repete. */
const INDICE = [
  { id: "links", rotulo: "Links" },
  { id: "capa", rotulo: "Capa" },
  { id: "ordem", rotulo: "Ordem das seções" },
  { id: "apresentacao", rotulo: "Apresentação" },
  { id: "mensagem", rotulo: "Mensagem" },
  { id: "grande-dia", rotulo: "O Grande Dia" },
  { id: "contagem", rotulo: "Contagem" },
  { id: "traje", rotulo: "Traje" },
  { id: "manual", rotulo: "Manual do Convidado" },
  { id: "confirmacao", rotulo: "Confirmação" },
  { id: "explorar", rotulo: "Explorar o site" },
  { id: "final", rotulo: "Mensagem final" },
  { id: "musica", rotulo: "Música" },
];

type Coluna = Exclude<keyof ConfiguracaoConvite, "id" | "texts">;
type Imagem = "cover_image_path" | "cover_logo_path" | "ceremony_image_path" | "closing_image_path";

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Convite Digital no painel: cada seção do convite, na ordem em que ele
 * aparece, salvando sozinha — o mesmo jeito de Configurações.
 *
 * O que já tem casa própria (nomes, data, traje, monograma, cerimônia e
 * recepção) não se repete aqui: a página aponta para onde se edita.
 */
export function EditorConvite({
  config,
  itens,
  locais,
  trajeAtual,
  musicaHistoria,
}: {
  config: ConfiguracaoConvite;
  itens: ItemManual[];
  locais: LocalEvento[];
  trajeAtual: string;
  musicaHistoria: FaixaDoSite;
}) {
  const router = useRouter();
  // Os textos entram completos (padrão ← banco), para todo campo ter valor.
  const inicial: ConfiguracaoConvite = { ...config, texts: textosDoConvite(config) };
  const [form, setForm] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [erroImagem, setErroImagem] = useState<string | null>(null);

  function set<C extends Coluna>(coluna: C, valor: ConfiguracaoConvite[C]) {
    setForm((f) => ({ ...f, [coluna]: valor }));
  }

  function setTexto(chave: ChaveTextoConvite, valor: string) {
    setForm((f) => ({ ...f, texts: { ...f.texts, [chave]: valor } }));
  }

  const mudou = (colunas: Coluna[], chaves: ChaveTextoConvite[] = []) =>
    colunas.some((c) => !igual(form[c], salvo[c])) ||
    chaves.some((k) => (form.texts[k] ?? "") !== (salvo.texts[k] ?? ""));

  async function gravar(patch: Partial<ConfiguracaoConvite>): Promise<string | null> {
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("invitation_settings").update(patch).eq("id", true);
    if (error) return `Não deu para salvar: ${error.message}`;
    setSalvo((s) => ({ ...s, ...patch }));
    router.refresh();
    return null;
  }

  /**
   * Salva só as colunas e frases desta seção. As frases vivem juntas numa
   * coluna jsonb: parte-se do que está gravado e troca-se só as desta
   * seção, para não levar junto o que foi mexido em outra e não salvo.
   */
  function salvar(colunas: Coluna[], chaves: ChaveTextoConvite[] = []) {
    return async () => {
      const patch: Partial<ConfiguracaoConvite> = Object.fromEntries(
        colunas.map((c) => [c, form[c]]),
      );
      if (chaves.length) {
        const texts = { ...salvo.texts };
        for (const k of chaves) texts[k] = form.texts[k] ?? "";
        patch.texts = texts;
      }
      return gravar(patch);
    };
  }

  /** Imagem sobe e já fica gravada, como em Configurações. */
  function trocarImagem(coluna: Imagem, caminho: string | null) {
    set(coluna, caminho);
    setErroImagem(null);
    void gravar({ [coluna]: caminho }).then(setErroImagem);
  }

  // Funções, e não componentes: um componente declarado aqui dentro seria
  // outro a cada render, e o campo perderia o foco a cada letra digitada.
  function campoTexto({
    chave,
    rotulo,
    linhas = 0,
    placeholder,
    ajuda,
  }: {
    chave: ChaveTextoConvite;
    rotulo: string;
    linhas?: number;
    placeholder?: string;
    ajuda?: string;
  }) {
    const id = `convite-${chave}`;
    return (
      <div>
        <RotuloConfig htmlFor={id}>{rotulo}</RotuloConfig>
        {linhas ? (
          <textarea
            id={id}
            rows={linhas}
            className="campo resize-y"
            placeholder={placeholder}
            value={form.texts[chave] ?? ""}
            onChange={(e) => setTexto(chave, e.target.value)}
          />
        ) : (
          <input
            id={id}
            className="campo"
            placeholder={placeholder}
            value={form.texts[chave] ?? ""}
            onChange={(e) => setTexto(chave, e.target.value)}
          />
        )}
        {ajuda && <Ajuda>{ajuda}</Ajuda>}
      </div>
    );
  }

  function campoImagem({ coluna, rotulo, padrao }: { coluna: Imagem; rotulo: string; padrao: string }) {
    const caminho = form[coluna];
    return (
      <div>
        <UploadImagem
          pasta="convite"
          rotulo={rotulo}
          caminhoAtual={caminho}
          urlAtual={urlDoSite(caminho) ?? padrao}
          aoEnviar={(novo) => trocarImagem(coluna, novo)}
          aoRemover={() => trocarImagem(coluna, null)}
        />
        <Ajuda>
          {caminho
            ? "Imagem enviada por vocês. Remover volta à original do convite."
            : "Usando a imagem original do convite."}
        </Ajuda>
      </div>
    );
  }

  // O endereço vem do navegador: no servidor ele pode não existir, e a
  // diferença quebraria a hidratação.
  const [site, setSite] = useState("");
  useEffect(() => setSite(enderecoDoSite()), []);

  /* ---------- Ordem das seções ---------- */
  function mover(i: number, passo: -1 | 1) {
    const lista = [...form.sections];
    const alvo = i + passo;
    if (alvo < 0 || alvo >= lista.length) return;
    [lista[i], lista[alvo]] = [lista[alvo], lista[i]];
    set("sections", lista);
  }

  function alternarSecao(i: number) {
    const lista: SecaoConvite[] = form.sections.map((s, j) =>
      j === i ? { ...s, visivel: !s.visivel } : s,
    );
    set("sections", lista);
  }

  const T = {
    capa: ["capa_frase", "capa_botao"],
    apresentacao: ["apresentacao_texto", "versiculo_texto", "versiculo_referencia"],
    mensagem: ["mensagem_titulo", "mensagem_texto"],
    grandeDia: ["grande_dia_titulo"],
    contagem: ["contagem_titulo"],
    traje: ["traje_titulo", "traje_1", "traje_2", "traje_3"],
    manual: ["manual_titulo", "manual_intro"],
    confirmacao: ["confirmacao_titulo", "confirmacao_texto", "confirmacao_botao"],
    explorar: ["explorar_titulo", "explorar_texto"],
    final: ["final_texto", "final_assinatura"],
  } satisfies Record<string, ChaveTextoConvite[]>;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-sm text-terra">Conteúdo do site</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva sm:text-5xl">Convite Digital</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-terra">
            O convite que abre com a capa, a música e o toque para abrir. Cada seção
            salva no próprio botão, e o convite já mostra.
          </p>
        </div>
        <a
          href="/convite"
          target="_blank"
          rel="noopener noreferrer"
          className="versalete titulo-serif inline-flex min-h-11 items-center gap-2 rounded-sm bg-oliva px-5 py-2.5 text-sm text-creme-claro transition-colors hover:bg-oliva-escuro"
        >
          <Icone nome="envelope" className="h-4 w-4" />
          Ver o convite
        </a>
      </header>

      <nav
        aria-label="Seções do convite"
        className="sticky top-[4.3rem] z-20 -mx-4 border-y border-terra/15 bg-creme/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {INDICE.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="titulo-serif inline-flex min-h-10 items-center whitespace-nowrap rounded-full border border-terra/25 bg-creme-claro px-4 text-base text-terra transition-colors hover:border-oliva hover:text-oliva"
              >
                {s.rotulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {erroImagem && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {erroImagem}
        </p>
      )}

      {/* ---------- Links ---------- */}
      <SecaoConfig
        id="links"
        titulo="Os links do convite"
        descricao="Cada convidado recebe o próprio link, com o código do convite que ele já tem."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
            <p className="versalete titulo-serif text-sm text-oliva-escuro">Individual</p>
            <p className="mt-2 font-medium break-all text-oliva">{site}/convite/CÓDIGO</p>
            <Ajuda>
              A capa mostra o nome do convidado (ou o &ldquo;Nome no convite&rdquo; da ficha) e o
              botão de confirmar já leva ao cadastro com o código preenchido. O link de cada um
              está na ficha, em Convidados, e já vai junto na mensagem do WhatsApp.
            </Ajuda>
          </div>
          <div className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
            <p className="versalete titulo-serif text-sm text-oliva-escuro">Geral</p>
            <p className="mt-2 font-medium break-all text-oliva">{site}/convite</p>
            <Ajuda>
              O mesmo convite, sem nome na capa — para postar ou mandar num grupo. Quem já
              entrou no site vê o próprio nome.
            </Ajuda>
          </div>
        </div>
      </SecaoConfig>

      {/* ---------- Capa ---------- */}
      <SecaoSalvavel
        id="capa"
        titulo="Capa"
        descricao={
          <>
            A primeira tela, antes de abrir: a logo (que já traz nomes e data), a igreja, a frase e o nome do convidado. Os nomes e a data do resto do convite vêm de{" "}
            <Link href="/admin/configuracoes" className="text-oliva underline underline-offset-4">
              Configurações
            </Link>
            .
          </>
        }
        sujo={mudou([], T.capa)}
        aoSalvar={salvar([], T.capa)}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            {campoTexto({ chave: "capa_frase", rotulo: "Frase acima do nome", linhas: 2 })}
            {campoTexto({ chave: "capa_botao", rotulo: "Texto do botão", placeholder: "Toque para abrir", ajuda: "É neste toque que a música começa — o celular só deixa tocar depois dele." })}
          </div>
          <div className="space-y-6">
            {campoImagem({ coluna: "cover_logo_path", rotulo: "Logo da capa", padrao: IMAGENS_PADRAO.logo })}
            {campoImagem({ coluna: "cover_image_path", rotulo: "Desenho da capa", padrao: IMAGENS_PADRAO.capa })}
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Ordem ---------- */}
      <SecaoSalvavel
        id="ordem"
        titulo="Ordem das seções"
        descricao="O que vem depois da capa, de cima para baixo. Oculte o que não quiser mostrar."
        sujo={mudou(["sections"])}
        aoSalvar={salvar(["sections"])}
      >
        <ol className="space-y-2">
          {form.sections.map((secao, i) => {
            const info = SECOES_CONVITE[secao.id];
            return (
              <li
                key={secao.id}
                className={`flex items-center gap-3 rounded-sm border px-4 py-3 ${
                  secao.visivel ? "border-terra/20 bg-creme" : "border-dashed border-terra/25 bg-transparent"
                }`}
              >
                <span className="titulo-serif w-6 shrink-0 text-center text-lg text-terra tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`titulo-serif text-lg ${secao.visivel ? "text-oliva" : "text-terra line-through"}`}>
                    {info.rotulo}
                  </p>
                  <p className="text-sm text-terra">{info.descricao}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-terra">
                  <input
                    type="checkbox"
                    checked={secao.visivel}
                    onChange={() => alternarSecao(i)}
                    className="h-5 w-5 accent-[var(--color-oliva)]"
                  />
                  <span className="hidden sm:inline">Visível</span>
                  <span className="sr-only sm:hidden">Visível: {info.rotulo}</span>
                </label>
                <div className="flex shrink-0 flex-col sm:flex-row">
                  <BotaoSeta rotulo={`Subir ${info.rotulo}`} direcao="cima" disabled={i === 0} onClick={() => mover(i, -1)} />
                  <BotaoSeta
                    rotulo={`Descer ${info.rotulo}`}
                    direcao="baixo"
                    disabled={i === form.sections.length - 1}
                    onClick={() => mover(i, 1)}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </SecaoSalvavel>

      {/* ---------- Apresentação ---------- */}
      <SecaoSalvavel
        id="apresentacao"
        titulo="Apresentação"
        descricao="O convite propriamente dito, logo depois da abertura."
        sujo={mudou(["verse_visible"], T.apresentacao)}
        aoSalvar={salvar(["verse_visible"], T.apresentacao)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "apresentacao_texto", rotulo: "Texto do convite", linhas: 4, ajuda: "As quebras de linha aparecem no convite como vocês digitarem." })}
          <label className="flex cursor-pointer items-center gap-3 text-base text-oliva-escuro">
            <input
              type="checkbox"
              checked={form.verse_visible}
              onChange={(e) => set("verse_visible", e.target.checked)}
              className="h-5 w-5 accent-[var(--color-oliva)]"
            />
            Mostrar versículo
          </label>
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-[1fr_16rem] ${form.verse_visible ? "" : "opacity-60"}`}>
            {campoTexto({ chave: "versiculo_texto", rotulo: "Versículo", linhas: 3 })}
            {campoTexto({ chave: "versiculo_referencia", rotulo: "Referência", placeholder: "1 Coríntios 13:7" })}
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Mensagem ---------- */}
      <SecaoSalvavel
        id="mensagem"
        titulo="Mensagem aos convidados"
        descricao="Um recado de vocês. Sem texto, a seção não aparece."
        sujo={mudou([], T.mensagem)}
        aoSalvar={salvar([], T.mensagem)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "mensagem_titulo", rotulo: "Título" })}
          {campoTexto({ chave: "mensagem_texto", rotulo: "Mensagem", linhas: 5 })}
        </div>
      </SecaoSalvavel>

      {/* ---------- O Grande Dia ---------- */}
      <SecaoSalvavel
        id="grande-dia"
        titulo="O Grande Dia"
        descricao="Data, cerimônia e recepção. O convite lê os mesmos dados da Home — não há nada repetido aqui."
        sujo={mudou([], T.grandeDia)}
        aoSalvar={salvar([], T.grandeDia)}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            {campoTexto({ chave: "grande_dia_titulo", rotulo: "Título" })}
            <div className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
              <p className="versalete titulo-serif text-sm text-oliva-escuro">O que o convite mostra</p>
              <ul className="mt-3 space-y-2 text-base text-terra">
                {locais.map((l) => (
                  <li key={l.id}>
                    <span className="font-medium text-oliva">{ROTULOS_LOCAL[l.kind]}:</span> {l.name}
                    {l.starts_at ? ` · ${l.starts_at}` : ""}
                    {l.maps_url ? " · com localização" : " · sem link do mapa"}
                  </li>
                ))}
              </ul>
              <Ajuda>
                Nome, horário (pode ser &ldquo;logo após a cerimônia&rdquo;), endereço e link do mapa
                se editam em{" "}
                <Link href="/admin/configuracoes#local-do-evento" className="text-oliva underline underline-offset-4">
                  Configurações → Local do evento
                </Link>
                .
              </Ajuda>
            </div>
          </div>
          {campoImagem({ coluna: "ceremony_image_path", rotulo: "Ilustração da cerimônia", padrao: IMAGENS_PADRAO.cerimonia })}
        </div>
      </SecaoSalvavel>

      {/* ---------- Contagem ---------- */}
      <SecaoSalvavel
        id="contagem"
        titulo="Contagem regressiva"
        descricao="Conta até a data e a hora de Configurações → Data e traje."
        sujo={mudou([], T.contagem)}
        aoSalvar={salvar([], T.contagem)}
      >
        {campoTexto({ chave: "contagem_titulo", rotulo: "Título" })}
      </SecaoSalvavel>

      {/* ---------- Traje ---------- */}
      <SecaoSalvavel
        id="traje"
        titulo="Traje"
        descricao="Três frases, cada uma no seu campo."
        sujo={mudou([], T.traje)}
        aoSalvar={salvar([], T.traje)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "traje_titulo", rotulo: "Título" })}
          {campoTexto({ chave: "traje_1", rotulo: "Frase principal", placeholder: trajeAtual, ajuda: `Em branco, usa o traje de Configurações (hoje: “${trajeAtual}”).` })}
          {campoTexto({ chave: "traje_2", rotulo: "Segunda frase", linhas: 2 })}
          {campoTexto({ chave: "traje_3", rotulo: "Terceira frase" })}
        </div>
      </SecaoSalvavel>

      {/* ---------- Manual ---------- */}
      <SecaoSalvavel
        id="manual"
        titulo="Manual do Convidado"
        descricao="O título e a introdução. As orientações ficam logo abaixo."
        sujo={mudou([], T.manual)}
        aoSalvar={salvar([], T.manual)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "manual_titulo", rotulo: "Título" })}
          {campoTexto({ chave: "manual_intro", rotulo: "Introdução", linhas: 2 })}
        </div>
      </SecaoSalvavel>

      <ManualConvite itensIniciais={itens} />

      {/* ---------- Confirmação ---------- */}
      <SecaoSalvavel
        id="confirmacao"
        titulo="Confirmação de presença"
        descricao="O prazo aparece sozinho, vindo de Configurações → Confirmação."
        sujo={mudou([], T.confirmacao)}
        aoSalvar={salvar([], T.confirmacao)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "confirmacao_titulo", rotulo: "Título" })}
          {campoTexto({ chave: "confirmacao_texto", rotulo: "Texto", linhas: 2 })}
          {campoTexto({ chave: "confirmacao_botao", rotulo: "Texto do botão", placeholder: "Confirmar presença" })}
        </div>
      </SecaoSalvavel>

      {/* ---------- Explorar ---------- */}
      <SecaoSalvavel
        id="explorar"
        titulo="Explorar o site"
        descricao="Atalhos para Início, Nossa História, Presentes e Mural."
        sujo={mudou([], T.explorar)}
        aoSalvar={salvar([], T.explorar)}
      >
        <div className="space-y-6">
          {campoTexto({ chave: "explorar_titulo", rotulo: "Título" })}
          {campoTexto({ chave: "explorar_texto", rotulo: "Texto", linhas: 2 })}
        </div>
      </SecaoSalvavel>

      {/* ---------- Final ---------- */}
      <SecaoSalvavel
        id="final"
        titulo="Mensagem final"
        descricao="A despedida. Os nomes de vocês entram depois da assinatura."
        sujo={mudou([], T.final)}
        aoSalvar={salvar([], T.final)}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            {campoTexto({ chave: "final_texto", rotulo: "Mensagem", linhas: 3 })}
            {campoTexto({ chave: "final_assinatura", rotulo: "Assinatura", placeholder: "Com carinho," })}
          </div>
          {campoImagem({ coluna: "closing_image_path", rotulo: "Ilustração final", padrao: IMAGENS_PADRAO.final })}
        </div>
      </SecaoSalvavel>

      {/* ---------- Música ---------- */}
      <MusicaConvite
        form={form}
        set={set}
        sujo={mudou(["music_enabled", "music_use_story", "music_title", "music_volume", "music_loop"])}
        aoSalvar={salvar(["music_enabled", "music_use_story", "music_title", "music_volume", "music_loop"])}
        gravarArquivo={(caminho) => {
          set("music_file_path", caminho);
          return gravar({ music_file_path: caminho });
        }}
        musicaHistoria={musicaHistoria}
      />
    </div>
  );
}

function BotaoSeta({
  rotulo,
  direcao,
  disabled,
  onClick,
}: {
  rotulo: string;
  direcao: "cima" | "baixo";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full text-oliva transition-colors hover:bg-oliva/10 disabled:opacity-25"
    >
      <Icone nome="recolher" className={`h-4 w-4 ${direcao === "cima" ? "rotate-90" : "-rotate-90"}`} />
    </button>
  );
}
