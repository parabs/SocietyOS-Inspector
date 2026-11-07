-- Membership workflow tests use the seeded Society Admin and roll back all changes.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.society_memberships where status='active' limit 1),true);
select set_config('request.jwt.claims',(select jsonb_build_object('sub',user_id::text,'role','authenticated')::text from public.society_memberships where status='active' limit 1),true);
select set_config('request.headers',jsonb_build_object('x-society-id',(select society_id::text from public.societies where tenant_code='pearl-meadows-c-type-wing'))::text,true);
do $$
declare v_society uuid; v_user uuid; v_party text; v_directory jsonb; v_link uuid; v_blocked integer:=0;
begin
 select society_id into strict v_society from public.societies where tenant_code='pearl-meadows-c-type-wing';
 select user_id into strict v_user from public.society_memberships where society_id=v_society and status='active' limit 1;
 select party_id into strict v_party from public.party_master where society_id=v_society order by party_id limit 1;
 v_directory:=public.get_society_members_directory(v_society);
 if jsonb_array_length(v_directory)<>1 then raise exception 'Society Admin directory should show the seeded member'; end if;
 begin perform public.grant_society_role(v_society,v_user,'treasurer',current_date,null,'self grant test');
 exception when others then v_blocked:=v_blocked+1; end;
 begin perform public.revoke_society_role(v_society,v_user,'society_admin','last admin protection test');
 exception when others then v_blocked:=v_blocked+1; end;
 begin perform public.set_society_membership_status(v_society,v_user,'suspended','last admin protection test');
 exception when others then v_blocked:=v_blocked+1; end;
 if v_blocked<>3 then raise exception 'Expected self-grant and last-admin protections to block three actions; got %',v_blocked; end if;
 v_link:=public.verify_party_user_link(v_society,v_party,v_user,'owner',null,'rollback-only party-link workflow test');
 if v_link is null then raise exception 'Verified party-user link did not return a link id'; end if;
end $$;
rollback;