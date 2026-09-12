"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ConfiguracoesSite } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { urlDoSite } from "@/lib/storage";
import { UploadImagem } from "@/components/UploadImagem";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco } from "@/components/painel";

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

type Campo = keyof ConfiguracoesSite;

export function Configuracoes({ config }: { config: ConfiguracoesSite }) {
  const router = useRouter();
  const [form, setForm] = useState(config);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function set(campo: Campo, valor: unknown) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setOk(false);
  }

  function setTexto(chave: string, valor: string) {
    setForm((f) => ({ ...f, texts: { ...f.texts, [chave]: valor } }));
    setOk(false);
  }

  /** A data vive como timestamp; o formulário usa dois campos amigáveis. */
  const dataLocal = form.wedding_at ? form.wedding_at.slice(0, 10) : "";
  const horaLocal = form.wedding_at ? new Date(form.wedding_at).toTimeString().slice(0, 5) : "";

  function mudarQuando(data: string, hora: string) {
    if (!data) return;
    // Brasília: guardamos com o fuso explícito para o site não virar o dia.
    set("wedding_at", `${data}T${hora || "16:00"}:00-03:00`);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOk(false);

    if (!form.bride_name.trim() || !form.groom_name.trim()) {
      setErro("Os nomes dos noivos são obrigatórios.");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { id: _id, ...campos } = form;
    const { error } = await supabase.from("site_settings").update(campos).eq("id", true);
    setSalvando(false);

    if (error) {
      setErro(`Não deu para salvar: ${error.message}`);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="versalete titulo-serif text-xs text-terra">Conteúdo do site</p>
          <h1 className="titulo-serif mt-2 text-4xl text-oliva">Configurações</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-terra">
            O que está aqui aparece no site na hora. Nada disso exige mexer no
            código.
          </p>
        </div>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar tudo"}
        </Botao>
      </header>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="ok">Salvo. O site já está mostrando as mudanças.</Aviso>}

      {/* ---------- Quem casa ---------- */}
      <Bloco titulo="Os noivos" descricao="Nomes, lema e a frase que abre o site.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="noiva">Noiva</Rotulo>
            <input id="noiva" required className="campo" value={form.bride_name}
              onChange={(e) => set("bride_name", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="noivo">Noivo</Rotulo>
            <input id="noivo" required className="campo" value={form.groom_name}
              onChange={(e) => set("groom_name", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="lema">Lema</Rotulo>
            <input id="lema" className="campo" value={form.motto}
              onChange={(e) => set("motto", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="hashtag">Hashtag</Rotulo>
            <input id="hashtag" className="campo" placeholder="#DeysianeEPedro"
              value={form.hashtag ?? ""} onChange={(e) => set("hashtag", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Rotulo htmlFor="frase">Frase de abertura</Rotulo>
            <input id="frase" className="campo" value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)} />
          </div>
        </div>
      </Bloco>

      {/* ---------- Quando e onde ---------- */}
      <Bloco titulo="Data, horários e local" descricao="Alimentam a contagem regressiva e o bloco do grande dia.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Rotulo htmlFor="data">Data</Rotulo>
            <input id="data" type="date" className="campo" value={dataLocal}
              onChange={(e) => mudarQuando(e.target.value, horaLocal)} />
          </div>
          <div>
            <Rotulo htmlFor="hora">Hora da cerimônia</Rotulo>
            <input id="hora" type="time" className="campo" value={horaLocal}
              onChange={(e) => mudarQuando(dataLocal, e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="hora-cerimonia">Como escrever a cerimônia</Rotulo>
            <input id="hora-cerimonia" className="campo" placeholder="16h00"
              value={form.ceremony_time ?? ""} onChange={(e) => set("ceremony_time", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="hora-recepcao">Como escrever a recepção</Rotulo>
            <input id="hora-recepcao" className="campo" placeholder="18h00"
              value={form.reception_time ?? ""} onChange={(e) => set("reception_time", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="trajes">Traje</Rotulo>
            <input id="trajes" className="campo" value={form.dress_code ?? ""}
              onChange={(e) => set("dress_code", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="local-nome">Local</Rotulo>
            <input id="local-nome" className="campo" value={form.venue_name ?? ""}
              onChange={(e) => set("venue_name", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="local-endereco">Endereço</Rotulo>
            <input id="local-endereco" className="campo" value={form.venue_address ?? ""}
              onChange={(e) => set("venue_address", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="local-cidade">Cidade</Rotulo>
            <input id="local-cidade" className="campo" value={form.venue_city ?? ""}
              onChange={(e) => set("venue_city", e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Rotulo htmlFor="local-maps">Link do Google Maps</Rotulo>
            <input id="local-maps" className="campo" placeholder="https://maps.app.goo.gl/…"
              value={form.venue_maps_url ?? ""} onChange={(e) => set("venue_maps_url", e.target.value)} />
          </div>
        </div>
      </Bloco>

      {/* ---------- Convite ---------- */}
      <Bloco
        titulo="Regras do convite"
        descricao="Quantas pessoas cabem num convite por padrão e o recado que o convidado lê antes de confirmar."
      >
        <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
          <div>
            <Rotulo htmlFor="limite">Lugares por convite</Rotulo>
            <input id="limite" type="number" min={1} max={20} className="campo"
              value={form.default_invite_limit}
              onChange={(e) => set("default_invite_limit", Number(e.target.value) || 1)} />
            <p className="mt-1.5 text-xs leading-relaxed text-terra/80">
              Vale para famílias novas. O limite de cada família fica na tela de
              convidados.
            </p>
          </div>
          <div>
            <Rotulo htmlFor="prazo">Prazo para confirmar</Rotulo>
            <input id="prazo" type="date" className="campo" value={form.rsvp_deadline ?? ""}
              onChange={(e) => set("rsvp_deadline", e.target.value || null)} />
          </div>
          <div className="sm:col-span-2">
            <Rotulo htmlFor="regras">Recado sobre acompanhantes</Rotulo>
            <textarea id="regras" rows={2} className="campo resize-y"
              value={form.companion_rules ?? ""}
              onChange={(e) => set("companion_rules", e.target.value)} />
          </div>
        </div>
      </Bloco>

      {/* ---------- Contato ---------- */}
      <Bloco titulo="Contato e redes" descricao="Como os convidados falam com vocês.">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Rotulo htmlFor="email">E-mail</Rotulo>
            <input id="email" type="email" className="campo" value={form.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="zap">WhatsApp</Rotulo>
            <input id="zap" className="campo" placeholder="(85) 99999-0000"
              value={form.contact_whatsapp ?? ""} onChange={(e) => set("contact_whatsapp", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor="insta">Instagram</Rotulo>
            <input id="insta" className="campo" placeholder="https://instagram.com/…"
              value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} />
          </div>
        </div>
      </Bloco>

      {/* ---------- Imagens ---------- */}
      <Bloco titulo="Imagens" descricao="Monograma, logo e a imagem que aparece ao compartilhar o link.">
        <div className="grid gap-6 sm:grid-cols-3">
          <UploadImagem
            pasta="marca"
            rotulo="Monograma D + P"
            proporcao="aspect-square"
            caminhoAtual={form.monogram_path}
            urlAtual={urlDoSite(form.monogram_path)}
            aoEnviar={(caminho) => set("monogram_path", caminho)}
            aoRemover={() => set("monogram_path", null)}
          />
          <UploadImagem
            pasta="marca"
            rotulo="Logo do cabeçalho"
            proporcao="aspect-square"
            caminhoAtual={form.logo_path}
            urlAtual={urlDoSite(form.logo_path)}
            aoEnviar={(caminho) => set("logo_path", caminho)}
            aoRemover={() => set("logo_path", null)}
          />
          <UploadImagem
            pasta="marca"
            rotulo="Imagem de compartilhamento"
            caminhoAtual={form.og_image_path}
            urlAtual={urlDoSite(form.og_image_path)}
            aoEnviar={(caminho) => set("og_image_path", caminho)}
            aoRemover={() => set("og_image_path", null)}
          />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-terra">
          As imagens sobem na hora; o resto do formulário só vale depois de
          &ldquo;Salvar tudo&rdquo;.
        </p>
      </Bloco>

      {/* ---------- Paleta ---------- */}
      <Bloco
        titulo="Paleta"
        descricao="As cores da identidade. Deixe em branco para usar as do PDF original."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CORES.map(({ campo, rotulo, padrao }) => {
            const valor = (form[campo] as string | null) ?? "";
            return (
              <div key={campo}>
                <Rotulo htmlFor={campo}>{rotulo}</Rotulo>
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
        <p className="mt-4 text-sm leading-relaxed text-terra">
          As fontes (Cormorant e Jost) continuam no código: trocá-las exige
          carregar outra família no site, então peça quando quiser mudar.
        </p>
      </Bloco>

      {/* ---------- Textos ---------- */}
      <Bloco titulo="Textos do site" descricao="Deixe em branco para manter o texto que já está escrito.">
        <div className="space-y-5">
          {TEXTOS.map(({ chave, rotulo }) => (
            <div key={chave}>
              <Rotulo htmlFor={chave}>{rotulo}</Rotulo>
              <textarea
                id={chave}
                rows={2}
                className="campo resize-y"
                value={form.texts?.[chave] ?? ""}
                onChange={(e) => setTexto(chave, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Bloco>

      <Botao type="submit" disabled={salvando} className="w-full">
        {salvando ? "Salvando…" : "Salvar tudo"}
      </Botao>
    </form>
  );
}
