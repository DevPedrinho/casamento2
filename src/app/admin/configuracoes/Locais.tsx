"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ROTULOS_LOCAL, type LocalEvento } from "@/lib/tipos";
import { linkSeguro } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Ajuda, RodapeSalvar, RotuloConfig, SecaoConfig, type EstadoSalvar } from "./ui";

/**
 * Local do evento, dentro de Configurações. Fica fora do formulário geral
 * da página porque cada local tem o próprio formulário e botão de salvar
 * — e um formulário não pode morar dentro de outro.
 */
export function Locais({ locais }: { locais: LocalEvento[] }) {
  return (
    <section id="local-do-evento" aria-labelledby="titulo-local-do-evento" className="scroll-mt-40 space-y-5">
      <header className="px-1">
        <p className="versalete titulo-serif text-sm text-lavanda">Informações do evento</p>
        <h2 id="titulo-local-do-evento" className="titulo-serif mt-1 text-3xl text-oliva sm:text-4xl">
          Local do evento
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-terra">
          Cerimônia e recepção são locais e horários diferentes: cada um tem o seu
          horário, endereço e link do mapa. Aparece para os convidados na página
          inicial e na área logada; o que estiver em branco não é exibido.
        </p>
      </header>

      {locais.map((local) => (
        <FormLocal key={local.id} local={local} />
      ))}
    </section>
  );
}

function FormLocal({ local }: { local: LocalEvento }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: local.name,
    address: local.address ?? "",
    city: local.city ?? "",
    maps_url: local.maps_url ?? "",
    instagram: local.instagram ?? "",
    phone: local.phone ?? "",
    contact_name: local.contact_name ?? "",
    starts_at: local.starts_at ?? "",
    guest_info: local.guest_info ?? "",
    notes: local.notes ?? "",
  });
  /** O que está gravado: contra ele o rodapé sabe se há o que salvar. */
  const [salvo, setSalvo] = useState(form);
  const [estado, setEstado] = useState<EstadoSalvar>(null);
  const [salvando, setSalvando] = useState(false);
  const sujo = JSON.stringify(form) !== JSON.stringify(salvo);

  function set<K extends keyof typeof form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEstado(null);

    if (!form.name.trim()) {
      setEstado({ tipo: "erro", mensagem: "O nome do local é obrigatório." });
      return;
    }
    if (form.maps_url.trim() && !linkSeguro(form.maps_url)) {
      setEstado({ tipo: "erro", mensagem: "O link do mapa precisa começar com https://" });
      return;
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase
      .from("event_venues")
      .update({
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        maps_url: form.maps_url.trim() || null,
        // Guardamos só o @, não a URL inteira.
        instagram: form.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") || null,
        phone: form.phone.trim() || null,
        contact_name: form.contact_name.trim() || null,
        starts_at: form.starts_at.trim() || null,
        guest_info: form.guest_info.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", local.id);

    setSalvando(false);
    if (error) {
      setEstado({ tipo: "erro", mensagem: "Não foi possível salvar. Tente de novo." });
      return;
    }
    setSalvo(form);
    setEstado({ tipo: "ok" });
    router.refresh();
  }

  const id = local.id;
  return (
    <SecaoConfig
      id={`local-${local.kind}`}
      titulo={ROTULOS_LOCAL[local.kind]}
      descricao={`Onde e quando é a ${ROTULOS_LOCAL[local.kind].toLowerCase()}.`}
      onSubmit={salvar}
      rodape={<RodapeSalvar sujo={sujo} salvando={salvando} estado={estado} />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[2fr_1fr]">
          <div>
            <RotuloConfig htmlFor={`nome-${id}`}>Nome do local</RotuloConfig>
            <input id={`nome-${id}`} required className="campo" value={form.name}
              onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor={`hora-${id}`}>Horário</RotuloConfig>
            <input id={`hora-${id}`} className="campo" placeholder="16h00"
              value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[2fr_1fr]">
          <div>
            <RotuloConfig htmlFor={`end-${id}`}>Endereço</RotuloConfig>
            <input id={`end-${id}`} className="campo" placeholder="Rua, número, bairro"
              value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor={`cid-${id}`}>Cidade</RotuloConfig>
            <input id={`cid-${id}`} className="campo" value={form.city}
              onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>

        <div>
          <RotuloConfig htmlFor={`maps-${id}`}>Link de localização (Google Maps)</RotuloConfig>
          <input id={`maps-${id}`} type="url" className="campo" placeholder="https://maps.app.goo.gl/…"
            value={form.maps_url} onChange={(e) => set("maps_url", e.target.value)} />
          <Ajuda>Vira o botão &ldquo;Ver no mapa&rdquo; no cartão da página inicial.</Ajuda>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <RotuloConfig htmlFor={`insta-${id}`}>Instagram</RotuloConfig>
            <input id={`insta-${id}`} className="campo" placeholder="@perfil"
              value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor={`fone-${id}`}>Telefone</RotuloConfig>
            <input id={`fone-${id}`} className="campo" value={form.phone}
              onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <RotuloConfig htmlFor={`resp-${id}`}>Contato responsável</RotuloConfig>
            <input id={`resp-${id}`} className="campo" value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)} />
          </div>
        </div>

        <div>
          <RotuloConfig htmlFor={`info-${id}`}>Informação para os convidados</RotuloConfig>
          <textarea id={`info-${id}`} rows={3} className="campo resize-y"
            placeholder="Aparece no site para quem foi convidado"
            value={form.guest_info} onChange={(e) => set("guest_info", e.target.value)} />
        </div>

        <div>
          <RotuloConfig htmlFor={`obs-${id}`}>Observações internas</RotuloConfig>
          <textarea id={`obs-${id}`} rows={3} className="campo resize-y"
            placeholder="Só vocês veem" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
    </SecaoConfig>
  );
}
