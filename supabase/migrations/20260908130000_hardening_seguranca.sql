-- Correções apontadas pelo linter de segurança do Supabase:
-- search_path fixo, função de gatilho fora da API REST e is_admin()
-- movida para um schema privado (que o PostgREST não expõe).
-- O conteúdo consolidado já está refletido nas duas migrations
-- anteriores; este arquivo registra a mudança no histórico.
revoke all on function public.handle_new_user() from public, anon, authenticated;
