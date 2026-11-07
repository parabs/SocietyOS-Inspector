begin;
insert into public.permission_catalog(permission_code,description,permission_group) values
  ('society.settings.manage','Manage society settings','society'),
  ('society.members.manage','Invite and manage society memberships','society'),
  ('society.roles.manage','Manage society roles and permission grants','society'),
  ('society.buildings.manage','Manage buildings and wings within a society','society'),
  ('master.read.society','Read society master data','master'),
  ('master.draft.manage','Create and edit non-financial master drafts','master'),
  ('party.read.linked','Read verified linked-party records','party'),
  ('party.read.assigned','Read party/contact details for assigned work','party'),
  ('member.directory.read','Read the permitted member directory','member'),
  ('finance.read.society','Read society-wide financial records','finance'),
  ('finance.read.summary','Read approved financial summaries','finance'),
  ('finance.read.linked','Read linked-party financial statements','finance'),
  ('finance.read.audit','Read time-bound audit financial evidence','finance'),
  ('finance.export.society','Export society-wide financial records','finance'),
  ('finance.export.audit','Export assigned audit evidence','finance'),
  ('finance.import.manage','Manage financial import preview and commit','finance'),
  ('finance.transaction.create_draft','Create transaction drafts','finance'),
  ('finance.transaction.edit_draft','Edit unposted transaction drafts','finance'),
  ('finance.transaction.submit','Submit transactions for review','finance'),
  ('finance.transaction.review','Review transaction evidence and allocations','finance'),
  ('finance.transaction.post','Post authorized financial transactions','finance'),
  ('finance.transaction.reverse','Reverse posted transactions through controlled workflow','finance'),
  ('finance.demand.read','Read demand registers','finance'),
  ('finance.demand.manage','Manage authorized demand drafts and postings','finance'),
  ('finance.receipt.verify','Verify actual payment settlement','finance'),
  ('finance.receipt.issue','Issue receipts for verified posted payments','finance'),
  ('finance.reconciliation.manage','Prepare and manage bank/account reconciliation','finance'),
  ('finance.correct.request','Request financial corrections','finance'),
  ('finance.correct.approve','Approve financial corrections under delegation','finance'),
  ('member.payment.submit','Submit own member payment claim','member_payment'),
  ('member.payment.read_own','Read own payment claims','member_payment'),
  ('expense.request.create_own','Create own expense requests','expense'),
  ('expense.request.read_own','Read own expense requests','expense'),
  ('expense.request.create_assigned','Create expense requests for assigned work','expense'),
  ('expense.request.read_assigned','Read expense requests for assigned work','expense'),
  ('expense.request.review','Review expense requests and evidence','expense'),
  ('expense.approve.delegated','Approve expenses within delegated limits','expense'),
  ('expense.payment.record','Record actual payment against approved expense','expense'),
  ('governance.read','Read society governance records','governance'),
  ('governance.manage','Prepare governance notices, meetings and records','governance'),
  ('governance.approve.delegated','Approve governance items under delegated authority','governance'),
  ('compliance.read','Read statutory compliance records','compliance'),
  ('compliance.manage','Manage compliance obligations and workflow drafts','compliance'),
  ('compliance.submit','Submit statutory compliance evidence','compliance'),
  ('audit.evidence.read','Read assigned audit evidence','audit'),
  ('audit.observations.manage','Create and manage independent audit observations','audit'),
  ('audit.sign_off.assigned','Sign off only explicitly assigned independent audit stages','audit'),
  ('task.assigned.read','Read assigned operational tasks','operations'),
  ('task.assigned.update','Update assigned operational tasks','operations'),
  ('audit.events.read','Read authorized audit/security events','audit'),
  ('audit.events.export','Export authorized audit/security events','audit'),
  ('data_quality.read','Read data-quality exceptions','data_quality'),
  ('data_quality.resolve','Resolve data-quality exceptions with evidence','data_quality'),
  ('query.submit_own','Submit own society/member queries','member'),
  ('virtual_accountant.advisory.read','Use read-only financial advisory analysis within assigned scope','advisory')
