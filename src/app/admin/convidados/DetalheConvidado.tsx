"use client";

import {
  ROTULOS_CONVITE,
  ROTULOS_PRESENCA,
  ROTULOS_PRESENCA_CURTO,
  ROTULOS_VINCULO,
  type Acompanhante,
  type ConvidadoCompleto,
} from "@/lib/tipos";
import { diasAte, formatarData } from "@/lib/formato";
import { formatarCodigo } from "@/lib/codigo";
import { urlDoSite } from "@/lib/storage";
import { linkWhatsApp, mensagemDoConvite } from "@/lib/convite";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Selo } from "@/components/painel";
import { ACAO_FICHA, CartaoFicha, Ficha, LinhaFicha } from "@/components/Ficha";
import { TOM_STATUS } from "./tons";
import type { AbaDaFicha } from "./FichaConvidado";

const LADO: Record<string, string> = { noivo: "do noivo", noiva: "da noiva", ambos: "dos dois" };

/**
 * A ficha de leitura do convidado: tudo o que se sabe da pessoa, em blocos,
 * sem campo de formulário. Editar abre o formulário completo por cima.
 *
 * O bloco "Família" é a correlação que os noivos pediram: quem mais está no
 * mesmo grupo, para pensar mesa e convite olhando o conjunto.
 */
