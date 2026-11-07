# Society OS — Sprint 1 Foundation Architecture

**Status:** Architecture proposal for review  
**Scope:** Multi-society foundation, building hierarchy, property assets, party relationships, membership and permissions, operational rules, and safe migration planning.  
**Non-goals for this sprint:** No production schema migration, no bulk data updates, no financial recalculation, no historical transaction remapping, and no replacement of working import, master-data, reporting, or audit workflows.

## 1. Design principles

1. A society is the tenant boundary. Every operational record must ultimately belong to exactly one society, directly or through a verified parent relationship.
2. A society may contain multiple buildings. A building is a physical grouping, not a separate society or financial tenant.
3. A property asset is independent of the party who owns, occupies, uses, or is allocated that asset.
4. Ownership, occupancy, membership, parking allocation, billing responsibility, and committee authority are distinct relationships.
5. Relationships are effective-dated. Changes create history; they do not overwrite the past.
6. Support complex arrangements in the data model, but keep the day-to-day UI simple for a society with one owner and one occupant.
7. Existing FY 2018–19 financial records and working reports remain intact. New structure must be introduced through a staged, reversible migration.
8. Unknown historical facts remain unknown. Do not fabricate owners, shares, dates, or relationships to satisfy constraints.
9. Source Register remains available for provenance. Source inspection is optional and must not block setup or ordinary imports.
10. Rules must be executable and purpose-specific, not merely descriptive status labels.

## 2. Core hierarchy

```
Society
  ├── Building A
  │    ├── Flat 101
  │    ├── Shop G-01
  │    └── Parking P-01
  ├── Building B
  │    ├── Flat 201
  │    └── Parking P-02
  └── Common / shared assets
       ├── Clubhouse
       ├── Terrace
       └── Equipment / facilities
```

Recommended logical entities:

- `societies`: registered society identity, registration details, address, status, timezone and configuration.
- `society_buildings`: building / wing / block identity within a society. Allow multiple buildings and optional phases.
- `property_assets`: every individually identifiable unit or facility, with an asset type and optional building.
- `asset_relationships`: effective-dated links between a party and an asset.
- `party_master`: people and legal entities associated with a society. Retain the existing Party Master concept; add tenant scope and stable identifiers through a migration plan.
- `society_memberships`: user identity and membership in a particular society.
- `society_role_assignments`: effective-dated roles held by a user/member within one society.
- `asset_charge_applicability`: links assets or asset classes to charge rules where required.

The model should not assume that a society has only one building, that a building contains only flats, or that every party owns a flat.

## 3. Property asset model

An asset has its own stable ID and belongs to one society. It may optionally belong to a building (for example, a society-level clubhouse or common facility may not belong to one building).

Initial asset types should include:

- Flat / residential unit
- Shop / commercial unit
- Parking space
- Office / other separately assessed unit
- Common area / facility
- Equipment / maintainable item
- Land / other property, where applicable

Suggested asset attributes:

- `asset_id`, `society_id`, optional `building_id`
- `asset_type`, `asset_code`, display label / unit number
- floor, wing, location, area and area unit (nullable where not applicable)
- `parent_asset_id` for genuine containment or sub-assets (not for ownership)
- status: planned, active, inactive, merged, retired
- valid-from / valid-to dates
- source / evidence references and verification state
- metadata for type-specific fields without making core identity depend on JSON

Uniqueness should be scoped: an asset code must be unique within the appropriate society/building/type namespace, not globally across all societies. Do not rely on a flat number alone as a global key.

### Parking is an independent asset

Parking must not be a child row that can exist only when a flat exists. A parking space may be:

- owned by a flat owner in the same building;
- owned by a person who owns no flat in that building;
- owned by a person whose flat is in another building or another society;
- allotted or licensed to a resident who is not the owner;
- assigned to a tenant or permitted user;
- jointly owned;
- temporarily reassigned, surrendered, transferred or left unallocated.

A parking space can optionally have a convenience association to a flat, but that association must not establish ownership or be required for the parking record to exist.

## 4. Party-to-asset relationship model

Do not put a single `party_id` directly on `property_assets` as the only ownership field. Use a relationship table.

Recommended relationship fields:

