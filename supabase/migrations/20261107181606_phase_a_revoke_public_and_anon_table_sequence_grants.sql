begin;
revoke all privileges on all tables in schema public from public,anon;
revoke all privileges on all sequences in schema public from public,anon;
commit;