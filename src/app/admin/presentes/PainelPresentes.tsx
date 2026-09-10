"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Presente } from "@/lib/tipos";
import { formatarPreco, linkSeguro } from "@/lib/formato";
import { UploadImagem } from "@/components/UploadImagem";
import { urlDoSite } from "@/lib/storage";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco, Vazio } from "@/components/painel";

const VAZIO = {
  title: "",
  description: "",
  preco: "",
  image_path: "",
  gift_url: "",
  category: "Casa",
  quantity: "1",
};

export function PainelPresentes({ presentes }: { presentes: Presente[] }) {
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
      image_path: presente.image_path ?? "",
      gift_url: presente.gift_url,
      category: presente.category,
      quantity: String(presente.quantity ?? 1),
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
      image_path: form.image_path || null,
      gift_url: form.gift_url.trim(),
      category: form.category.trim() || "Casa",
      quantity: Math.max(1, Number(form.quantity) || 1),
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
              <Rotulo htmlFor="g-qtd">Quantidade</Rotulo>
              <input
                id="g-qtd"
                inputMode="numeric"
                className="campo"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>

          <UploadImagem
            pasta="presentes"
            caminhoAtual={form.image_path || null}
            urlAtual={urlDoSite(form.image_path || null)}
            aoEnviar={(caminho) => setForm((f) => ({ ...f, image_path: caminho }))}
            aoRemover={() => setForm((f) => ({ ...f, image_path: "" }))}
            rotulo="Foto do presente"
          />

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

      <Bloco
        titulo="Presentes cadastrados"
        descricao="O botão Presentear leva o convidado direto para o link de cada item."
      >
        {presentes.length === 0 ? (
          <Vazio>Nenhum presente cadastrado ainda.</Vazio>
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
                    <span className="versalete ml-3 text-xs text-terra">
                      {presente.category}
                    </span>
                  </p>
                  <p className="mt-1.5 truncate text-sm text-terra">
                    {formatarPreco(presente.price_cents) ?? "Valor livre"} ·{" "}
                    <span className="break-all">{presente.gift_url}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-4">
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
      </Bloco>
    </div>
  );
}

