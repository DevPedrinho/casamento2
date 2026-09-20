"use client";

import { useMemo, useState } from "react";
import type { ConvidadoCompleto } from "@/lib/tipos";
import { formatarCodigo } from "@/lib/codigo";
import { urlDoSite } from "@/lib/storage";
import { linkWhatsApp, mensagemDoConvite } from "@/lib/convite";
import { temAcessoAoSite } from "@/lib/convidado";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/components/Avatar";
import { Botao, BotaoExterno } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha } from "@/components/Ficha";

/**
 * A fila de convites: um convidado por vez, o WhatsApp já com a mensagem e
 * o código, marca como entregue e passa para o próximo.
 *
 * Quem não tem telefone não trava a fila: vai para o fim, com um campo
 * para digitar o número na hora e voltar para a vez.
 */
export function FilaDeConvites({
  convidados,
  aoFechar,
  aoAtualizar,
}: {
  convidados: ConvidadoCompleto[];
  aoFechar: () => void;
  /** Depois de gerar códigos: a lista recarrega e a fila reflete. */
  aoAtualizar: () => void;
}) {
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [pulados, setPulados] = useState<Set<string>>(new Set());
  const [telefones, setTelefones] = useState<Record<string, string>>({});
  const [digitando, setDigitando] = useState<Record<string, string>>({});
  const [salvandoFone, setSalvandoFone] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [mostrarTodosSemFone, setMostrarTodosSemFone] = useState(false);

  const telefoneDe = (c: ConvidadoCompleto) => telefones[c.id] ?? c.whatsapp ?? c.phone ?? null;

  const semCodigo = convidados.filter((c) => !c.access_code && temAcessoAoSite(c)).length;
  const semAcesso = convidados.filter((c) => !temAcessoAoSite(c)).length;

  // Ainda por entregar, família a família.
  const pendentes = useMemo(
    () =>
      convidados
        .filter((c) => c.access_code && temAcessoAoSite(c) && !c.code_sent_at && !enviados.has(c.id))
        .sort(
          (a, b) =>
            (a.grupo?.name ?? "zzz").localeCompare(b.grupo?.name ?? "zzz", "pt-BR") ||
            a.full_name.localeCompare(b.full_name, "pt-BR"),
        ),
    [convidados, enviados],
  );

  const comTelefone = pendentes.filter((c) => linkWhatsApp(telefoneDe(c), "x"));
  const semTelefone = pendentes.filter((c) => !linkWhatsApp(telefoneDe(c), "x"));
  // Quem foi pulado volta no fim, para não sumir.
  const ordenados = [...comTelefone.filter((c) => !pulados.has(c.id)), ...comTelefone.filter((c) => pulados.has(c.id))];
  const atual = ordenados[0] ?? null;
  const proximos = ordenados.slice(1, 5);

  const entreguesAntes = convidados.filter((c) => c.code_sent_at).length;
  const entregues = entreguesAntes + enviados.size;
  const comAcesso = convidados.length - semAcesso;

  const mensagem = atual ? mensagemDoConvite(atual.full_name, atual.access_code) : "";
  const zap = atual ? linkWhatsApp(telefoneDe(atual), mensagem) : null;

  /** Grava a entrega e, se ainda não tinha sido contatado, avança o funil. */
  async function marcar(c: ConvidadoCompleto) {
    setEnviados((s) => new Set(s).add(c.id));
    setCopiado(false);
    const supabase = criarClienteNavegador();
    const hoje = new Date().toISOString().slice(0, 10);
    await supabase
      .from("guests")
      .update({
        code_sent_at: new Date().toISOString(),
        last_contact_at: hoje,
        ...(c.invite_status === "nao_contatado" ? { invite_status: "convite_enviado" } : {}),
      })
      .eq("id", c.id);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem área de transferência: a mensagem está na tela.
    }
  }

  async function salvarTelefone(c: ConvidadoCompleto) {
    const valor = (digitando[c.id] ?? "").trim();
    if (!linkWhatsApp(valor, "x")) return;
    setSalvandoFone(c.id);
    const supabase = criarClienteNavegador();
    await supabase.from("guests").update({ phone: valor }).eq("id", c.id);
    setTelefones((t) => ({ ...t, [c.id]: valor }));
    setSalvandoFone(null);
  }

  async function gerarCodigos() {
    setGerando(true);
    const supabase = criarClienteNavegador();
    await supabase.rpc("admin_gerar_codigos_faltantes");
    setGerando(false);
    aoAtualizar();
  }

  const listaSemFone = mostrarTodosSemFone ? semTelefone : semTelefone.slice(0, 8);

  return (
    <Ficha
      rotuloAria="Fila de convites"
      aoFechar={aoFechar}
      cabecalho={
        <>
          <p className="versalete text-xs text-terra">Enviar convites</p>
          <h2 className="titulo-serif mt-1 text-2xl leading-tight text-oliva">
            {ordenados.length === 0 ? "Fila vazia" : `Faltam ${ordenados.length}`}
          </h2>
        </>
      }
      abaixoDoCabecalho={
        <p className="mt-2 text-sm text-terra">
          {entregues} de {comAcesso} entregues
          {enviados.size > 0 && ` · ${enviados.size} agora`}
          {semTelefone.length > 0 && ` · ${semTelefone.length} sem telefone`}
          {semAcesso > 0 && ` · ${semAcesso} criança${semAcesso === 1 ? "" : "s"} sem acesso`}
        </p>
      }
      rodape={
        <Botao type="button" variante="contorno" onClick={aoFechar} className="flex-1 sm:flex-none">
          Fechar
        </Botao>
      }
    >
      {semCodigo > 0 && (
        <CartaoFicha titulo="Antes de começar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-terra">
              {semCodigo} convidado{semCodigo === 1 ? " ainda está" : "s ainda estão"} sem código — sem ele o convite não sai.
            </p>
            <Botao type="button" onClick={gerarCodigos} disabled={gerando}>
              {gerando ? "Gerando…" : `Gerar os ${semCodigo}`}
            </Botao>
          </div>
        </CartaoFicha>
      )}

      {atual ? (
        <CartaoFicha titulo="A vez de">
          <div className="flex items-center gap-3">
            <Avatar nome={atual.full_name} url={urlDoSite(atual.avatar_path)} />
            <div className="min-w-0 flex-1">
              <p className="titulo-serif truncate text-xl text-oliva">{atual.full_name}</p>
              <p className="truncate text-sm text-terra">
                {[atual.grupo?.name, atual.relationship, telefoneDe(atual)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <code className="hidden rounded-sm bg-creme-escuro/60 px-2.5 py-1.5 font-mono text-sm tracking-widest text-oliva sm:block">
              {formatarCodigo(atual.access_code)}
            </code>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-sm border border-terra/15 bg-creme-claro/70 px-4 py-3 font-sans text-sm leading-relaxed text-terra">
            {mensagem}
          </pre>

          <div className="mt-4 flex flex-wrap gap-3">
            {zap && (
              <BotaoExterno href={zap} target="_blank" rel="noopener noreferrer" onClick={() => marcar(atual)} className="flex-1 sm:flex-none">
                Abrir WhatsApp
              </BotaoExterno>
            )}
            <Botao type="button" variante="contorno" onClick={copiar}>
              {copiado ? "Copiado!" : "Copiar mensagem"}
            </Botao>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5">
            <button type="button" onClick={() => marcar(atual)} className={`${ACAO_FICHA} text-oliva`}>
              marcar entregue sem enviar
            </button>
            <button type="button" onClick={() => setPulados((s) => new Set(s).add(atual.id))} className={`${ACAO_FICHA} text-terra`}>
              pular por agora
            </button>
          </div>
        </CartaoFicha>
      ) : (
        <CartaoFicha titulo="A vez de">
          <p className="text-sm text-terra">
            {pendentes.length === 0
              ? "Todo mundo já recebeu o código."
              : "Todo mundo com telefone já recebeu. Os que faltam estão abaixo, sem número."}
          </p>
        </CartaoFicha>
      )}

      {proximos.length > 0 && (
        <CartaoFicha titulo="Na sequência">
          {proximos.map((c) => (
            <LinhaFicha key={c.id} rotulo={c.full_name} valor={c.grupo?.name ?? "—"} />
          ))}
        </CartaoFicha>
      )}

      {semTelefone.length > 0 && (
        <CartaoFicha titulo={`Sem telefone · ${semTelefone.length}`}>
          <p className="mb-3 text-sm text-terra">Digite o número e a pessoa entra na fila na hora.</p>
          <ul className="space-y-3">
            {listaSemFone.map((c) => (
              <li key={c.id}>
                <Rotulo htmlFor={`fone-${c.id}`}>{c.full_name}</Rotulo>
                <div className="flex gap-2">
                  <input
                    id={`fone-${c.id}`}
                    className="campo"
                    inputMode="tel"
                    placeholder="85 9xxxx-xxxx"
                    value={digitando[c.id] ?? ""}
                    onChange={(e) => setDigitando((d) => ({ ...d, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void salvarTelefone(c);
                      }
                    }}
                  />
                  <Botao type="button" variante="contorno" onClick={() => salvarTelefone(c)} disabled={salvandoFone === c.id || !linkWhatsApp(digitando[c.id] ?? "", "x")}>
                    {salvandoFone === c.id ? "…" : "Salvar"}
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
          {semTelefone.length > 8 && (
            <button type="button" onClick={() => setMostrarTodosSemFone((v) => !v)} className={`${ACAO_FICHA} mt-3 text-oliva`}>
              {mostrarTodosSemFone ? "mostrar menos" : `ver todos os ${semTelefone.length}`}
            </button>
          )}
        </CartaoFicha>
      )}
    </Ficha>
  );
}
