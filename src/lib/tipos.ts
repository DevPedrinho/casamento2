export type StatusRsvp = "confirmado" | "nao_vou" | "talvez";

export type Convidado = {
  id: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Rsvp = {
  guest_id: string;
  status: StatusRsvp;
  companions: number;
  companion_names: string | null;
  dietary_notes: string | null;
  message: string | null;
  updated_at: string;
};

export type Presente = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  image_url: string | null;
  gift_url: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export const ROTULOS_RSVP: Record<StatusRsvp, string> = {
  confirmado: "Vou sim!",
  talvez: "Ainda não sei",
  nao_vou: "Não vou conseguir",
};

/* ===================== Planejamento (só noivos) ===================== */

export type StatusTarefa = "pendente" | "fazendo" | "feito";

export type Tarefa = {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  phase: string;
  phase_order: number;
  status: StatusTarefa;
  owner: string | null;
  due_date: string | null;
  sort_order: number;
};

export const ROTULOS_TAREFA: Record<StatusTarefa, string> = {
  pendente: "A fazer",
  fazendo: "Em andamento",
  feito: "Concluído",
};

export type StatusFornecedor =
  | "prospecto"
  | "contatado"
  | "proposta"
  | "negociando"
  | "contratado"
  | "descartado";

export type Fornecedor = {
  id: string;
  name: string;
  category: string;
  status: StatusFornecedor;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  quoted_cents: number | null;
  agreed_cents: number | null;
  rating: number | null;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
};

/** As etapas do funil, na ordem em que acontecem. */
export const ETAPAS_FUNIL: StatusFornecedor[] = [
  "prospecto",
  "contatado",
  "proposta",
  "negociando",
  "contratado",
  "descartado",
];

export const ROTULOS_FORNECEDOR: Record<StatusFornecedor, string> = {
  prospecto: "A pesquisar",
  contatado: "Contatado",
  proposta: "Orçamento recebido",
  negociando: "Negociando",
  contratado: "Contratado",
  descartado: "Descartado",
};

export type Pagamento = {
  id: string;
  expense_id: string;
  amount_cents: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

export type Despesa = {
  id: string;
  description: string;
  category: string;
  vendor_id: string | null;
  estimated_cents: number;
  contracted_cents: number | null;
  due_date: string | null;
  notes: string | null;
  payments: Pagamento[];
};

/** Convidado com o RSVP já achatado, como o painel consome. */
export type LinhaConvidado = {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  rsvps: {
    status: StatusRsvp;
    companions: number;
    companion_names: string | null;
    dietary_notes: string | null;
    message: string | null;
  } | null;
};
