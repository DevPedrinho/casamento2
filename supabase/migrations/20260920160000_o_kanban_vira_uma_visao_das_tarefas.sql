-- O quadro Kanban deixa de ser um módulo à parte: vira uma forma de ver
-- o checklist de tarefas (a fazer → em andamento → concluído).
-- Antes de derrubar as tabelas, o único card que existia migra para tasks.

insert into public.tasks (title, notes, category, phase, phase_order, status, owner, due_date, priority)
select
  c.title,
  c.description,
  c.category,
  '3 a 6 meses antes',
  4,
  case when col.is_done then 'feito'::public.task_status else 'pendente'::public.task_status end,
  c.owner,
  c.due_date,
  c.priority
from public.kanban_cards c
join public.kanban_columns col on col.id = c.column_id
where not exists (select 1 from public.tasks t where t.title = c.title);

-- Subtarefas do card seguem junto, se houver.
insert into public.task_items (task_id, title, done, sort_order)
select t.id, i.title, i.done, i.sort_order
from public.kanban_card_items i
join public.kanban_cards c on c.id = i.card_id
join public.tasks t on t.title = c.title;

drop table if exists public.kanban_card_comments;
drop table if exists public.kanban_card_items;
drop table if exists public.kanban_cards;
drop table if exists public.kanban_columns;
