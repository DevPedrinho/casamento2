"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { ConfiguracoesSite } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import { UploadImagem } from "@/components/UploadImagem";
import { Ajuda, RodapeSalvar, RotuloConfig, SecaoConfig, type EstadoSalvar } from "./ui";

/** Campos de texto livre do site, por chave. */
const TEXTOS = [
  { chave: "home_paragrafo_1", rotulo: "Home · primeiro parágrafo da história" },
  { chave: "home_paragrafo_2", rotulo: "Home · segundo parágrafo" },
  { chave: "home_convite", rotulo: "Home · frase de convite" },
  { chave: "presentes_intro", rotulo: "Presentes · texto de abertura" },
  { chave: "mural_intro", rotulo: "Mural · texto de abertura" },
  { chave: "rsvp_intro", rotulo: "Confirmação · recado antes do formulário" },
];

const CORES = [
  { campo: "color_olive", rotulo: "Oliva (cor principal)", padrao: "#666a46" },
  { campo: "color_lavender", rotulo: "Lilás (destaques)", padrao: "#9581a6" },
  { campo: "color_earth", rotulo: "Terra (textos)", padrao: "#876f58" },
  { campo: "color_cream", rotulo: "Creme (fundo)", padrao: "#f0e7da" },
] as const;

/** A ordem da página, que o índice do topo repete. */
const SECOES = [
  { id: "os-noivos", rotulo: "Os noivos" },
  { id: "data-e-traje", rotulo: "Data e traje" },
  { id: "local-do-evento", rotulo: "Local do evento" },
  { id: "confirmacao", rotulo: "Confirmação" },
  { id: "contato", rotulo: "Contato e redes" },
  { id: "imagens", rotulo: "Imagens" },
  { id: "paleta", rotulo: "Paleta" },
  { id: "textos", rotulo: "Textos do site" },
];

