import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ConfiguracoesSite, LocalEvento } from "@/lib/tipos";
import { Configuracoes } from "./Configuracoes";
import { Locais } from "./Locais";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await criarClienteServidor();
  const [{ data }, { data: locais }] = await Promise.all([
    supabase.from("site_settings").select("*").maybeSingle(),
    supabase.from("event_venues").select("*").order("sort_order"),
  ]);

  return (
    <div className="space-y-14">
      {data ? (
        <Configuracoes config={data as ConfiguracoesSite} />
      ) : (
        <p className="titulo-serif py-10 text-center text-xl text-terra italic">
          As configurações ainda não foram criadas no banco.
        </p>
      )}
      <Locais locais={(locais ?? []) as LocalEvento[]} />
    </div>
  );
}
