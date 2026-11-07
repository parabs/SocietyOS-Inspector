-- Rollback-only linked-party member isolation test.
begin;
do $$
declare v_society uuid; v_user uuid; v_membership uuid; v_admin_role uuid; v_member_role uuid; v_party text;
begin
 select society_id into strict v_society from public.societies where tenant_code='pearl-meadows-c-type-wing';
 select user_id,membership_id into strict v_user,v_membership from public.society_memberships where society_id=v_society and status='active' limit 1;
 select role_id into strict v_admin_role from public.society_roles where society_id=v_society and role_code='society_admin';
 select role_id into strict v_member_role from public.society_roles where society_id=v_society and role_code='member';
 select party_id into strict v_party from public.party_master where society_id=v_society order by party_id limit 1;
 delete from public.society_membership_roles where membership_id=v_membership and role_id=v_admin_role;
 insert into public.society_membership_roles(membership_id,society_id,role_id,granted_by,valid_from)
 values(v_membership,v_society,v_member_role,v_user,current_date);
 insert into public.party_user_links(society_id,party_id,user_id,relationship_code,status,verified_by,verified_at,valid_from)
 values(v_society,v_party,v_user,'owner','verified',v_user,now(),current_date);
 perform set_config('request.jwt.claim.sub',v_user::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user::text,'role','authenticated')::text,true);
 perform set_config('request.headers',jsonb_build_object('x-society-id',v_society::text)::text,true);
end $$;
set local role authenticated;
do $$
begin
 if (select count(*) from public.party_master)<>1 then raise exception 'Member can see more than one linked party'; end if;
 if (select count(*) from public.account_master)<>0 then raise exception 'Member can see society-wide account master'; end if;
 if (select count(*) from public.transactions)=0 then raise exception 'Linked party transaction history is missing'; end if;
 if (select count(*) from public.demand_register)=0 then raise exception 'Linked party demand history is missing'; end if;
 if (select count(*) from public.v_member_financial_year_balance)=0 then raise exception 'Linked party financial view is missing'; end if;
end $$;
rollback;