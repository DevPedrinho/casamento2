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
  /** URL externa antiga; mantida para não perder o que já estava cadastrado. */
  image_url: string | null;
  /** Arquivo no bucket "site" — o caminho novo, via upload. */
  image_path: string | null;
  gift_url: string;
  category: string;
  quantity: number;
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
  priority?: "baixa" | "media" | "alta";
  vendor_id?: string | null;
  /** Subtarefas; vem vazio quando a consulta não pede o embed. */
  itens?: { id: string; task_id: string; title: string; done: boolean; sort_order: number }[];
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
  company?: string | null;
  contract_url?: string | null;
  paid_cents?: number | null;
};

/** Categorias usadas no cadastro de fornecedor. */
export const CATEGORIAS_FORNECEDOR = [
  "Buffet", "Decoração", "Fotografia", "Filmagem", "Música", "Cerimonial",
  "Convites", "Doces", "Bolo", "Roupa", "Beleza", "Transporte", "Outros",
];

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
  installment_no: number | null;
  due_date: string | null;
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
  status: StatusDespesa;
  payment_method: string | null;
  installments: number;
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

/* ===================== Mural (rede social) ===================== */

export type TipoPost = "feed" | "story";

export type Autor = {
  id: string;
  full_name: string;
};

export type Comentario = {
  id: string;
  post_id: string;
  guest_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  autor: Autor | null;
};

export const EMOJIS_REACAO = ["❤️", "😍", "🥹", "👏", "🎉", "😂"];

export type ReacaoStory = {
  post_id: string;
  guest_id: string;
  emoji: string;
  created_at: string;
  autor: Autor | null;
};

export type VisualizacaoStory = {
  post_id: string;
  guest_id: string;
  viewed_at: string;
  autor: Autor | null;
};

export type Publicacao = {
  id: string;
  author_id: string;
  kind: TipoPost;
  caption: string | null;
  image_path: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  expires_at: string | null;
  created_at: string;
  autor: Autor | null;
  /** URL assinada gerada no servidor; null quando o post é só texto. */
  imagem_url: string | null;
  curtidas: number;
  eu_curti: boolean;
  /** Nomes de quem curtiu, para a lista "Curtido por". */
  quem_curtiu: Autor[];
  comentarios: Comentario[];
  /** Só preenchidos em stories, e só para quem pode ver (autor e noivos). */
  visualizacoes?: VisualizacaoStory[];
  reacoes?: ReacaoStory[];
};

/** Stories de um mesmo convidado, agrupados como na barra do topo. */
export type GrupoStory = {
  autor: Autor;
  stories: Publicacao[];
  todos_vistos: boolean;
};

export type Denuncia = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string | null;
  reason: string | null;
  created_at: string;
  denunciante: Autor | null;
};

/** Quanto tempo um story fica no ar. */
export const HORAS_DO_STORY = 24;

/* ===================== Convidados (lista completa) ===================== */

/** O funil do convite. É o mesmo dado no gerenciador e no CRM. */
export type StatusConvite =
  | "nao_contatado"
  | "convite_enviado"
  | "visualizou"
  | "aguardando"
  | "confirmado"
  | "nao_vai"
  | "follow_up";

export const ETAPAS_CONVITE: StatusConvite[] = [
  "nao_contatado",
  "convite_enviado",
  "visualizou",
  "aguardando",
  "confirmado",
  "nao_vai",
  "follow_up",
];

export const ROTULOS_CONVITE: Record<StatusConvite, string> = {
  nao_contatado: "Não contatado",
  convite_enviado: "Convite enviado",
  visualizou: "Visualizou",
  aguardando: "Aguardando",
  confirmado: "Confirmado",
  nao_vai: "Não irá",
  follow_up: "Follow-up",
};

export type GrupoConvidados = {
  id: string;
  name: string;
  side: string | null;
  notes: string | null;
};

export type ConvidadoCompleto = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  is_admin: boolean;
  group_id: string | null;
  side: "noivo" | "noiva" | null;
  relationship: string | null;
  ceremony_role: string | null;
  attends: string | null;
  gender: "masculino" | "feminino" | "outro" | null;
  age: number | null;
  age_range: string | null;
  favor_type: string | null;
  invite_status: StatusConvite;
  confirmed_at: string | null;
  companions_planned: number;
  table_number: string | null;
  dietary_notes: string | null;
  notes: string | null;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  /** Código do convite, gerado no painel. */
  access_code: string | null;
  /** Quando os noivos marcaram que entregaram o código. */
  code_sent_at: string | null;
  extra: Record<string, string>;
  created_at: string;
  grupo: GrupoConvidados | null;
};

/* ===================== Locais do evento ===================== */

export type TipoLocal = "cerimonia" | "recepcao";

export type LocalEvento = {
  id: string;
  kind: TipoLocal;
  name: string;
  address: string | null;
  city: string | null;
  maps_url: string | null;
  instagram: string | null;
  phone: string | null;
  contact_name: string | null;
  starts_at: string | null;
  notes: string | null;
  guest_info: string | null;
  sort_order: number;
};

export const ROTULOS_LOCAL: Record<TipoLocal, string> = {
  cerimonia: "Cerimônia",
  recepcao: "Recepção",
};

/* ===================== Kanban e tarefas ===================== */

export type Prioridade = "baixa" | "media" | "alta";

export const ROTULOS_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export type SubTarefa = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
};

export type ColunaKanban = {
  id: string;
  name: string;
  sort_order: number;
  is_done: boolean;
};

export type ItemCard = {
  id: string;
  card_id: string;
  title: string;
  done: boolean;
  sort_order: number;
};

export type CardKanban = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  category: string;
  owner: string | null;
  vendor_id: string | null;
  priority: Prioridade;
  due_date: string | null;
  sort_order: number;
  itens: ItemCard[];
};

export const CATEGORIAS_KANBAN = [
  "Cerimônia", "Buffet", "Decoração", "Fotografia", "Música",
  "Documentação", "Convidados", "Lua de Mel", "Financeiro", "Outros",
];

/* ===================== Financeiro ===================== */

export type StatusDespesa = "previsto" | "a_pagar" | "pago" | "atrasado" | "cancelado";

export const ROTULOS_DESPESA: Record<StatusDespesa, string> = {
  previsto: "Previsto",
  a_pagar: "A pagar",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

/* ===================== Timeline ===================== */

export type FotoTimeline = {
  id: string;
  chapter_id: string;
  image_path: string;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
  /** URL pública montada no servidor. */
  url: string;
};

/** Linha única com a música que toca na página Nossa História. */
export type MusicaDoSite = {
  id: boolean;
  file_path: string | null;
  title: string | null;
  artist: string | null;
};

export type CapituloTimeline = {
  id: string;
  period: string;
  title: string;
  summary: string | null;
  body: string | null;
  sort_order: number;
  fotos: FotoTimeline[];
};

/* ===================== Arquivos ===================== */

export type Arquivo = {
  id: string;
  name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string;
  vendor_id: string | null;
  notes: string | null;
  created_at: string;
};

/* ===================== Reações de story ===================== */

