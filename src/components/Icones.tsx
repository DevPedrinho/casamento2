/**
 * Ícones de traço fino, no mesmo peso do resto da identidade.
 * Um só componente para não espalhar SVG solto pelas páginas.
 */
export type NomeIcone =
  | "dashboard"
  | "timeline"
  | "convidados"
  | "crm"
  | "tarefas"
  | "kanban"
  | "financeiro"
  | "fornecedores"
  | "presentes"
  | "mural"
  | "local"
  | "config"
  | "sair"
  | "menu"
  | "fechar"
  | "recolher"
  | "busca"
  | "cronograma"
  | "musica"
  | "volume"
  | "mais";

const CAMINHOS: Record<NomeIcone, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  timeline: <><path d="M12 3v18" /><circle cx="12" cy="7" r="2.2" /><circle cx="12" cy="17" r="2.2" /></>,
  convidados: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.4 3.4 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 5.6" /></>,
  crm: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="11" rx="1.5" /><rect x="16" y="4" width="5" height="7" rx="1.5" /></>,
  tarefas: <><path d="M4 6.5l2 2 3.5-3.5" /><path d="M4 13.5l2 2 3.5-3.5" /><path d="M13 7h7M13 14h7M4 20h16" /></>,
  kanban: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /></>,
  financeiro: <><path d="M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M3 7l2.5-3h13L21 7" /><path d="M12 11v6M14.5 12.5h-4a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3h-4" /></>,
  fornecedores: <><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></>,
  presentes: <><rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12" /><path d="M12 9S9.5 4 7 5.5 9 9 12 9zM12 9s2.5-5 5-3.5S15 9 12 9z" /></>,
  mural: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9.5" r="1.8" /><path d="M21 16l-5-5-6 6" /></>,
  local: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" /></>,
  sair: <><path d="M15 17l5-5-5-5" /><path d="M20 12H9" /><path d="M12 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h7" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  recolher: <path d="M14 6l-6 6 6 6" />,
  busca: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></>,
  cronograma: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  musica: <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  volume: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 9.5a4 4 0 0 1 0 5" /><path d="M18.5 7a7 7 0 0 1 0 10" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
};

export function Icone({
  nome,
  className = "h-5 w-5",
}: {
  nome: NomeIcone;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {CAMINHOS[nome]}
    </svg>
  );
}
