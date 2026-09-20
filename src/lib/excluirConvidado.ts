import type { ConvidadoCompleto } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Exclusão completa de um convidado, pelo painel.
 *
 * Primeiro somem os arquivos dele no Storage (foto de perfil e fotos do
 * mural — apagar a linha não apaga arquivo), depois a função do banco
 * apaga a linha, tudo o que depende dela e, se a pessoa já tinha entrado
 * no site, o login também.
 */
export async function excluirConvidado(convidado: Pick<ConvidadoCompleto, "id">): Promise<string | null> {
  const supabase = criarClienteNavegador();

  for (const [bucket, pasta] of [["site", `avatares/${convidado.id}`], ["mural", convidado.id]] as const) {
    const { data } = await supabase.storage.from(bucket).list(pasta, { limit: 1000 });
    const caminhos = (data ?? []).filter((a) => a.name).map((a) => `${pasta}/${a.name}`);
    if (caminhos.length > 0) await supabase.storage.from(bucket).remove(caminhos);
  }

  const { error } = await supabase.rpc("admin_excluir_convidado", { p_guest: convidado.id });
  if (!error) return null;
  return error.message.includes("SO_OS_NOIVOS")
    ? "Só os noivos podem excluir convidados."
    : "Não foi possível excluir agora. Tente de novo.";
}

/** A pergunta antes de excluir, com o aviso do que vai junto. */
export function confirmarExclusao(convidado: Pick<ConvidadoCompleto, "full_name" | "user_id">): boolean {
  const linhas = [
    `Excluir ${convidado.full_name}?`,
    "",
    "Sai da lista, da família e da mesa; a resposta, os acompanhantes e o que publicou no mural vão junto.",
  ];
  if (convidado.user_id) {
    linhas.push("", "Esta pessoa já tem cadastro: o login também é apagado. Ela poderá se cadastrar de novo com um código novo.");
  }
  linhas.push("", "Isso não pode ser desfeito.");
  return confirm(linhas.join("\n"));
}
