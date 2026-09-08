"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ROTULOS_LOCAL, type LocalEvento } from "@/lib/tipos";
import { linkSeguro } from "@/lib/formato";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Botao } from "@/components/Botao";
import { Aviso, Rotulo } from "@/components/CartaoForm";
import { Bloco } from "@/components/painel";

export function Locais({ locais }: { locais: LocalEvento[] }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="versalete titulo-serif text-xs text-terra">Informações do evento</p>
        <h1 className="titulo-serif mt-2 text-4xl text-oliva">Onde é a festa</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-terra">
          Estes dados aparecem para os convidados na página inicial e na área
          logada. O que estiver em branco simplesmente não é exibido.
        </p>
      </header>

      {locais.map((local) => (
        <FormLocal key={local.id} local={local} />
      ))}
    </div>
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
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function set<K extends keyof typeof form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setOk(false);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOk(false);

    if (!form.name.trim()) {
      setErro("O nome do local é obrigatório.");
      return;
    }
    if (form.maps_url.trim() && !linkSeguro(form.maps_url)) {
      setErro("O link do mapa precisa começar com https://");
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
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <Bloco titulo={ROTULOS_LOCAL[local.kind]} descricao={`Dados do local da ${ROTULOS_LOCAL[local.kind].toLowerCase()}.`}>
      <form onSubmit={salvar} className="space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {ok && <Aviso tipo="ok">Salvo!</Aviso>}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor={`nome-${local.id}`}>Nome do local</Rotulo>
            <input id={`nome-${local.id}`} required className="campo" value={form.name}
              onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor={`hora-${local.id}`}>Horário</Rotulo>
            <input id={`hora-${local.id}`} className="campo" placeholder="16h00"
              value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor={`end-${local.id}`}>Endereço</Rotulo>
            <input id={`end-${local.id}`} className="campo" placeholder="Rua, número, bairro"
              value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor={`cid-${local.id}`}>Cidade</Rotulo>
            <input id={`cid-${local.id}`} className="campo" value={form.city}
              onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>

        <div>
          <Rotulo htmlFor={`maps-${local.id}`}>Link de localização (Google Maps)</Rotulo>
          <input id={`maps-${local.id}`} type="url" className="campo" placeholder="https://maps.app.goo.gl/…"
            value={form.maps_url} onChange={(e) => set("maps_url", e.target.value)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Rotulo htmlFor={`insta-${local.id}`}>Instagram</Rotulo>
            <input id={`insta-${local.id}`} className="campo" placeholder="@perfil"
              value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor={`fone-${local.id}`}>Telefone</Rotulo>
            <input id={`fone-${local.id}`} className="campo" value={form.phone}
              onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Rotulo htmlFor={`resp-${local.id}`}>Contato responsável</Rotulo>
            <input id={`resp-${local.id}`} className="campo" value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)} />
          </div>
        </div>

        <div>
          <Rotulo htmlFor={`info-${local.id}`}>Informação para os convidados</Rotulo>
          <textarea id={`info-${local.id}`} rows={2} className="campo resize-y"
            placeholder="Aparece no site para quem foi convidado"
            value={form.guest_info} onChange={(e) => set("guest_info", e.target.value)} />
        </div>

        <div>
          <Rotulo htmlFor={`obs-${local.id}`}>Observações internas</Rotulo>
          <textarea id={`obs-${local.id}`} rows={2} className="campo resize-y"
            placeholder="Só vocês veem" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
      </form>
    </Bloco>
  );
}
