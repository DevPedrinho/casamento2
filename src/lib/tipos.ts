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
