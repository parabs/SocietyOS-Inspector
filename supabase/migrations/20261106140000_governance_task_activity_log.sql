-- Immutable activity history for guided AGM/compliance checklist tasks.
create table if not exists public.governance_task_activity (
  activity_id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.financial_year_checklist(checklist_id) on delete restrict,
  financial_year text not null,
  action text not null,
  field_name text,
  old_value text,
  new_value text,
  actor_user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists governance_task_activity_checklist_created_idx
  on public.governance_task_activity(checklist_id, created_at desc);

alter table public.governance_task_activity enable row level security;

drop policy if exists "Authenticated users can read governance task activity" on public.governance_task_activity;
create policy "Authenticated users can read governance task activity"
  on public.governance_task_activity for select to authenticated using (true);

drop policy if exists "Authenticated users can insert governance task activity" on public.governance_task_activity;
create policy "Authenticated users can insert governance task activity"
  on public.governance_task_activity for insert to authenticated
  with check (actor_user_id is not distinct from auth.uid());

create or replace function public.log_governance_task_activity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_field text;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.governance_task_activity
      (checklist_id, financial_year, action, field_name, new_value, actor_user_id)
    values
      (new.checklist_id, new.financial_year, 'Task created', 'task', new.task, auth.uid());
    return new;
  end if;

  v_old := to_jsonb(old);
  v_new := to_jsonb(new);
  foreach v_field in array array['status','owner_name','owner_role','due_date','evidence_reference','remarks','approval_status','approval_notes'] loop
    if coalesce(v_old ->> v_field, '') is distinct from coalesce(v_new ->> v_field, '') then
      insert into public.governance_task_activity
        (checklist_id, financial_year, action, field_name, old_value, new_value, actor_user_id)
      values
        (new.checklist_id, new.financial_year,
         case when v_field = 'status' then 'Status changed'
              when v_field = 'approval_status' then 'Review decision updated'
              else 'Task details updated' end,
         v_field, v_old ->> v_field, v_new ->> v_field, auth.uid());
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_log_governance_task_activity on public.financial_year_checklist;
create trigger trg_log_governance_task_activity
after insert or update of status, owner_name, owner_role, due_date, evidence_reference, remarks, approval_status, approval_notes
on public.financial_year_checklist
for each row execute function public.log_governance_task_activity();
