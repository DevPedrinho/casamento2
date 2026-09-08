"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LinhaConvidado } from "./page";
import type { Presente } from "@/lib/tipos";
import { ROTULOS_RSVP } from "@/lib/tipos";
import { formatarPreco, linkSeguro } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";

type Aba = "presentes" | "convidados";

export function PainelAdmin({
  presentes,
  convidados,
}: {
  presentes: Presente[];
  convidados: LinhaConvidado[];
}) {
  const [aba, setAba] = useState<Aba>("presentes");

  return (
    <div>
      <div className="mb-10 flex justify-center gap-2">
        {(
          [
            ["presentes", `Presentes (${presentes.length})`],
            ["convidados", `Convidados (${convidados.length})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            aria-pressed={aba === valor}
            className={`versalete titulo-serif rounded-sm border px-5 py-2.5 text-[0.62rem] transition-colors ${
              aba === valor
                ? "border-oliva bg-oliva text-creme-claro"
                : "border-terra/30 text-terra hover:border-oliva hover:text-oliva"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "presentes" ? (
        <AbaPresentes presentes={presentes} />
      ) : (
        <AbaConvidados convidados={convidados} />
      )}
    </div>
  );
}

/* ===================== Presentes ===================== */

const VAZIO = {
  title: "",
  description: "",
  preco: "",
  image_url: "",
  gift_url: "",
  category: "Casa",
};

function AbaPresentes({ presentes }: { presentes: Presente[] }) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setForm(VAZIO);
    setEditando(null);
    setErro(null);
  }

  function editar(presente: Presente) {
    setEditando(presente.id);
    setErro(null);
    setOk(null);
    setForm({
      title: presente.title,
      description: presente.description ?? "",
      preco: presente.price_cents === null ? "" : (presente.price_cents / 100).toString(),
      image_url: presente.image_url ?? "",
      gift_url: presente.gift_url,
      category: presente.category,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOk(null);

    if (!form.title.trim()) {
      setErro("Dê um nome ao presente.");
      return;
    }
    if (!linkSeguro(form.gift_url)) {
      setErro("O link do presente precisa ser um endereço válido começando com https://");
      return;
    }
    if (form.image_url.trim() && !linkSeguro(form.image_url)) {
      setErro("O link da imagem precisa começar com https://");
      return;
    }

    const precoNumero = form.preco.trim()
      ? Number(form.preco.replace(",", "."))
      : null;
    if (precoNumero !== null && (Number.isNaN(precoNumero) || precoNumero < 0)) {
      setErro("O preço precisa ser um número (ou deixe em branco para valor livre).");
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const dados = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_cents: precoNumero === null ? null : Math.round(precoNumero * 100),
      image_url: form.image_url.trim() || null,
      gift_url: form.gift_url.trim(),
      category: form.category.trim() || "Casa",
    };

    const { error } = editando
      ? await supabase.from("gifts").update(dados).eq("id", editando)
      : await supabase
          .from("gifts")
          .insert({ ...dados, sort_order: presentes.length + 1 });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }

    setOk(editando ? "Presente atualizado!" : "Presente adicionado à lista!");
    limpar();
    router.refresh();
  }

  async function alternarAtivo(presente: Presente) {
    const supabase = criarClienteNavegador();
    await supabase.from("gifts").update({ is_active: !presente.is_active }).eq("id", presente.id);
    router.refresh();
  }

  async function remover(presente: Presente) {
    if (!confirm(`Remover "${presente.title}" da lista? Isso não pode ser desfeito.`)) return;
    const supabase = criarClienteNavegador();
    await supabase.from("gifts").delete().eq("id", presente.id);
    if (editando === presente.id) limpar();
    router.refresh();
  }

  return (
    <div className="space-y-12">
      <form
        onSubmit={salvar}
        className="rounded-sm border border-terra/20 bg-creme-claro p-7 sm:p-9"
      >
        <h3 className="titulo-serif text-2xl text-oliva">
          {editando ? "Editar presente" : "Adicionar presente"}
        </h3>
        <p className="mt-2 text-sm text-terra">
          O link é para onde o botão <strong>Presentear</strong> leva o convidado —
          cole aqui o link de pagamento, o PIX ou a página da loja.
        </p>

        <div className="mt-7 space-y-5">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {ok && <Aviso tipo="ok">{ok}</Aviso>}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="g-title">Nome do presente</Rotulo>
              <input
                id="g-title"
                required
                className="campo"
                placeholder="Jogo de panelas"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Rotulo htmlFor="g-cat">Categoria</Rotulo>
              <input
                id="g-cat"
                className="campo"
                placeholder="Cozinha"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Rotulo htmlFor="g-desc">Descrição (opcional)</Rotulo>
            <textarea
              id="g-desc"
              rows={2}
              className="campo resize-y"
              placeholder="Uma frase simpática sobre o presente"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="g-preco">Valor em R$ (deixe vazio para valor livre)</Rotulo>
              <input
                id="g-preco"
                inputMode="decimal"
                className="campo"
                placeholder="450,00"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
              />
            </div>
            <div>
              <Rotulo htmlFor="g-img">Link da imagem (opcional)</Rotulo>
              <input
                id="g-img"
                type="url"
                className="campo"
                placeholder="https://…/foto.jpg"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Rotulo htmlFor="g-link">Link do botão Presentear</Rotulo>
            <input
              id="g-link"
              type="url"
              required
              className="campo"
              placeholder="https://link-de-pagamento.com/…"
              value={form.gift_url}
              onChange={(e) => setForm({ ...form, gift_url: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar presente"}
            </Botao>
            {editando && (
              <Botao type="button" variante="contorno" onClick={limpar}>
                Cancelar
              </Botao>
            )}
          </div>
        </div>
      </form>

      <div>
        <h3 className="titulo-serif mb-6 text-2xl text-oliva">Presentes cadastrados</h3>
        {presentes.length === 0 ? (
          <p className="titulo-serif text-terra italic">Nenhum presente cadastrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {presentes.map((presente) => (
              <li
                key={presente.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-sm border border-terra/20 bg-creme-claro px-5 py-4 ${
                  presente.is_active ? "" : "opacity-55"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="titulo-serif text-lg text-oliva">
                    {presente.title}
                    <span className="versalete ml-3 text-[0.55rem] text-terra">
                      {presente.category}
                    </span>
                  </p>
                  <p className="mt-1 truncate text-xs text-terra">
                    {formatarPreco(presente.price_cents) ?? "Valor livre"} ·{" "}
                    <span className="break-all">{presente.gift_url}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-4 text-[0.62rem]">
                  <button
                    type="button"
                    onClick={() => editar(presente)}
                    className="versalete text-oliva underline underline-offset-4"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarAtivo(presente)}
                    className="versalete text-terra underline underline-offset-4"
                  >
                    {presente.is_active ? "Ocultar" : "Mostrar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(presente)}
                    className="versalete text-red-800 underline underline-offset-4"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===================== Convidados ===================== */

function AbaConvidados({ convidados }: { convidados: LinhaConvidado[] }) {
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

  const cartoes = [
    { rotulo: "Confirmados", valor: resumo.confirmados },
    { rotulo: "Total de pessoas", valor: resumo.pessoas },
    { rotulo: "Talvez", valor: resumo.talvez },
    { rotulo: "Não vão", valor: resumo.naoVao },
    { rotulo: "Sem resposta", valor: resumo.semResposta },
  ];

  return (
    <div className="space-y-10">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cartoes.map((cartao) => (
          <li
            key={cartao.rotulo}
            className="rounded-sm border border-terra/20 bg-creme-claro px-4 py-5 text-center"
          >
            <span className="titulo-serif block text-3xl text-oliva tabular-nums">
              {cartao.valor}
            </span>
            <span className="versalete mt-2 block text-[0.55rem] text-terra">
              {cartao.rotulo}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-60 flex-1">
          <Rotulo htmlFor="busca">Buscar convidado</Rotulo>
          <input
            id="busca"
            className="campo"
            placeholder="Digite um nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Botao type="button" variante="contorno" onClick={baixarCsv}>
          Baixar CSV
        </Botao>
      </div>

      {filtrados.length === 0 ? (
        <p className="titulo-serif text-terra italic">Nenhum convidado encontrado.</p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((c) => (
            <li
              key={c.id}
              className="rounded-sm border border-terra/20 bg-creme-claro px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="titulo-serif text-lg text-oliva">{c.full_name}</p>
                <span
                  className={`versalete rounded-sm px-3 py-1 text-[0.55rem] ${
                    !c.rsvps
                      ? "bg-terra/15 text-terra"
                      : c.rsvps.status === "confirmado"
                        ? "bg-oliva text-creme-claro"
                        : c.rsvps.status === "talvez"
                          ? "bg-lavanda text-creme-claro"
                          : "bg-terra/25 text-terra"
                  }`}
                >
                  {c.rsvps ? ROTULOS_RSVP[c.rsvps.status] : "Sem resposta"}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-terra">
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
                  <p className="titulo-serif pt-1 text-sm italic">“{c.rsvps.message}”</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
