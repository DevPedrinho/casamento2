"use client";

import { useMemo, useState } from "react";
import type { LinhaConvidado } from "@/lib/tipos";
import { ROTULOS_RSVP } from "@/lib/tipos";
import { Botao } from "@/components/Botao";
import { Rotulo } from "@/components/CartaoForm";
import { Bloco, Indicador, Selo, Vazio } from "@/components/painel";

export function PainelConvidados({ convidados }: { convidados: LinhaConvidado[] }) {
  const [busca, setBusca] = useState("");

  const resumo = useMemo(() => {
    let confirmados = 0;
    let talvez = 0;
    let naoVao = 0;
    let pessoas = 0;

    for (const c of convidados) {
      const r = c.rsvps;
      if (!r) continue;
      if (r.status === "confirmado") {
        confirmados += 1;
        pessoas += 1 + r.companions;
      } else if (r.status === "talvez") {
        talvez += 1;
      } else {
        naoVao += 1;
      }
    }
    return { confirmados, talvez, naoVao, pessoas, semResposta: convidados.length - confirmados - talvez - naoVao };
  }, [convidados]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return convidados;
    return convidados.filter((c) => c.full_name.toLowerCase().includes(termo));
  }, [busca, convidados]);

  function baixarCsv() {
    const cabecalho = [
      "Nome",
      "WhatsApp",
      "Resposta",
      "Acompanhantes",
      "Nomes dos acompanhantes",
      "Restrições",
      "Recado",
      "Cadastro",
    ];
    const linhas = convidados.map((c) => [
      c.full_name,
      c.phone ?? "",
      c.rsvps ? ROTULOS_RSVP[c.rsvps.status] : "Sem resposta",
      c.rsvps ? String(c.rsvps.companions) : "",
      c.rsvps?.companion_names ?? "",
      c.rsvps?.dietary_notes ?? "",
      c.rsvps?.message ?? "",
      new Date(c.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((campo) => `"${campo.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // BOM para o Excel abrir os acentos corretamente.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Indicador rotulo="Confirmados" valor={resumo.confirmados} tom="oliva" />
        <Indicador rotulo="Total de pessoas" valor={resumo.pessoas} tom="oliva" />
        <Indicador rotulo="Talvez" valor={resumo.talvez} tom="lavanda" />
        <Indicador rotulo="Não vão" valor={resumo.naoVao} />
        <Indicador rotulo="Sem resposta" valor={resumo.semResposta} />
      </div>

      <Bloco
        titulo="Lista de convidados"
        descricao="Quem se cadastrou no site e o que cada um respondeu."
        acao={
          <Botao type="button" variante="contorno" onClick={baixarCsv}>
            Baixar CSV
          </Botao>
        }
      >
        <div className="mb-7">
          <Rotulo htmlFor="busca">Buscar convidado</Rotulo>
          <input
            id="busca"
            className="campo"
            placeholder="Digite um nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {filtrados.length === 0 ? (
          <Vazio>Nenhum convidado encontrado.</Vazio>
        ) : (
          <ul className="space-y-3">
            {filtrados.map((c) => (
              <li key={c.id} className="rounded-sm border border-terra/20 bg-creme px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="titulo-serif text-lg text-oliva">{c.full_name}</p>
                  <Selo
                    tom={
                      !c.rsvps
                        ? "neutro"
                        : c.rsvps.status === "confirmado"
                          ? "oliva"
                          : c.rsvps.status === "talvez"
                            ? "lavanda"
                            : "apagado"
                    }
                  >
                    {c.rsvps ? ROTULOS_RSVP[c.rsvps.status] : "Sem resposta"}
                  </Selo>
                </div>

                <div className="mt-2.5 space-y-1 text-sm text-terra">
                  {c.phone && <p>WhatsApp: {c.phone}</p>}
                  {c.rsvps && c.rsvps.companions > 0 && (
                    <p>
                      {c.rsvps.companions} acompanhante
                      {c.rsvps.companions > 1 ? "s" : ""}
                      {c.rsvps.companion_names ? `: ${c.rsvps.companion_names}` : ""}
                    </p>
                  )}
                  {c.rsvps?.dietary_notes && <p>Restrições: {c.rsvps.dietary_notes}</p>}
                  {c.rsvps?.message && (
                    <p className="titulo-serif pt-1.5 text-base italic">“{c.rsvps.message}”</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  );
}
