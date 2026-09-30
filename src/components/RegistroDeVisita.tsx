"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

/** De quanto em quanto tempo o site avisa que a pessoa continua aqui. */
const PULSO_MS = 60_000;

/**
 * Avisa ao banco que o convidado está com o site aberto (e em que página),
 * para o painel dos noivos saber quem está online e quando cada um entrou.
 *
 * Só para quem está logado; os noivos são ignorados lá no banco
 * (public.registrar_visita). Não desenha nada.
 */
export function RegistroDeVisita() {
  const caminho = usePathname();
  const logado = useRef<boolean | null>(null);

  useEffect(() => {
    const supabase = criarClienteNavegador();
    let ativo = true;

    async function avisar() {
      if (!ativo || document.visibilityState !== "visible") return;
      if (logado.current === null) {
        const { data } = await supabase.auth.getSession();
        logado.current = Boolean(data.session);
      }
      if (!logado.current) return;
      await supabase.rpc("registrar_visita", { p_pagina: caminho });
    }

    void avisar();
    const pulso = window.setInterval(avisar, PULSO_MS);
    // Voltou para a aba: conta na hora, sem esperar o próximo pulso.
    const aoVoltar = () => void avisar();
    document.addEventListener("visibilitychange", aoVoltar);

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      logado.current = Boolean(sessao);
    });

    return () => {
      ativo = false;
      window.clearInterval(pulso);
      document.removeEventListener("visibilitychange", aoVoltar);
      sub.subscription.unsubscribe();
    };
  }, [caminho]);

  return null;
}