on conflict(permission_code) do update set description=excluded.description,permission_group=excluded.permission_group;
do $$
declare v_society uuid; v_user uuid; v_membership uuid; v_count integer;
begin
 select count(*) into v_count from auth.users u
 where (u.raw_app_meta_data->>'role'='society_admin' or coalesce(u.raw_app_meta_data->'roles','[]'::jsonb) ? 'society_admin')
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google');
 if v_count<>1 then raise exception 'Expected exactly one existing Google-linked Society Admin; found %',v_count; end if;
 select u.id into v_user from auth.users u
 where (u.raw_app_meta_data->>'role'='society_admin' or coalesce(u.raw_app_meta_data->'roles','[]'::jsonb) ? 'society_admin')
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google') limit 1;
 select society_id into v_society from public.societies where tenant_code='pearl-meadows-c-type-wing';
 if v_society is null then
  insert into public.societies(tenant_code,legal_name,display_name,timezone,status,settings)
  values('pearl-meadows-c-type-wing','PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.','Pearl Meadows C Wing','Asia/Kolkata','active',
  '{"currency":"INR","financial_year_start":"04-01","financial_year_end":"03-31"}'::jsonb) returning society_id into v_society;
 else
  if not exists(select 1 from public.societies where society_id=v_society and legal_name='PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.') then
   raise exception 'Existing tenant code is associated with a different legal name; stop for review';
  end if;
 end if;
 insert into public.society_buildings(society_id,building_code,building_name,status) values(v_society,'C','C Wing','active')
 on conflict(society_id,building_code) do nothing;
 insert into public.society_roles(society_id,role_code,role_name,is_system_role) values
 (v_society,'society_admin','Society Admin',true),(v_society,'treasurer','Treasurer',true),
 (v_society,'secretary','Secretary',true),(v_society,'chairman','Chairman',true),
 (v_society,'auditor','Auditor',true),(v_society,'member','Member',true),
 (v_society,'requester','Requester',true),(v_society,'caretaker','Caretaker',true)
 on conflict(society_id,role_code) do update set role_name=excluded.role_name,is_system_role=true;
 insert into public.society_role_permissions(role_id,permission_code)
 select r.role_id,m.permission_code from (values ('society_admin','society.settings.manage'),
  ('society_admin','society.members.manage'),
  ('society_admin','society.roles.manage'),
  ('society_admin','society.buildings.manage'),
  ('society_admin','master.read.society'),
  ('society_admin','master.draft.manage'),
  ('society_admin','member.directory.read'),
  ('society_admin','finance.read.society'),
  ('society_admin','finance.export.society'),
  ('society_admin','finance.import.manage'),
  ('society_admin','finance.correct.request'),
  ('society_admin','governance.read'),
  ('society_admin','compliance.read'),
  ('society_admin','compliance.manage'),
  ('society_admin','data_quality.read'),
  ('society_admin','data_quality.resolve'),
  ('society_admin','audit.events.read'),
  ('treasurer','master.read.society'),
  ('treasurer','finance.read.society'),
  ('treasurer','finance.export.society'),
  ('treasurer','finance.import.manage'),
  ('treasurer','finance.transaction.create_draft'),
  ('treasurer','finance.transaction.edit_draft'),
  ('treasurer','finance.transaction.submit'),
  ('treasurer','finance.transaction.review'),
  ('treasurer','finance.transaction.post'),
  ('treasurer','finance.transaction.reverse'),
  ('treasurer','finance.demand.read'),
  ('treasurer','finance.demand.manage'),
  ('treasurer','finance.receipt.verify'),
  ('treasurer','finance.receipt.issue'),
  ('treasurer','finance.reconciliation.manage'),
  ('treasurer','finance.correct.request'),
  ('treasurer','expense.request.review'),
  ('treasurer','expense.payment.record'),
  ('treasurer','data_quality.read'),
  ('treasurer','data_quality.resolve'),
  ('treasurer','audit.events.read'),
  ('secretary','master.read.society'),
  ('secretary','member.directory.read'),
  ('secretary','finance.read.summary'),
  ('secretary','governance.read'),
  ('secretary','governance.manage'),
  ('secretary','governance.approve.delegated'),
  ('secretary','compliance.read'),
  ('secretary','compliance.manage'),
  ('secretary','compliance.submit'),
  ('secretary','audit.events.read'),
  ('chairman','master.read.society'),
  ('chairman','finance.read.summary'),
  ('chairman','governance.read'),
  ('chairman','governance.approve.delegated'),
  ('chairman','expense.approve.delegated'),
  ('chairman','compliance.read'),
  ('chairman','audit.events.read'),
  ('auditor','finance.read.audit'),
  ('auditor','finance.export.audit'),
  ('auditor','audit.evidence.read'),
  ('auditor','audit.observations.manage'),
  ('auditor','audit.sign_off.assigned'),
  ('auditor','audit.events.read'),
  ('auditor','audit.events.export'),
  ('auditor','compliance.read'),
  ('member','party.read.linked'),
  ('member','finance.read.linked'),
  ('member','member.payment.submit'),
  ('member','member.payment.read_own'),
  ('member','expense.request.create_own'),
  ('member','expense.request.read_own'),
  ('member','query.submit_own'),
  ('requester','expense.request.create_own'),
  ('requester','expense.request.read_own'),
  ('caretaker','task.assigned.read'),
  ('caretaker','task.assigned.update'),
  ('caretaker','expense.request.create_assigned'),
  ('caretaker','expense.request.read_assigned'),
  ('caretaker','party.read.assigned')) as m(role_code,permission_code)
 join public.society_roles r on r.society_id=v_society and r.role_code=m.role_code
 join public.permission_catalog p on p.permission_code=m.permission_code
 on conflict(role_id,permission_code) do nothing;
 insert into public.society_memberships(society_id,user_id,status,valid_from)
 values(v_society,v_user,'active',current_date)
 on conflict(society_id,user_id) where status in ('invited','active') do nothing;
 select membership_id into v_membership from public.society_memberships
 where society_id=v_society and user_id=v_user and status='active' order by created_at desc limit 1;
 if v_membership is null then raise exception 'Initial Society Admin membership could not be resolved'; end if;
 insert into public.society_membership_roles(membership_id,society_id,role_id,granted_by,valid_from)
 select v_membership,v_society,r.role_id,v_user,current_date from public.society_roles r
 where r.society_id=v_society and r.role_code='society_admin'
 on conflict(membership_id,role_id,valid_from) do nothing;
 if not exists(select 1 from public.society_membership_audit where society_id=v_society and action_code='initial_society_admin_seeded' and target_id=v_membership::text) then
  insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,after_state)
  values(v_society,v_user,'initial_society_admin_seeded','society_membership',v_membership::text,
  'Owner-confirmed existing Google-linked Society Admin account mapped to the Pearl Meadows C-Type Wing tenant.',
  jsonb_build_object('status','active','role_code','society_admin'));
 end if;
end $$;
commit;