"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConvidadoCompleto, GrupoConvidados } from "@/lib/tipos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Bloco, Selo, Vazio } from "@/components/painel";
import { Icone } from "@/components/Icones";

/**
 * O tamanho de cada convite.
 *
 * É aqui que "Família Geórgia — 2 pessoas" vira regra: o convidado que
 * entrar por esse convite só consegue confirmar duas pessoas no total,
 * ele incluído. A conta vale para a família inteira, mesmo que mais de
 * uma pessoa da casa tenha login.
 */
export function FamiliasConvite({
  grupos,
  convidados,
  limitePadrao,
}: {
  grupos: GrupoConvidados[];
  convidados: ConvidadoCompleto[];
  limitePadrao: number;
}) {
  const router = useRouter();
  const [nova, setNova] = useState("");
  const [limiteNovo, setLimiteNovo] = useState(String(limitePadrao));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const semLimite = grupos.filter((g) => g.invite_limit === null).length;

  async function criarFamilia() {
    const nome = nova.trim();
    if (!nome) return;

    setSalvando(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("guest_groups").insert({
      name: nome,
      invite_limit: Number(limiteNovo) || limitePadrao,
    });
    setSalvando(false);

    if (error) {
      setErro(
        error.message.includes("duplicate")
          ? "Já existe uma família com esse nome."
          : `Não deu para criar: ${error.message}`,
      );
      return;
    }

    setNova("");
    router.refresh();
  }

  async function mudarLimite(id: string, valor: string) {
    const supabase = criarClienteNavegador();
    await supabase
      .from("guest_groups")
      .update({ invite_limit: valor.trim() === "" ? null : Number(valor) })
      .eq("id", id);
    router.refresh();
  }

  async function aplicarPadraoNasVazias() {
    setSalvando(true);
    const supabase = criarClienteNavegador();
    await supabase
      .from("guest_groups")
      .update({ invite_limit: limitePadrao })
      .is("invite_limit", null);
    setSalvando(false);
    router.refresh();
  }

  return (
    <Bloco
      titulo="Famílias e tamanho do convite"
      descricao="Cada família tem um número de lugares. O convidado confirma até esse número — e nem um a mais."
      acao={
        semLimite > 0 ? (
          <Botao type="button" variante="contorno" onClick={aplicarPadraoNasVazias} disabled={salvando}>
            {`Usar ${limitePadrao} nas ${semLimite} sem limite`}
          </Botao>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {erro && (
          <p className="rounded-sm border border-red-800/30 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </p>
        )}

        {/* ---------- Nova família ---------- */}
        <div className="grid gap-3 rounded-sm border border-terra/20 bg-creme p-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <div>
            <Rotulo htmlFor="nova-familia">Nova família</Rotulo>
            <input
              id="nova-familia"
              className="campo"
              placeholder="Família Geórgia"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
            />
          </div>
          <div>
            <Rotulo htmlFor="novo-limite">Lugares</Rotulo>
            <input
              id="novo-limite"
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              className="campo"
              value={limiteNovo}
              onChange={(e) => setLimiteNovo(e.target.value)}
            />
          </div>
          <Botao type="button" onClick={criarFamilia} disabled={salvando || !nova.trim()}>
            <Icone nome="mais" className="h-4 w-4" />
            Criar
          </Botao>
        </div>

        {/* ---------- Lista ---------- */}
        {grupos.length === 0 ? (
          <Vazio>Nenhuma família cadastrada ainda.</Vazio>
        ) : (
          <ul className="space-y-2.5">
            {grupos.map((grupo) => {
              const membros = convidados.filter((c) => c.group_id === grupo.id);
              const limite = grupo.invite_limit;
              const apertado = limite !== null && membros.length > limite;

              return (
                <li
                  key={grupo.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-sm border border-terra/20 bg-creme px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="titulo-serif block text-lg text-oliva">{grupo.name}</span>
                    <span className="block text-sm text-terra">
                      {membros.length}{" "}
                      {membros.length === 1 ? "pessoa na lista" : "pessoas na lista"}
                      {limite !== null && ` · convite para ${limite}`}
                    </span>
                  </span>

                  {apertado && (
                    <Selo tom="alerta">
                      {membros.length} na lista para {limite} lugares
                    </Selo>
                  )}

                  <label className="flex items-center gap-2">
                    <span className="versalete text-xs text-terra">Lugares</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      inputMode="numeric"
                      aria-label={`Lugares no convite da ${grupo.name}`}
                      className="campo w-20 text-center"
                      defaultValue={limite ?? ""}
                      onBlur={(e) => mudarLimite(grupo.id, e.target.value)}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Bloco>
  );
}