export function DetalheConvidado({
  convidado,
  acompanhantes,
  familia,
  copiado,
  gerando,
  aoFechar,
  aoEditar,
  aoRemover,
  aoAbrirOutro,
  aoGerar,
  aoCopiar,
  aoMarcar,
}: {
  convidado: ConvidadoCompleto;
  acompanhantes: Acompanhante[];
  /** Os outros convidados da mesma família. */
  familia: ConvidadoCompleto[];
  copiado: boolean;
  gerando: boolean;
  aoFechar: () => void;
  aoEditar: (aba?: AbaDaFicha) => void;
  aoRemover: () => void;
  aoAbrirOutro: (outro: ConvidadoCompleto) => void;
  aoGerar: () => void;
  aoCopiar: () => void;
  aoMarcar: (enviado: boolean) => void;
}) {
  const c = convidado;
  const telefone = c.whatsapp ?? c.phone;
  const zap = c.access_code ? linkWhatsApp(telefone, mensagemDoConvite(c.full_name, c.access_code)) : null;
  const passou = acompanhantes.length > c.companions_planned;
  const diasRetorno = diasAte(c.next_action_at);
  const extra = Object.entries(c.extra ?? {});

  return (
    <Ficha
      rotuloAria={`Convidado: ${c.full_name}`}
      aoFechar={aoFechar}
      cabecalho={
        <div className="flex items-center gap-3">
          <Avatar nome={c.full_name} url={urlDoSite(c.avatar_path)} />
          <div className="min-w-0">
            {c.grupo && <p className="versalete text-xs text-terra">{c.grupo.name}</p>}
            <h2 className="titulo-serif text-2xl leading-tight text-oliva">{c.full_name}</h2>
            {c.ceremony_role && <p className="versalete mt-0.5 text-xs text-lavanda">{c.ceremony_role}</p>}
          </div>
        </div>
      }
      abaixoDoCabecalho={
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Selo tom={TOM_STATUS[c.invite_status]}>{ROTULOS_CONVITE[c.invite_status]}</Selo>
          {c.attends && <Selo tom="lavanda">{ROTULOS_PRESENCA_CURTO[c.attends]}</Selo>}
          {c.is_featured && <Selo tom="oliva">personagem principal</Selo>}
          {c.user_id && <Selo>cadastro ativo</Selo>}
        </div>
      }
      rodape={
        <>
          <Botao type="button" variante="contorno" onClick={() => aoEditar()} className="flex-1 sm:flex-none">
            Editar
          </Botao>
          <button type="button" onClick={aoRemover} className={`${ACAO_FICHA} ml-auto px-3 text-red-800`}>
            Excluir
          </button>
        </>
      }
    >
      {/* ---------- Código do convite ---------- */}
      <CartaoFicha
        titulo="Convite"
        acao={
          c.access_code ? (
            <button type="button" onClick={aoGerar} disabled={gerando} className={`${ACAO_FICHA} text-terra/85 hover:text-red-800`} title="Sorteia outro código; o anterior deixa de valer">
              trocar código
            </button>
          ) : null
        }
      >
        {c.access_code ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-sm bg-creme-escuro/60 px-3 py-2 font-mono text-lg tracking-widest text-oliva">
                {formatarCodigo(c.access_code)}
              </code>
              <button type="button" onClick={aoCopiar} className={`${ACAO_FICHA} text-oliva`}>
                {copiado ? "copiado!" : "copiar"}
              </button>
              {zap && (
                <a href={zap} target="_blank" rel="noopener noreferrer" onClick={() => aoMarcar(true)} className={`${ACAO_FICHA} text-oliva`}>
                  mandar no WhatsApp
                </a>
              )}
            </div>
            <div className="mt-2">
              <LinhaFicha
                rotulo="Entregue"
                valor={c.code_sent_at ? `sim, em ${formatarData(c.code_sent_at.slice(0, 10))}` : "ainda não"}
              />
              <LinhaFicha rotulo="Cadastro no site" valor={c.user_id ? "ativo" : "ainda não entrou"} />
            </div>
            <button type="button" onClick={() => aoMarcar(!c.code_sent_at)} className={`${ACAO_FICHA} mt-1 text-oliva`}>
              {c.code_sent_at ? "desmarcar entrega" : "marcar como entregue"}
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-terra">Esta pessoa ainda não tem código.</p>
            <Botao type="button" variante="contorno" onClick={aoGerar} disabled={gerando}>
              {gerando ? "Gerando…" : "Gerar código"}
            </Botao>
          </div>
        )}
      </CartaoFicha>

      {/* ---------- Família ---------- */}
      <CartaoFicha titulo="Família">
        <LinhaFicha rotulo="Família" valor={c.grupo?.name ?? "sem família"} detalhe={c.grupo?.side ? `lado ${LADO[c.grupo.side] ?? c.grupo.side}` : null} />
        <LinhaFicha rotulo="Lado" valor={c.side ? `Convidado ${LADO[c.side]}` : "—"} />
        {c.grupo?.notes && <p className="mt-1 text-sm text-terra">{c.grupo.notes}</p>}

        {c.grupo && (
          familia.length === 0 ? (
            <p className="mt-2 text-sm text-terra">Ninguém mais desta família na lista.</p>
          ) : (
            <ul className="mt-3 divide-y divide-terra/15 border-t border-terra/15">
              {familia.map((outro) => (
                <li key={outro.id}>
                  <button
                    type="button"
                    onClick={() => aoAbrirOutro(outro)}
                    className="flex min-h-11 w-full items-center gap-3 py-2 text-left"
                  >
                    <Avatar nome={outro.full_name} url={urlDoSite(outro.avatar_path)} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-oliva">{outro.full_name}</span>
                      {outro.relationship && <span className="block truncate text-xs text-terra">{outro.relationship}</span>}
                    </span>
                    <Selo tom={TOM_STATUS[outro.invite_status]}>{ROTULOS_CONVITE[outro.invite_status]}</Selo>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </CartaoFicha>

      {/* ---------- Resposta ---------- */}
      <CartaoFicha
        titulo="Resposta"
        acao={
          <button type="button" onClick={() => aoEditar("resposta")} className={`${ACAO_FICHA} text-oliva`}>
            acompanhantes e mesa
          </button>
        }
      >
        <LinhaFicha rotulo="Status do convite" valor={ROTULOS_CONVITE[c.invite_status]} />
        <LinhaFicha rotulo="Onde participa" valor={c.attends ? ROTULOS_PRESENCA[c.attends] : "ainda não respondeu"} />
        <LinhaFicha
          rotulo="Acompanhantes"
          valor={`${acompanhantes.length} confirmado${acompanhantes.length === 1 ? "" : "s"}`}
          detalhe={`${c.companions_planned} previsto${c.companions_planned === 1 ? "" : "s"}`}
          alerta={passou}
        />
        <LinhaFicha rotulo="Mesa" valor={c.mesa?.name ?? "sem mesa"} />
        {c.confirmed_at && <LinhaFicha rotulo="Respondeu em" valor={formatarData(c.confirmed_at.slice(0, 10)) ?? "—"} />}

        {acompanhantes.length > 0 && (
          <ul className="mt-2 divide-y divide-terra/15 border-t border-terra/15">
            {acompanhantes.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="text-oliva">{a.full_name}</span>
                <span className="text-terra">
                  {a.age !== null && ` · ${a.age} anos`}
                  {a.relationship && ` · ${a.relationship}`}
                  {a.relationship_kind && ` · ${ROTULOS_VINCULO[a.relationship_kind]}`}
                  {a.attends && ` · ${ROTULOS_PRESENCA_CURTO[a.attends]}`}
                </span>
                {a.notes && <span className="block text-xs text-terra/90">{a.notes}</span>}
              </li>
            ))}
          </ul>
        )}

        {passou && (
          <p className="mt-2 text-sm text-red-800">
            Trouxe {acompanhantes.length} {acompanhantes.length > 1 ? "acompanhantes" : "acompanhante"};
            o planejado era {c.companions_planned}. Vale uma conversa.
          </p>
        )}
      </CartaoFicha>

      {/* ---------- Contato ---------- */}
      <CartaoFicha
        titulo="Contato"
        acao={
          <button type="button" onClick={() => aoEditar("perfil")} className={`${ACAO_FICHA} text-oliva`}>
            editar
          </button>
        }
      >
        <LinhaFicha
          rotulo="Telefone"
          valor={
            telefone ? (
              <a href={`https://wa.me/55${telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {telefone}
              </a>
            ) : "—"
          }
        />
        <LinhaFicha rotulo="E-mail" valor={c.email ?? "—"} />
      </CartaoFicha>

      {/* ---------- Perfil ---------- */}
      <CartaoFicha titulo="Perfil">
        <LinhaFicha rotulo="Vínculo" valor={c.relationship_kind ? ROTULOS_VINCULO[c.relationship_kind] : "—"} detalhe={c.relationship} />
        <LinhaFicha rotulo="Sexo" valor={c.gender ?? "—"} />
        <LinhaFicha rotulo="Idade" valor={c.age !== null ? `${c.age} anos` : "—"} detalhe={c.age_range} />
        <LinhaFicha rotulo="Lembrancinha" valor={c.favor_type ?? "—"} />
        <LinhaFicha rotulo="Restrições alimentares" valor={c.dietary_notes ?? "nenhuma"} />
      </CartaoFicha>

      {/* ---------- Acompanhamento ---------- */}
      {(c.last_contact_at || c.next_action || c.next_action_at) && (
        <CartaoFicha titulo="Acompanhamento">
          <LinhaFicha rotulo="Último contato" valor={c.last_contact_at ? formatarData(c.last_contact_at) ?? "—" : "—"} />
          <LinhaFicha rotulo="Próxima ação" valor={c.next_action ?? "—"} />
          <LinhaFicha
            rotulo="Retornar em"
            valor={c.next_action_at ? formatarData(c.next_action_at) ?? "—" : "—"}
            detalhe={diasRetorno !== null && diasRetorno < 0 ? `passou há ${-diasRetorno} dia${-diasRetorno === 1 ? "" : "s"}` : null}
            alerta={diasRetorno !== null && diasRetorno < 0}
          />
        </CartaoFicha>
      )}

      {c.notes && (
        <CartaoFicha titulo="Observações">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-terra">{c.notes}</p>
        </CartaoFicha>
      )}

      {/* Colunas da planilha sem campo próprio — preservadas, não descartadas. */}
      {extra.length > 0 && (
        <CartaoFicha titulo="Da planilha">
          {extra.map(([k, v]) => (
            <LinhaFicha key={k} rotulo={k.replace(/_/g, " ")} valor={v} />
          ))}
        </CartaoFicha>
      )}
    </Ficha>
  );
}
