-- Phase 4: controlled member-to-party mapping.
-- Mapping is deliberately created as pending and must be explicitly verified by a
-- Society Admin. No party/user association is inferred from matching names or email.

create unique index if not exists party_user_links_active_pair_uq
on public.party_user_links (society_id, user_id, party_id)
where status in ('pending', 'verified');

drop policy if exists party_user_links_admin_insert on public.party_user_links;
create policy party_user_links_admin_insert
on public.party_user_links
for insert
to authenticated
with check (
  society_id = private.current_society_id()
  and private.has_society_permission(society_id, 'society.members.manage')
  and status = 'pending'
  and verified_by is null
  and verified_at is null
  and exists (
    select 1 from public.society_memberships sm
    where sm.society_id = party_user_links.society_id
      and sm.user_id = party_user_links.user_id
      and sm.status = 'active'
      and sm.valid_from <= current_date
      and (sm.valid_until is null or sm.valid_until >= current_date)
  )
);

drop policy if exists party_user_links_admin_update on public.party_user_links;
create policy party_user_links_admin_update
on public.party_user_links
for update
to authenticated
using (
  society_id = private.current_society_id()
  and private.has_society_permission(society_id, 'society.members.manage')
)
with check (
  society_id = private.current_society_id()
  and private.has_society_permission(society_id, 'society.members.manage')
  and (
    (status = 'verified' and verified_by = (select auth.uid()) and verified_at is not null)
    or status = 'revoked'
    or (status = 'pending' and verified_by is null and verified_at is null)
  )
);

-- Limit authenticated updates to the verification lifecycle fields. The mapping
-- identity (society, party, user, relationship) is immutable after insertion.
revoke update on public.party_user_links from authenticated;
grant update (status, verified_by, verified_at, valid_until) on public.party_user_links to authenticated;
