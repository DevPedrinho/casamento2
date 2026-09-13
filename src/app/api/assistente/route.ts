import Anthropic from "@anthropic-ai/sdk";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { contextoDoConvidado, contextoDoPainel } from "@/lib/ia/contexto";
import { PERSONA_CONVIDADO, PERSONA_PAINEL } from "@/lib/ia/personas";

/**
 * O assistente do site.
 *
 * Tudo acontece no servidor: a chave da API nunca chega ao navegador, e o
 * contexto é montado com a sessão de quem perguntou, então as políticas do
 * banco continuam valendo dentro do chat.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELO = "claude-opus-5";

/** Limites simples para a conta não fugir do controle. */
const MAX_CARACTERES_PERGUNTA = 1000;
const MAX_TURNOS = 12;

type Turno = { autor: "pessoa" | "assistente"; texto: string };

export async function POST(requisicao: Request) {
  // O SDK aceita chave de API ou token de autorização; basta um dos dois.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { erro: "sem_chave", mensagem: "O assistente ainda não foi ativado." },
      { status: 503 },
    );
  }

  let corpo: { modo?: string; historico?: Turno[] };
  try {
    corpo = await requisicao.json();
  } catch {
    return Response.json({ erro: "json_invalido" }, { status: 400 });
  }

  const modo = corpo.modo === "painel" ? "painel" : "convidado";
  const historico = (corpo.historico ?? []).slice(-MAX_TURNOS);

  const ultima = historico[historico.length - 1];
  if (!ultima || ultima.autor !== "pessoa" || !ultima.texto.trim()) {
    return Response.json({ erro: "sem_pergunta" }, { status: 400 });
  }
  if (ultima.texto.length > MAX_CARACTERES_PERGUNTA) {
    return Response.json({ erro: "pergunta_longa" }, { status: 400 });
  }

  // ---------- Quem pode falar com qual assistente ----------
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (modo === "painel") {
    if (!user) return Response.json({ erro: "sem_sessao" }, { status: 401 });

    const { data: perfil } = await supabase
      .from("guests")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!perfil?.is_admin) {
      return Response.json({ erro: "sem_permissao" }, { status: 403 });
    }
  }

  const contexto =
    modo === "painel" ? await contextoDoPainel() : await contextoDoConvidado();
  const persona = modo === "painel" ? PERSONA_PAINEL : PERSONA_CONVIDADO;

  const cliente = new Anthropic();

  const mensagens: Anthropic.MessageParam[] = historico.map((turno) => ({
    role: turno.autor === "pessoa" ? "user" : "assistant",
    content: turno.texto,
  }));

  const fluxo = cliente.messages.stream({
    model: MODELO,
    max_tokens: 1500,
    // Respostas curtas de acolhimento não pedem raciocínio longo; esforço
    // baixo deixa a conversa rápida e barata sem perder o cuidado do tom.
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        // A persona é a parte estável do prompt: fica em cache entre as
        // perguntas, e só o contexto (que muda com os dados) vem depois.
        text: persona,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `Contexto deste casamento, lido agora do sistema:\n\n${contexto}`,
      },
    ],
    messages: mensagens,
  });

  // Devolve texto puro conforme vai saindo: o navegador mostra a resposta
  // sendo escrita, em vez de esperar o parágrafo inteiro.
  const codificador = new TextEncoder();
  const corrente = new ReadableStream<Uint8Array>({
    async start(controlador) {
      try {
        for await (const evento of fluxo) {
          if (
            evento.type === "content_block_delta" &&
            evento.delta.type === "text_delta"
          ) {
            controlador.enqueue(codificador.encode(evento.delta.text));
          }
        }
      } catch {
        controlador.enqueue(
          codificador.encode(
            "\n\nDesculpe, tive um problema para responder agora. Tente de novo em instantes.",
          ),
        );
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(corrente, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
