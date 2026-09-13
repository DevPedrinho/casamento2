import "server-only";

import { criarClienteServidor } from "@/lib/supabase/servidor";
import type {
  Autor,
  Comentario,
  GrupoStory,
  Publicacao,
  ReacaoStory,
  VisualizacaoStory,
} from "@/lib/tipos";

/** Validade das URLs assinadas das fotos. O mural é server-rendered a cada
 *  visita, então uma hora sobra — e limita o estrago se um link vazar. */
const VALIDADE_URL_SEGUNDOS = 60 * 60;

const BUCKET = "mural";

type LinhaBruta = {
  id: string;
  author_id: string;
  kind: "feed" | "story";
  caption: string | null;
  image_path: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  expires_at: string | null;
  created_at: string;
  post_likes: { guest_id: string }[] | null;
  post_comments: Omit<Comentario, "autor">[] | null;
};

/** O PostgREST devolve o embed ora como objeto, ora como array de um item. */
function primeiro<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

/**
 * Os nomes não vêm pelo embed de guests: a política de leitura de lá entrega
 * a cada convidado só a própria linha, e o mural voltava sem autor nenhum.
 * Vêm de perfis_publicos, que expõe nome e papel e mais nada.
 */
const SELECT_POST = `
  id, author_id, kind, caption, image_path, is_hidden, hidden_reason, expires_at, created_at,
  post_likes ( guest_id ),
  post_comments ( id, post_id, guest_id, body, is_hidden, created_at )
`;

/** Quem é quem, numa consulta só para o feed inteiro. */
async function carregarAutores(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  ids: string[],
): Promise<Map<string, Autor>> {
  const mapa = new Map<string, Autor>();
  const unicos = [...new Set(ids)].filter(Boolean);
  if (unicos.length === 0) return mapa;

  const { data } = await supabase
    .from("perfis_publicos")
    .select("id, full_name, ceremony_role, is_featured")
    .in("id", unicos);

  for (const a of (data ?? []) as Autor[]) mapa.set(a.id, a);
  return mapa;
}

/** Todos os ids de pessoa que aparecem num lote de posts. */
function idsDasPessoas(linhas: LinhaBruta[]): string[] {
  return linhas.flatMap((l) => [
    l.author_id,
    ...(l.post_likes ?? []).map((c) => c.guest_id),
    ...(l.post_comments ?? []).map((c) => c.guest_id),
  ]);
}

/**
 * Gera as URLs assinadas de um lote de fotos numa chamada só.
 * Uma requisição por post deixaria o feed lento assim que crescesse.
 */
async function assinarFotos(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  caminhos: string[],
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (caminhos.length === 0) return mapa;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(caminhos, VALIDADE_URL_SEGUNDOS);

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
}

