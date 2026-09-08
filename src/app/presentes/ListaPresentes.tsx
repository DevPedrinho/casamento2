"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Presente } from "@/lib/tipos";
import { formatarPreco, linkSeguro } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
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

  const visiveis =
    categoria === TODAS ? presentes : presentes.filter((p) => p.category === categoria);

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
        <div className="mb-12 flex flex-wrap items-center justify-center gap-2">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(cat)}
              aria-pressed={categoria === cat}
              className={`versalete titulo-serif rounded-sm border px-4 py-2 text-[0.62rem] transition-colors ${
                categoria === cat
                  ? "border-oliva bg-oliva text-creme-claro"
                  : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((presente) => (
          <CartaoPresente key={presente.id} presente={presente} logado={logado} />
        ))}
      </ul>
    </>
  );
}

function CartaoPresente({ presente, logado }: { presente: Presente; logado: boolean }) {
  const [registrado, setRegistrado] = useState(false);
  const preco = formatarPreco(presente.price_cents);
  const destino = linkSeguro(presente.gift_url);
  const imagem = linkSeguro(presente.image_url);

  /**
   * Registra a intenção antes de abrir o link, para os noivos saberem
   * quem presenteou. Nunca bloqueia o clique: se falhar, o link abre igual.
   */
  async function registrar() {
    if (!logado || registrado) return;
    setRegistrado(true);
    try {
      const supabase = criarClienteNavegador();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("gift_claims").insert({
        gift_id: presente.id,
        guest_id: data.user.id,
      });
    } catch {
      // Silencioso de propósito: o presente é mais importante que o registro.
    }
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-sm border border-terra/20 bg-creme transition-shadow duration-300 hover:shadow-md">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-creme-escuro">
        {imagem ? (
          <Image
            src={imagem}
            alt={presente.title}
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image
              src="/img/ramo-floral.png"
              alt=""
              width={490}
              height={786}
              aria-hidden="true"
              className="h-3/4 w-auto opacity-35"
            />
          </div>
        )}
        <span className="versalete absolute left-0 top-3 bg-oliva/90 px-3 py-1.5 text-[0.55rem] text-creme-claro">
          {presente.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="titulo-serif text-xl text-oliva">{presente.title}</h3>
        {presente.description && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-terra">{presente.description}</p>
        )}

        <p className="titulo-serif mt-5 text-2xl text-oliva">
          {preco ?? <span className="text-lg italic text-terra">Valor livre</span>}
        </p>

        <div className="mt-6">
          {destino ? (
            <BotaoExterno
              href={destino}
              variante="lavanda"
              onClick={registrar}
              className="w-full"
            >
              <Coracao className="w-3" />
              Presentear
            </BotaoExterno>
          ) : (
            <p className="rounded-sm border border-terra/25 px-4 py-3 text-center text-xs text-terra">
              Link ainda não cadastrado
            </p>
          )}
        </div>

        {!logado && destino && (
          <p className="mt-3 text-center text-xs text-terra/80">
            <BotaoLink
              href="/cadastrar?proximo=/presentes"
              variante="contorno"
              className="w-full border-none px-0 py-1 text-[0.6rem] hover:bg-transparent hover:text-oliva"
            >
              Cadastre-se para a gente saber quem foi
            </BotaoLink>
          </p>
        )}
      </div>
    </li>
  );
}
