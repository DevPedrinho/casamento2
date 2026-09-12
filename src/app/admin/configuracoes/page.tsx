import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ConfiguracoesSite } from "@/lib/tipos";
import { Configuracoes } from "./Configuracoes";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("site_settings").select("*").maybeSingle();

  if (!data) {
    return (
      <p className="titulo-serif py-10 text-center text-xl text-terra italic">
        As configurações ainda não foram criadas no banco.
      </p>
    );
  }

  return <Configuracoes config={data as ConfiguracoesSite} />;
}