function montarPublicacao(
  linha: LinhaBruta,
  urls: Map<string, string>,
  meuId: string,
  autores: Map<string, Autor>,
): Publicacao {
  const curtidas = linha.post_likes ?? [];
  const comentarios = (linha.post_comments ?? [])
    .filter((c) => !c.is_hidden || c.guest_id === meuId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map<Comentario>((c) => ({
      id: c.id,
      post_id: c.post_id,
      guest_id: c.guest_id,
      body: c.body,
      is_hidden: c.is_hidden,
      created_at: c.created_at,
      autor: autores.get(c.guest_id) ?? null,
    }));

  return {
    id: linha.id,
    author_id: linha.author_id,
    kind: linha.kind,
    caption: linha.caption,
    image_path: linha.image_path,
    is_hidden: linha.is_hidden,
    hidden_reason: linha.hidden_reason,
    expires_at: linha.expires_at,
    created_at: linha.created_at,
    autor: autores.get(linha.author_id) ?? null,
    imagem_url: linha.image_path ? (urls.get(linha.image_path) ?? null) : null,
    curtidas: curtidas.length,
    eu_curti: curtidas.some((c) => c.guest_id === meuId),
    quem_curtiu: curtidas
      .map((c) => autores.get(c.guest_id))
      .filter((a): a is Autor => Boolean(a)),
    comentarios,
  };
}

/** Posts do feed, do mais novo para o mais antigo. */
export async function carregarFeed(meuId: string, limite = 40): Promise<Publicacao[]> {
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("posts")
    .select(SELECT_POST)
    .eq("kind", "feed")
    .order("created_at", { ascending: false })
    .limit(limite);

  const linhas = (data ?? []) as unknown as LinhaBruta[];
  const [urls, autores] = await Promise.all([
    assinarFotos(
      supabase,
      linhas.map((l) => l.image_path).filter((p): p is string => Boolean(p)),
    ),
    carregarAutores(supabase, idsDasPessoas(linhas)),
  ]);

  const posts = linhas.map((l) => montarPublicacao(l, urls, meuId, autores));

  // Madrinhas, padrinhos e pais na frente — mas só enquanto a publicação é
  // nova. Depois de um dia ela desce e o feed volta a ser cronológico, senão
  // as mesmas quatro pessoas ficariam no topo até o casamento.
  const desdeOntem = Date.now() - 24 * 60 * 60 * 1000;
  const noTopo = (p: Publicacao) =>
    p.autor?.is_featured && new Date(p.created_at).getTime() > desdeOntem ? 1 : 0;

  return posts.sort(
    (a, b) => noTopo(b) - noTopo(a) || b.created_at.localeCompare(a.created_at),
  );
}

/** Stories no ar, agrupados por autor — como a barra de bolinhas do topo. */
export async function carregarStories(meuId: string): Promise<GrupoStory[]> {
  const supabase = await criarClienteServidor();

  const [{ data }, { data: vistos }] = await Promise.all([
    supabase
      .from("posts")
      .select(SELECT_POST)
      .eq("kind", "story")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
    supabase.from("story_views").select("post_id").eq("guest_id", meuId),
  ]);

  const linhas = (data ?? []) as unknown as LinhaBruta[];
  const [urls, autores] = await Promise.all([
    assinarFotos(
      supabase,
      linhas.map((l) => l.image_path).filter((p): p is string => Boolean(p)),
    ),
    carregarAutores(supabase, idsDasPessoas(linhas)),
  ]);
  const jaVistos = new Set((vistos ?? []).map((v) => v.post_id));

  // Audiência e reações. O RLS entrega só o que o autor pode ver, então
  // esta consulta já volta filtrada — não precisamos filtrar de novo aqui.
  const ids = linhas.map((l) => l.id);
  const [{ data: audiencia }, { data: reacoes }] = ids.length
    ? await Promise.all([
        supabase
          .from("story_views")
          .select("post_id, guest_id, viewed_at")
          .in("post_id", ids)
          .order("viewed_at", { ascending: false }),
        supabase
          .from("story_reactions")
          .select("post_id, guest_id, emoji, created_at")
          .in("post_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  // Quem viu e quem reagiu também precisa de nome, e pelo mesmo motivo.
  const maisGente = await carregarAutores(supabase, [
    ...(audiencia ?? []).map((v) => v.guest_id),
    ...(reacoes ?? []).map((r) => r.guest_id),
  ]);
  for (const [id, autor] of maisGente) autores.set(id, autor);

  const vistasPorPost = new Map<string, VisualizacaoStory[]>();
  for (const v of (audiencia ?? []) as unknown as VisualizacaoStory[]) {
    const lista = vistasPorPost.get(v.post_id) ?? [];
    lista.push({ ...v, autor: autores.get(v.guest_id) ?? null });
    vistasPorPost.set(v.post_id, lista);
  }

  const reacoesPorPost = new Map<string, ReacaoStory[]>();
  for (const r of (reacoes ?? []) as unknown as ReacaoStory[]) {
    const lista = reacoesPorPost.get(r.post_id) ?? [];
    lista.push({ ...r, autor: autores.get(r.guest_id) ?? null });
    reacoesPorPost.set(r.post_id, lista);
  }

  const porAutor = new Map<string, GrupoStory>();
  for (const linha of linhas) {
    const publicacao: Publicacao = {
      ...montarPublicacao(linha, urls, meuId, autores),
      visualizacoes: vistasPorPost.get(linha.id) ?? [],
      reacoes: reacoesPorPost.get(linha.id) ?? [],
    };
    const autor = publicacao.autor;
    if (!autor) continue;

    const grupo = porAutor.get(autor.id);
    if (grupo) {
      grupo.stories.push(publicacao);
      grupo.todos_vistos = grupo.todos_vistos && jaVistos.has(publicacao.id);
    } else {
      porAutor.set(autor.id, {
        autor,
        stories: [publicacao],
        todos_vistos: jaVistos.has(publicacao.id),
      });
    }
  }

  // A fila das bolinhas: eu primeiro, depois quem tem story não visto, depois
  // os personagens principais — e só então a ordem alfabética.
  return [...porAutor.values()].sort((a, b) => {
    if (a.autor.id === meuId) return -1;
    if (b.autor.id === meuId) return 1;
    if (a.todos_vistos !== b.todos_vistos) return a.todos_vistos ? 1 : -1;
    if (a.autor.is_featured !== b.autor.is_featured) return a.autor.is_featured ? -1 : 1;
    return a.autor.full_name.localeCompare(b.autor.full_name, "pt-BR");
  });
}