- relationship ID, `society_id`, `asset_id`, `party_id`
- relationship type: legal_owner, co_owner, beneficial_interest (if evidenced), tenant, occupant, family_occupant, licensee, caretaker, parking_allottee, parking_user, billing_contact, emergency_contact, authorised_representative
- optional ownership share / share unit; nullable if unknown or not applicable
- primary-contact / primary-correspondent flag (not equivalent to sole owner)
- valid_from, valid_to, status
- evidence reference, verification status, notes
- created_by / updated_by and timestamps

A single party may have relationships with many assets. One asset may have multiple parties. The same party may have different relationship types to the same asset over time.

### Scenarios the model must support

| Scenario | Required representation |
|---|---|
| One owner, one flat | One legal-owner relationship |
| Joint owners / co-owners | Multiple legal-owner relationships, optional shares |
| Shares known but not equal | Store explicit shares and share basis |
| Shares unknown / historical records incomplete | Keep shares null; flag for review, do not invent percentages |
| Owner plus spouse / family occupant | Owner and occupant relationships kept separately |
| Owner plus tenant | Owner and tenant can overlap in time; relationship types differ |
| Tenant changes | Close old occupancy relationship and create a new one |
| Owner sells / transfers asset | End prior ownership and start new ownership on effective dates |
| Multiple owners with one correspondence contact | Multiple ownership rows; one designated contact relationship/flag |
| Company / trust / partnership owns asset | Party can represent an entity, not only a natural person |
| Owner owns multiple flats | Reuse the party across multiple assets |
| One person owns flat and separate parking | Two independent asset relationships |
| External parking owner, no flat in building | Parking relationship exists without a flat relationship |
| Parking allotted to a different resident | Owner and allottee/user relationships coexist |
| Parking shared by family / users | Multiple user relationships if permitted by society policy |
| Parking surrendered or re-allotted | End-dated allocation history; new allocation record |
| Asset vacant / unowned / common property | Asset exists without a current owner or occupant |
| Deceased owner / estate / succession pending | Preserve recorded owner history; add estate/legal representative relationship only when supported by evidence |
| Disputed ownership | Record competing claims as claims / review cases, not as confirmed legal ownership |
| Power of attorney / authorised representative | Representative relationship does not imply ownership |
| Nominee | Nomination is a separate relationship and must not be treated as legal title |
| Asset subdivided / combined | Retire or supersede old asset identities with explicit lineage; never silently reuse IDs |

### Ownership shares and validation

- Ownership share is optional, because historical source records may not contain it.
- If shares are supplied, store the denominator/basis (for example percentage or fractional share) and validate the total only for a defined ownership set and effective period.
- Do not enforce a 100% total where ownership is disputed, incomplete, or not recorded.
- A primary owner/contact is a convenience designation, not a substitute for all owner rows.
- Ownership, possession, billing responsibility and membership must not be inferred from one another.

### Parking allocation safeguards

Default policy should be **one active primary allotment per parking asset at a time**. However, design the model to support explicitly approved shared-use arrangements:

- Separate parking ownership from parking allotment and actual user access.
- Keep allocation history with effective dates, approval, reason and evidence.
- Prevent overlapping active primary allotments for the same space unless a documented exception / shared-allocation mode is approved.
- Shared users may be multiple while the primary allotment remains one; the UI must clearly distinguish them.
- Do not assume a parking owner must be a flat owner or even a member of that building.
- Society-specific parking eligibility and charge rules belong in Rules Master / applicability, not hardcoded assumptions.

## 5. Party identity and Flat Owner Master connection

The existing Party Master and Flat Owner Master are not properly connected. The target model should treat Party Master as the identity record and asset relationships as the link to property.

Migration approach:

1. Preserve existing party IDs and flat-owner IDs.
2. Build a proposed crosswalk from each existing flat-owner row to a party record.
3. Use exact, reviewable matching evidence; do not auto-merge on name alone.
4. Where a flat-owner row represents an ownership relationship rather than a distinct person, convert it to a relationship against the matched party and asset.
5. Where the source row is ambiguous, retain it as unresolved staging data until reviewed.
6. Preserve original source values and legacy identifiers for traceability.
7. Do not rewrite transaction party IDs or financial balances as part of this architecture sprint.

The eventual UI should let a volunteer open a party and see all associated assets and relationships, and open an asset to see owners, occupants, allotments and history.

## 6. Society membership, users and committee roles