type Campo = keyof ConfiguracoesSite;

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function Configuracoes({
  config,
  localDoEvento,
}: {
  config: ConfiguracoesSite;
  /** A seção de cerimônia e recepção, que entra logo depois de "Data e traje". */
  localDoEvento: ReactNode;
}) {
  const router = useRouter();
  const [form, setForm] = useState(config);
  /** O que está gravado no banco — é contra ele que cada seção sabe se mudou. */
  const [salvo, setSalvo] = useState(config);
  const [erroImagem, setErroImagem] = useState<string | null>(null);

  function set(campo: Campo, valor: unknown) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setTexto(chave: string, valor: string) {
    setForm((f) => ({ ...f, texts: { ...f.texts, [chave]: valor } }));
  }

  const mudou = (campos: Campo[]) => campos.some((c) => !igual(form[c], salvo[c]));

  /** Grava só as colunas pedidas; devolve a mensagem de erro, se houver. */
  async function gravar(patch: Partial<ConfiguracoesSite>): Promise<string | null> {
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("site_settings").update(patch).eq("id", true);
    if (error) return `Não deu para salvar: ${error.message}`;
    setSalvo((s) => ({ ...s, ...patch }));
    router.refresh();
    return null;
  }

  function salvarCampos(campos: Campo[], validar?: () => string | null) {
    return async () => {
      const problema = validar?.();
      if (problema) return problema;
      const patch = Object.fromEntries(campos.map((c) => [c, form[c]])) as Partial<ConfiguracoesSite>;
      return gravar(patch);
    };
  }

  /** Imagem sobe e já fica gravada: não há botão para esquecer de apertar. */
  function trocarImagem(campo: "monogram_path" | "logo_path" | "og_image_path", caminho: string | null) {
    set(campo, caminho);
    setErroImagem(null);
    void gravar({ [campo]: caminho }).then(setErroImagem);
  }

  /** A data vive como timestamp; o formulário usa dois campos amigáveis. */
  const dataLocal = form.wedding_at ? form.wedding_at.slice(0, 10) : "";
  const horaLocal = form.wedding_at ? new Date(form.wedding_at).toTimeString().slice(0, 5) : "";

  function mudarQuando(data: string, hora: string) {
    if (!data) return;
    // Brasília: guardamos com o fuso explícito para o site não virar o dia.
    set("wedding_at", `${data}T${hora || "16:00"}:00-03:00`);
  }

  const NOIVOS: Campo[] = ["bride_name", "groom_name", "motto", "hashtag", "tagline"];
  const QUANDO: Campo[] = ["wedding_at", "dress_code"];
  const CONFIRMACAO: Campo[] = ["rsvp_deadline", "companion_rules"];
  const CONTATO: Campo[] = ["contact_email", "contact_whatsapp", "instagram_url"];
  const PALETA: Campo[] = CORES.map((c) => c.campo);
  const TEXTOS_SITE: Campo[] = ["texts"];

  return (
    <div className="space-y-8">
      <header>
        <p className="versalete titulo-serif text-sm text-terra">Conteúdo do site</p>
        <h1 className="titulo-serif mt-2 text-4xl text-oliva sm:text-5xl">Configurações</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-terra">
          O que está aqui aparece no site assim que você salva. Cada seção tem o
          próprio botão Salvar, no rodapé dela.
        </p>
      </header>

      {/* ---------- Índice: a página é longa ---------- */}
      <nav
        aria-label="Seções das configurações"
        className="sticky top-[4.3rem] z-20 -mx-4 border-y border-terra/15 bg-creme/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECOES.map((s) => (
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

      {/* ---------- Quem casa ---------- */}
      <SecaoSalvavel
        id="os-noivos"
        titulo="Os noivos"
        descricao="Nomes, lema e a frase que abre o site."
        sujo={mudou(NOIVOS)}
        aoSalvar={salvarCampos(NOIVOS, () =>
          !form.bride_name.trim() || !form.groom_name.trim() ? "Os nomes dos noivos são obrigatórios." : null,
        )}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <RotuloConfig htmlFor="noiva">Noiva</RotuloConfig>
            <input id="noiva" required className="campo" value={form.bride_name}
              onChange={(e) => set("bride_name", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="noivo">Noivo</RotuloConfig>
            <input id="noivo" required className="campo" value={form.groom_name}
              onChange={(e) => set("groom_name", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="lema">Lema</RotuloConfig>
            <input id="lema" className="campo" value={form.motto}
              onChange={(e) => set("motto", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="hashtag">Hashtag</RotuloConfig>
            <input id="hashtag" className="campo" placeholder="#DeysianeEPedro"
              value={form.hashtag ?? ""} onChange={(e) => set("hashtag", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <RotuloConfig htmlFor="frase">Frase de abertura</RotuloConfig>
            <input id="frase" className="campo" value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)} />
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Quando ---------- */}
      <SecaoSalvavel
        id="data-e-traje"
        titulo="Data e traje"
        descricao="A data e a hora alimentam a contagem regressiva e a data mostrada no site. Horário e endereço de cada local ficam logo abaixo."
        sujo={mudou(QUANDO)}
        aoSalvar={salvarCampos(QUANDO)}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <RotuloConfig htmlFor="data">Data</RotuloConfig>
            <input id="data" type="date" className="campo" value={dataLocal}
              onChange={(e) => mudarQuando(e.target.value, horaLocal)} />
          </div>
          <div>
            <RotuloConfig htmlFor="hora">Hora da cerimônia</RotuloConfig>
            <input id="hora" type="time" className="campo" value={horaLocal}
              onChange={(e) => mudarQuando(dataLocal, e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="trajes">Traje</RotuloConfig>
            <input id="trajes" className="campo" value={form.dress_code ?? ""}
              onChange={(e) => set("dress_code", e.target.value)} />
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Cerimônia e recepção ---------- */}
      {localDoEvento}

      {/* ---------- Confirmação ---------- */}
      <SecaoSalvavel
        id="confirmacao"
        titulo="Confirmação de presença"
        descricao="Até quando vocês aceitam resposta e o recado que o convidado lê antes de responder."
        sujo={mudou(CONFIRMACAO)}
        aoSalvar={salvarCampos(CONFIRMACAO)}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <RotuloConfig htmlFor="prazo">Prazo para confirmar</RotuloConfig>
            <input id="prazo" type="date" className="campo" value={form.rsvp_deadline ?? ""}
              onChange={(e) => set("rsvp_deadline", e.target.value || null)} />
          </div>
          <div className="sm:col-span-2">
            <RotuloConfig htmlFor="regras">Recado sobre acompanhantes</RotuloConfig>
            <textarea id="regras" rows={3} className="campo resize-y"
              value={form.companion_rules ?? ""}
              onChange={(e) => set("companion_rules", e.target.value)} />
            <Ajuda>
              O site não deixa ninguém passar do número de acompanhantes previsto no
              convite; o recado explica a regra antes de a pessoa preencher.
            </Ajuda>
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Contato ---------- */}
      <SecaoSalvavel
        id="contato"
        titulo="Contato e redes"
        descricao="Como os convidados falam com vocês."
        sujo={mudou(CONTATO)}
        aoSalvar={salvarCampos(CONTATO)}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <RotuloConfig htmlFor="email">E-mail</RotuloConfig>
            <input id="email" type="email" className="campo" value={form.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="zap">WhatsApp</RotuloConfig>
            <input id="zap" className="campo" placeholder="(85) 99999-0000"
              value={form.contact_whatsapp ?? ""} onChange={(e) => set("contact_whatsapp", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor="insta">Instagram</RotuloConfig>
            <input id="insta" className="campo" placeholder="https://instagram.com/…"
              value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} />
          </div>
        </div>
      </SecaoSalvavel>

      {/* ---------- Imagens: salvam sozinhas ---------- */}
      <SecaoConfig
        id="imagens"
        titulo="Imagens"
        descricao="Monograma, logo e a imagem que aparece ao compartilhar o link. Cada imagem fica salva assim que termina de subir."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <UploadImagem
            pasta="marca"
            rotulo="Monograma D + P"
            proporcao="aspect-square"
            caminhoAtual={form.monogram_path}
            urlAtual={urlDoSite(form.monogram_path)}
            aoEnviar={(caminho) => trocarImagem("monogram_path", caminho)}
            aoRemover={() => trocarImagem("monogram_path", null)}
          />
          <UploadImagem
            pasta="marca"
            rotulo="Logo do cabeçalho"
            proporcao="aspect-square"
            caminhoAtual={form.logo_path}
            urlAtual={urlDoSite(form.logo_path)}
            aoEnviar={(caminho) => trocarImagem("logo_path", caminho)}
            aoRemover={() => trocarImagem("logo_path", null)}
          />
          <UploadImagem
            pasta="marca"
            rotulo="Imagem de compartilhamento"
            caminhoAtual={form.og_image_path}
            urlAtual={urlDoSite(form.og_image_path)}
            aoEnviar={(caminho) => trocarImagem("og_image_path", caminho)}
            aoRemover={() => trocarImagem("og_image_path", null)}
          />
        </div>
        {erroImagem && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-800">
            {erroImagem}
          </p>
        )}
      </SecaoConfig>

      {/* ---------- Paleta ---------- */}
      <SecaoSalvavel
        id="paleta"
        titulo="Paleta"
        descricao="As cores da identidade. Deixe em branco para usar as do PDF original."
        sujo={mudou(PALETA)}
        aoSalvar={salvarCampos(PALETA)}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CORES.map(({ campo, rotulo, padrao }) => {
            const valor = (form[campo] as string | null) ?? "";
            return (
              <div key={campo}>
                <RotuloConfig htmlFor={campo}>{rotulo}</RotuloConfig>
                <div className="flex items-center gap-3">
                  <input
                    id={campo}
                    type="color"
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-sm border border-terra/30 bg-creme-claro"
                    value={valor || padrao}
                    onChange={(e) => set(campo, e.target.value)}
                  />
                  <input
                    aria-label={`${rotulo} em hexadecimal`}
                    className="campo font-mono"
                    placeholder={padrao}
                    value={valor}
                    onChange={(e) => set(campo, e.target.value || null)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Ajuda>
          As fontes (Cormorant e Jost) continuam no código: trocá-las exige
          carregar outra família no site, então peça quando quiser mudar.
        </Ajuda>
      </SecaoSalvavel>

      {/* ---------- Textos ---------- */}
      <SecaoSalvavel
        id="textos"
        titulo="Textos do site"
        descricao="Deixe em branco para manter o texto que já está escrito."
        sujo={mudou(TEXTOS_SITE)}
        aoSalvar={salvarCampos(TEXTOS_SITE)}
      >
        <div className="space-y-6">
          {TEXTOS.map(({ chave, rotulo }) => (
            <div key={chave}>
              <RotuloConfig htmlFor={chave}>{rotulo}</RotuloConfig>
              <textarea
                id={chave}
                rows={3}
                className="campo resize-y"
                value={form.texts?.[chave] ?? ""}
                onChange={(e) => setTexto(chave, e.target.value)}
              />
            </div>
          ))}
        </div>
      </SecaoSalvavel>
    </div>
  );
}

/** Uma seção que é um formulário próprio, com o rodapé de salvar. */
function SecaoSalvavel({
  id,
  titulo,
  descricao,
  sujo,
  aoSalvar,
  children,
}: {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  sujo: boolean;
  aoSalvar: () => Promise<string | null>;
  children: ReactNode;
}) {
  const [salvando, setSalvando] = useState(false);
  const [estado, setEstado] = useState<EstadoSalvar>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setEstado(null);
    const erro = await aoSalvar();
    setSalvando(false);
    setEstado(erro ? { tipo: "erro", mensagem: erro } : { tipo: "ok" });
  }

  return (
    <SecaoConfig
      id={id}
      titulo={titulo}
      descricao={descricao}
      onSubmit={enviar}
      rodape={<RodapeSalvar sujo={sujo} salvando={salvando} estado={estado} />}
    >
      {children}
    </SecaoConfig>
  );
}
