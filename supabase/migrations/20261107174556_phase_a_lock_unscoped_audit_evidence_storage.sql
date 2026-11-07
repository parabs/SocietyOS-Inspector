-- Disable unscoped access to the private audit-evidence bucket until
-- society/record-level authorization and society-first object paths are ready.
-- At application time the bucket had zero objects and no populated evidence paths.

begin;
drop policy if exists audit_evidence_insert on storage.objects;
drop policy if exists audit_evidence_read on storage.objects;
drop policy if exists audit_evidence_update on storage.objects;
commit;