A person / party is not automatically a login user. A login user is not automatically a society member. A member is not automatically a committee office bearer.

Recommended separation:

- Authentication identity: Supabase Auth user.
- Party identity: person or legal entity in Party Master.
- Society membership: relationship between a user/party and a society, with membership status and dates.
- Role assignment: role within one society and effective period.
- Permission: action-level capability evaluated for the active society and relevant resource.

Initial role catalogue:

- Society Owner / Platform Operator (cross-tenant support, tightly restricted)
- Society Admin
- Chairman
- Secretary
- Treasurer
- Committee Member
- Auditor / Statutory Auditor
- Member / Resident
- Volunteer / Facility Coordinator
- Accountant / Society OS virtual accountant (system identity with scoped capabilities, not a human committee role)

Role assignment must be society-scoped. A user may be Treasurer in Society A and a Member in Society B. Multiple roles may coexist where explicitly allowed. Office-bearer tenure must have start/end dates and approval provenance.

Permissions should be action-based (view, create, edit, approve, publish, export, close, reopen, manage-users), resource-scoped, and society-scoped. Sensitive actions such as bank/account changes, journal adjustments, demand rule changes, audit closure and role administration require explicit permission and an audit trail.

## 7. Operational Rules Master

The Rules Master must evolve from descriptive records into versioned, executable policy. Each rule should have:

- society scope (with optional reusable platform defaults)
- rule code, name, purpose and rule type
- operational domain: import mapping, master validation, recurring demand, late charge, payment matching, data quality, parking allocation, governance/compliance
- applicability: society/building/asset type/party type/category/account/financial year as relevant
- effective_from / effective_to
- priority and conflict-resolution behaviour
- conditions and action / calculation definition
- required inputs and missing-data behaviour
- approval state, approved_by, approved_at
- version number and supersedes_rule_id
- execution mode: advisory, validation, blocking, calculation
- test cases / preview results and last-run metadata

### Rules must be bound to workflows

| Workflow | Rule use |
|---|---|
| Workbook / data import | Map source labels to party, category, account, asset, transaction type; identify unknowns without fabricating matches |
| Master-data validation | Detect duplicate asset codes, invalid relationships, missing required fields, overlaps and inconsistent references |
| Maintenance / recurring demand generation | Determine applicable assets/parties, charge category, amount, frequency, period, due date and effective date |
| Late charges | Apply only approved policy and effective dates; preserve historical interpretation separately from future operation |
| Parking charges | Determine eligible parking assets / allotments and applicable charges independently from flat ownership |
| Payment matching | Apply approved matching priority and allow unresolved/unallocated amounts |
| Data quality | Produce warnings, review items or blockers according to severity and workflow |
| Compliance / governance | Generate tasks and evidence requirements only when the relevant society rule is active |

Rules must not silently rewrite posted financial records. Changes to a rule after demands have been generated should create a new version and require an explicit recalculation / adjustment workflow with preview and approval.

### Historical versus operational rules

- Historical interpretation rules explain how existing FY 2018–19 source records should be classified or interpreted.
- Operational rules drive new imports and future demand runs.
- Historical rules must not automatically become current policy.
- Historical exceptions may remain open while work progresses; not every anomaly blocks all imports.
- Unknown category / party / account / asset references should remain visibly unidentified or in a review queue, not be guessed.

## 8. Data quality and volunteer self-service

Data quality should be contextual and staged, not a single global pass/fail gate.

Suggested severities:

- **Blocker:** prevents a specific unsafe action (for example, posting a demand with no society, or assigning the same parking space to two conflicting primary allotments).
- **Review required:** action may proceed with explicit acknowledgement or approval (for example, unknown historical ownership share).
- **Warning:** informative inconsistency that does not block the workflow.
- **Informational:** provenance or completeness note.

A volunteer-facing task should say what is wrong, why it matters, which record is affected, what action is recommended, who can resolve it, and whether it blocks the current task. Source inspection should be a separate optional audit activity.

## 9. Virtual society accountant

The virtual accountant should operate as a controlled workflow assistant, not as an unrestricted database administrator.

It may:
- explain balances and reports using approved source tables and calculation views;
- identify unmatched transactions, missing demand links, unusual balances and duplicate candidates;
- suggest mappings and corrections with confidence and evidence;
- prepare draft demands, reconciliations and reports for review;
- explain which rule produced a result;
- create a review task or proposed correction.

