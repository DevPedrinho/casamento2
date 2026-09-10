"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Presente } from "@/lib/tipos";
import { formatarPreco, linkSeguro } from "@/lib/formato";
import { urlDoSite } from "@/lib/storage";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { meuGuestId } from "@/lib/convidadoCliente";
import { BotaoExterno, BotaoLink } from "@/components/Botao";
import { Coracao } from "@/components/Ornamentos";

const TODAS = "Todos";

export function ListaPresentes({
  presentes,
  logado,
}: {
  presentes: Presente[];
  logado: boolean;
}) {
  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(presentes.map((p) => p.category))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    return [TODAS, ...unicas];
  }, [presentes]);

  const [categoria, setCategoria] = useState(TODAS);
  const [detalhe, setDetalhe] = useState<Presente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const visiveis =
    categoria === TODAS ? presentes : presentes.filter((p) => p.category === categoria);

  // O aviso de "obrigado" some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  if (presentes.length === 0) {
    return (
      <p className="titulo-serif py-10 text-center text-xl text-terra italic">
        A lista de presentes está sendo preparada com carinho. Volte em breve!
      </p>
    );
  }

  return (
    <>
      {categorias.length > 2 && (
        <div className="mb-12 flex flex-wrap items-center justify-center gap-2.5">
          {categorias.map((cat) => {
            const ativa = categoria === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                aria-pressed={ativa}
                className={`versalete titulo-serif rounded-full border px-5 py-2.5 text-xs transition-colors ${
                  ativa
                    ? "border-oliva bg-oliva text-creme-claro"
                    : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((presente) => (
          <CartaoPresente
            key={presente.id}
            presente={presente}
            logado={logado}
            aoAbrirDetalhe={() => setDetalhe(presente)}
            aoPresentear={() => setAviso(presente.title)}
          />
        ))}
      </ul>

      {detalhe && (
        <ModalPresente
          presente={detalhe}
          logado={logado}
          aoFechar={() => setDetalhe(null)}
          aoPresentear={() => setAviso(detalhe.title)}
        />
      )}

      {aviso && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-6 z-50 mx-auto mb-[env(safe-area-inset-bottom)] max-w-md rounded-sm border border-oliva/30 bg-creme-claro px-6 py-4 text-center shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
        >
          <p className="titulo-serif text-base text-oliva">
            Obrigado pelo carinho com <strong className="font-medium">{aviso}</strong>! 💜
          </p>
        </div>
      )}
    </>
  );
}

/** Registra a intenção antes de abrir o link, para os noivos agradecerem.
 *  Nunca bloqueia o clique: se falhar, o link abre do mesmo jeito. */
async function registrarPresente(presenteId: string) {
  try {
    const guestId = await meuGuestId();
    if (!guestId) return;
    const supabase = criarClienteNavegador();
    await supabase.from("gift_claims").insert({
      gift_id: presenteId,
      guest_id: guestId,
    });
  } catch {
    // Silencioso de propósito: o presente é mais importante que o registro.
  }
}

function Imagem({ presente, tamanho }: { presente: Presente; tamanho: "card" | "modal" }) {
  // O upload tem prioridade; a URL externa fica como herança do cadastro antigo.
  const imagem = urlDoSite(presente.image_path) ?? linkSeguro(presente.image_url);

  if (imagem) {
    return (
      <Image
        src={imagem}
        alt={presente.title}
        fill
        sizes={tamanho === "card" ? "(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw" : "30rem"}
        className="object-cover"
      />
    );
  }

  // Sem foto, o ramo da IDV preenche o espaço em vez de um vazio cinza.
  // A variação vem do id: sem ela, uma lista inteira sem foto vira papel de
  // parede, com o mesmo ramo repetido em todos os cards.
  const semente = presente.id.charCodeAt(0) + presente.id.charCodeAt(presente.id.length - 1);
  const espelhado = semente % 2 === 1;
  const giro = [-8, -3, 4, 9][semente % 4];
  const escala = [0.68, 0.76, 0.82][semente % 3];

  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-creme-escuro">
      <Image
        src={espelhado ? "/img/ramo-floral-espelhado.png" : "/img/ramo-floral.png"}
        alt=""
        width={490}
        height={786}
        aria-hidden="true"
        className="w-auto opacity-35"
        style={{ height: `${escala * 100}%`, transform: `rotate(${giro}deg)` }}
      />
    </div>
  );
}

function CartaoPresente({
  presente,
  logado,
  aoAbrirDetalhe,
  aoPresentear,
}: {
  presente: Presente;
  logado: boolean;
  aoAbrirDetalhe: () => void;
  aoPresentear: () => void;
}) {
  const preco = formatarPreco(presente.price_cents);
  const destino = linkSeguro(presente.gift_url);

  return (
    <li className="group flex flex-col overflow-hidden rounded-sm border border-terra/20 bg-creme transition-all duration-300 hover:-translate-y-1.5 hover:border-oliva/35 hover:shadow-xl">
      <div className="relative aspect-4/3 w-full overflow-hidden sm:aspect-square">
        <Imagem presente={presente} tamanho="card" />

        <span className="versalete absolute left-0 top-4 bg-oliva/90 px-3.5 py-1.5 text-xs text-creme-claro">
          {presente.category}
        </span>

        {presente.description && (
          <button
            type="button"
            onClick={aoAbrirDetalhe}
            aria-label={`Ver detalhes de ${presente.title}`}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-creme-claro/95 text-oliva shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="titulo-serif text-xl text-oliva">{presente.title}</h3>

        {presente.description && (
          <p className="mt-2 line-clamp-2 text-base leading-relaxed text-terra">
            {presente.description}
          </p>
        )}

        <p className="titulo-serif mt-4 mb-5 text-2xl text-oliva tabular-nums lining-nums sm:mt-5 sm:mb-6 sm:text-3xl">
          {preco ?? <span className="text-xl text-terra italic">Valor livre</span>}
        </p>

        <div className="mt-auto">
          {destino ? (
            <BotaoExterno
              href={destino}
              variante="lavanda"
              onClick={() => {
                if (logado) void registrarPresente(presente.id);
                aoPresentear();
              }}
              className="w-full"
            >
              <Coracao className="w-3.5" />
              Presentear
            </BotaoExterno>
          ) : (
            <p className="rounded-sm border border-terra/25 px-4 py-3.5 text-center text-sm text-terra">
              Link ainda não cadastrado
            </p>
          )}

          {!logado && destino && (
            <BotaoLink
              href="/cadastrar?proximo=/presentes"
              variante="contorno"
              className="mt-2 w-full border-none px-0 py-1 text-xs normal-case tracking-normal hover:bg-transparent hover:text-oliva"
            >
              Cadastre-se para a gente saber quem foi
            </BotaoLink>
          )}
        </div>
      </div>
    </li>
  );
}

function ModalPresente({
  presente,
  logado,
  aoFechar,
  aoPresentear,
}: {
  presente: Presente;
  logado: boolean;
  aoFechar: () => void;
  aoPresentear: () => void;
}) {
  const preco = formatarPreco(presente.price_cents);
  const destino = linkSeguro(presente.gift_url);
  const fecharRef = useRef<HTMLButtonElement>(null);

  // Fecha no Esc, tranca a rolagem do fundo e leva o foco para o botão fechar.
  useEffect(() => {
    fecharRef.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-oliva-escuro/50 sm:items-center sm:p-5"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-presente"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-xl border border-terra/25 bg-creme-claro shadow-2xl sm:max-h-[90vh] sm:grid sm:grid-cols-2 sm:rounded-sm"
      >
        <button
          ref={fecharRef}
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-creme-claro/95 text-oliva shadow-sm transition-colors hover:bg-creme-escuro"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative aspect-16/10 w-full overflow-hidden sm:aspect-square">
          <Imagem presente={presente} tamanho="modal" />
        </div>

        <div className="flex flex-col p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8">
          <span className="versalete text-xs text-terra">{presente.category}</span>
          <h2 id="titulo-presente" className="titulo-serif mt-3 text-3xl text-oliva">
            {presente.title}
          </h2>

          {presente.description && (
            <p className="mt-4 text-base leading-relaxed text-terra">{presente.description}</p>
          )}

          <p className="titulo-serif mt-6 text-4xl text-oliva tabular-nums lining-nums">
            {preco ?? <span className="text-2xl text-terra italic">Valor livre</span>}
          </p>

          {destino && (
            <BotaoExterno
              href={destino}
              variante="lavanda"
              onClick={() => {
                if (logado) void registrarPresente(presente.id);
                aoPresentear();
                aoFechar();
              }}
              className="mt-8 w-full"
            >
              <Coracao className="w-3.5" />
              Presentear
            </BotaoExterno>
          )}
        </div>
      </div>
    </div>
  );
}
