"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icone } from "@/components/Icones";
import { Coracao } from "@/components/Ornamentos";

type Turno = { autor: "pessoa" | "assistente"; texto: string };

const RECADOS: Record<string, string> = {
  sem_chave:
    "O assistente ainda não foi ativado. Os noivos precisam cadastrar a chave da IA nas configurações do site.",
  sem_permissao: "Este assistente é só para os noivos.",
  sem_sessao: "Sua sessão expirou. Entre de novo para continuar a conversa.",
  pergunta_longa: "Essa pergunta ficou comprida demais. Tente resumir um pouco.",
};

/**
 * O chat, em bolha no canto da tela.
 *
 * O mesmo componente serve aos dois assistentes: muda o modo, o nome e as
 * perguntas sugeridas. A resposta chega escrita aos poucos, como alguém
 * digitando do outro lado.
 */
export function Assistente({
  modo,
  nome,
  saudacao,
  sugestoes,
  ativo,
}: {
  modo: "painel" | "convidado";
  nome: string;
  saudacao: string;
  sugestoes: string[];
  /** Falso quando a chave da IA ainda não foi cadastrada no servidor. */
  ativo: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Rola para a última linha enquanto a resposta vai chegando.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [turnos, pensando]);

  // Fecha no Esc e devolve o foco para quem estava escrevendo.
  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || pensando) return;

    setErro(null);
    setTexto("");
    const historico: Turno[] = [...turnos, { autor: "pessoa", texto: limpa }];
    setTurnos(historico);
    setPensando(true);

    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, historico }),
      });

      if (!resposta.ok || !resposta.body) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(
          RECADOS[dados?.erro as string] ??
            "Não consegui responder agora. Tente de novo em instantes.",
        );
        setPensando(false);
        return;
      }

      // Abre uma resposta vazia e vai preenchendo conforme o texto chega.
      setTurnos([...historico, { autor: "assistente", texto: "" }]);
      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";

      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        setTurnos([...historico, { autor: "assistente", texto: acumulado }]);
      }
    } catch {
      setErro("A conexão caiu no meio da resposta. Tente de novo.");
    } finally {
      setPensando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void perguntar(texto);
  }

  // Sem chave, o convidado não vê bolha nenhuma — melhor não existir do que
  // existir quebrada. Os noivos veem, com a explicação de como ligar.
  // (A saída fica aqui embaixo de propósito: antes dos hooks, o React
  // passaria a contar ganchos diferentes entre um render e outro.)
  if (!ativo && modo === "convidado") return null;

  return (
    <>
      {/* ---------- Bolha ---------- */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? `Fechar ${nome}` : `Falar com ${nome}`}
        className={`fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-creme/20 bg-oliva text-creme-claro shadow-lg transition-transform mb-[env(safe-area-inset-bottom)] hover:scale-105 ${
          aberto ? "rotate-90" : ""
        }`}
      >
        {aberto ? (
          <Icone nome="fechar" className="h-6 w-6" />
        ) : (
          <Coracao className="w-6 text-creme-claro" />
        )}
      </button>

      {/* ---------- Janela ---------- */}
      {aberto && (
        <div
          role="dialog"
          aria-label={nome}
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-sm border border-terra/25 bg-creme-claro shadow-2xl mb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:right-5 sm:w-[24rem] md:w-[27rem]"
        >
          <header className="flex items-center gap-3 border-b border-terra/20 bg-creme px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavanda/20">
              <Coracao className="w-4 text-lavanda" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="titulo-serif block truncate text-lg text-oliva">{nome}</span>
              <span className="block truncate text-xs text-terra">
                {pensando ? "escrevendo…" : "aqui para ajudar"}
              </span>
            </span>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {!ativo && (
              <div className="rounded-sm border border-lavanda/35 bg-lavanda/10 px-4 py-3 text-sm leading-relaxed text-terra">
                <p className="titulo-serif text-base text-oliva">Falta ligar a assistente</p>
                <ol className="mt-3 space-y-2">
                  <li>
                    1. Crie uma chave de API em <strong>console.anthropic.com</strong>,
                    em API Keys.
                  </li>
                  <li>
                    2. Na Vercel, no projeto do site: Settings → Environment
                    Variables. Nome{" "}
                    <code className="font-mono text-oliva">ANTHROPIC_API_KEY</code>,
                    valor a chave, ambiente Production.
                  </li>
                  <li>
                    3. <strong>Republique o site</strong> (Deployments →
                    Redeploy). A Vercel só passa a enxergar a variável na
                    publicação seguinte — sem esse passo, ela continua
                    desligada.
                  </li>
                </ol>
                <p className="mt-3">
                  A chave fica só no servidor: ela nunca é enviada para o
                  navegador de ninguém.
                </p>
              </div>
            )}

            {ativo && turnos.length === 0 && (
              <>
                <p className="text-base leading-relaxed text-terra">{saudacao}</p>
                <ul className="space-y-2">
                  {sugestoes.map((sugestao) => (
                    <li key={sugestao}>
                      <button
                        type="button"
                        onClick={() => void perguntar(sugestao)}
                        className="w-full rounded-sm border border-terra/25 bg-creme px-4 py-3 text-left text-sm text-oliva transition-colors hover:border-oliva/50"
                      >
                        {sugestao}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {turnos.map((turno, i) => (
              <div
                key={i}
                className={turno.autor === "pessoa" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-sm px-4 py-3 text-base leading-relaxed ${
                    turno.autor === "pessoa"
                      ? "bg-oliva text-creme-claro"
                      : "border border-terra/20 bg-creme text-oliva"
                  }`}
                >
                  {turno.texto || (pensando ? "…" : "")}
                </p>
              </div>
            ))}

            {erro && (
              <p className="rounded-sm border border-red-800/30 bg-red-50 px-4 py-3 text-sm text-red-800">
                {erro}
              </p>
            )}

            <div ref={fimRef} />
          </div>

          <form onSubmit={enviar} className="border-t border-terra/20 bg-creme px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={campoRef}
                rows={1}
                disabled={!ativo}
                className="campo max-h-28 flex-1 resize-none py-2.5"
                placeholder="Escreva sua dúvida…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void perguntar(texto);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!ativo || pensando || !texto.trim()}
                aria-label="Enviar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oliva text-creme-claro transition-colors hover:bg-oliva-escuro disabled:opacity-40"
              >
                <Icone nome="recolher" className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