It must not, without explicit authorised approval:
- alter source transactions or opening balances;
- post or delete financial records;
- silently reassign parties, assets, categories or demands;
- change approved rules;
- close an audit or financial year;
- bypass role permissions or tenant isolation.

Every proposed action should have a preview, affected-record count, before/after values, rule / evidence references, approver and an immutable audit event.

## 10. Multi-tenant and security architecture

- Every society-owned record must be scoped to a society either directly or through a rigorously enforced parent key.
- Foreign keys and uniqueness constraints should prevent cross-society references, preferably using composite keys where appropriate.
- RLS must validate the authenticated user's active society membership and role; JWT role metadata alone is insufficient for society-specific authorisation.
- Storage paths and policies must be tenant-scoped; private evidence must not be readable by any authenticated user across all societies.
- Platform support access must be explicit, time-bounded where practical, and audited.
- Security-definer functions and views must be reviewed individually for tenant leakage, search_path safety and privilege escalation.
- Never treat hiding a UI control as access control; enforce permissions in database policies / trusted server-side functions.
- A society switcher must change the active tenant context and all reads/writes must use that context.

## 11. Migration plan and safeguards

### Phase A — inventory and mapping (Sprint 1)
- Inventory all public tables, views, foreign keys, policies, functions, triggers, storage buckets and frontend data access.
- Classify each table as platform-level, society-level, building-level, asset-level, user-level or derived.
- Identify direct and indirect tenant paths.
- Map current Pearl Meadows records to a proposed initial society without updating them.
- Identify all views, imports, reports and edge functions affected by tenant keys.

### Phase B — additive schema
- Add society and building tables.
- Add asset and party-relationship tables.
- Add society membership and role tables.
- Add society scope to operational data using nullable columns initially where needed.
- Add composite constraints only after data mapping and validation.
- Keep existing IDs, views and application contracts working during transition.

### Phase C — controlled backfill
- Dry-run the Pearl Meadows assignment and publish counts / exceptions.
- Verify every transaction, demand, account, party, category, source, adjustment, allocation, audit and governance record has the correct society path.
- Do not assume every row belongs to Pearl Meadows solely because it is in the current project.
- Backfill only after an explicit review and backup.
- Reconcile before/after row counts and key financial totals.

### Phase D — tenant enforcement
- Introduce society-aware RLS and storage policies after membership tables and verified backfill exist.
- Test cross-society read/write denial using separate test users.
- Remove broad authenticated-user policies only after equivalent scoped policies are proven.
- Validate reports and imports in the existing Pearl Meadows tenant.

### Phase E — UI and workflow enablement
- Add society context and building/asset management.
- Connect Flat Owner Master to Party Master through the relationship model.
- Add role and permission management.
- Bind operational rules to import, demand and quality workflows.
- Keep existing financial reporting and master-data screens; extend rather than replace.

### Non-negotiable safety gates
- No destructive migration or bulk data rewrite in Sprint 1.
- No financial recalculation as a side effect of tenancy migration.
- No guessed owner, parking allotment, share, date or party match.
- No deployment of RLS changes until tenant isolation tests pass.
- Existing FY 2018–19 reports must be regression-tested against current approved outputs.

## 12. Sprint 1 deliverables and acceptance criteria

1. **Domain model:** society → buildings → assets; independent parking; many-to-many party relationships with effective dates.
2. **Scenario coverage:** ownership, co-ownership, tenancy, occupancy, external parking owner, allotment, shared users, transfers, disputes, nominees and representatives.
3. **Party/asset crosswalk:** current Party Master and Flat Owner Master mapping plan, with ambiguous rows preserved for review.
4. **Membership and permission model:** society-scoped roles and action-level permission matrix.
5. **Rules model:** executable, versioned rules for import, demand generation and data quality; historical interpretation separated from operational rules.
6. **Tenant inventory:** table/view/function/storage classification and migration impact assessment.
7. **Regression plan:** existing FY 2018–19 data, imports, ledgers, reports and dashboards preserved.
8. **Migration safety plan:** dry-run, approval, backup, backfill, RLS rollout and rollback steps.

Sprint 1 is complete only when the architecture and impact inventory are reviewed and accepted. A document or proposed schema is not evidence that production multi-tenancy or permissions have been implemented.
