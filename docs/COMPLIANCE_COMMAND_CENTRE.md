# Society OS Compliance Command Centre

## Purpose
The Compliance Command Centre adds an evidence-backed obligation library and period-wise compliance register. It is designed to make statutory and society-governance obligations traceable to their legal or policy source, applicability decision, owner, due date, evidence, reviewer and closure outcome.

## Important legal boundary
The initial obligation library is seeded from the Society-supplied 2014 Model Bye-laws copy and the Society QMS draft. It is a structured review baseline, not a verified legal opinion or a statement that every entry applies to this Society. The Society's registered bye-laws and registered amendments, current Maharashtra Co-operative Societies Act and Rules, government/Registrar directions, applicable forms and auditor advice must be verified before a control is marked "Verified Current". The system deliberately does not hard-code statutory deadlines where the current applicability or rule requires verification.

## Data model
- `compliance_obligations`: versionable source-linked obligation/control master; legal verification, applicability, frequency, due-rule, owner/reviewer roles and evidence expectations.
- `compliance_obligation_instances`: period-specific execution record; due date, owner, status, submission reference, exception, next action.
- `compliance_evidence`: evidence index linked to a period instance.
- `compliance_activity`: append-only activity log for changes to period records.

## Current UI
- Compliance Command Centre navigation and screen.
- Search, domain and status filters.
- FY period selection and safe idempotent cycle initialization.
- Obligation source, clause, applicability and legal verification visibility.
- Period status, owner, due date, submission reference, next action and exception notes.
- Custom Society control creation; custom controls are clearly labelled as Society policy and not automatically treated as legal obligations.

## Safety and accounting boundaries
- The module does not alter transactions, demands, allocations, ledgers, opening balances or reports.
- It does not calculate or invent statutory deadlines.
- "Accepted" is a workflow state, not proof of regulator acceptance unless a submission reference/evidence is recorded.
- The seeded master is intentionally marked "Draft - Verify" and "To Verify".
- Initial RLS is aligned to the existing authenticated workspace model. Role-specific access for Treasurer, Secretary, Committee, members, internal auditor and statutory auditor is not yet implemented and is a production blocker. Do not expose this workspace to external auditors or members until access policies are connected to a trusted server-side role model.

## Next implementation increments
1. Verify registered bye-laws/amendments and current statutory source references; configure applicability and due-date rules with the appointed auditor.
2. Add evidence uploads to a private compliance evidence bucket and reviewer sign-off.
3. Connect the obligation register to FY stage status, AGM/SGM, audit rectification, auditor handover and statutory submission workflows.
4. Implement actual financial book closure only after the ledger/journal and opening-balance rollover model is verified. A snapshot alone is not a book closure.
5. Add trusted role-based RLS and security tests before production.
