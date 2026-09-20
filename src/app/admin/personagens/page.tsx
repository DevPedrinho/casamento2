import { criarClienteServidor } from "@/lib/supabase/servidor";
import {
  TEXTOS_PERSONAGENS_PADRAO,
  type PersonagemCerimonia,
  type TextosPersonagens,
} from "@/lib/tipos";
import { urlDoSite } from "@/lib/storage";
import { EditorPersonagens, type ConvidadoResumo } from "./EditorPersonagens";

export const dynamic = "force-dynamic";

export default async function PersonagensPage() {
  const supabase = await criarClienteServidor();

  const [{ data: pessoas }, { data: pagina }, { data: convidados }] = await Promise.all([
    supabase.from("ceremony_people").select("*").order("section").order("sort_order").order("name"),
    supabase.from("ceremony_page").select("texts").maybeSingle(),
    supabase.from("guests").select("id, full_name, side").order("full_name"),
  ]);

  const textos: TextosPersonagens = {
    ...TEXTOS_PERSONAGENS_PADRAO,
    ...((pagina?.texts as Partial<TextosPersonagens> | null) ?? {}),
  };

  return (
    <EditorPersonagens
      pessoas={((pessoas ?? []) as PersonagemCerimonia[]).map((p) => ({ ...p, url: urlDoSite(p.image_path) }))}
      textos={textos}
      convidados={(convidados ?? []) as ConvidadoResumo[]}
    />
  );
}
