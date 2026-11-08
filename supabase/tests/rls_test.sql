-- RLS + consent-gate tests. Any failed assertion raises and aborts (ON_ERROR_STOP).
\set ON_ERROR_STOP on

insert into auth.users values ('00000000-0000-0000-0000-00000000000a','a@example.com'),('00000000-0000-0000-0000-00000000000b','b@example.com');

-- User A creates data
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
insert into public.posts (id,user_id,pillar,template_type,source,idea,status,is_before_after)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','transformation','before-after','pillar','BA','draft',true);
insert into public.post_variants (id,post_id,user_id,platform,format_id)
values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','instagram','ig-feed');
insert into public.audit_log (user_id, actor, action) values ('00000000-0000-0000-0000-00000000000a','user','test');

-- 1. Consent gate: scheduling a before/after post with no consent must fail.
do $$ begin
  begin
    update public.posts set status='scheduled' where id='10000000-0000-0000-0000-000000000001';
    raise exception 'TEST FAILED: post scheduled without consent';
  exception when check_violation then raise notice 'ok: post status gate';
  end;
  begin
    insert into public.schedule_items (user_id,post_id,variant_id,platform,scheduled_at)
    values ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','instagram',now()+interval '1 day');
    raise exception 'TEST FAILED: schedule item created without consent';
  exception when check_violation then raise notice 'ok: schedule gate';
  end;
end $$;

-- 2. With valid consent it works.
insert into public.consent_records (id,user_id,client_alias,scope,consent_text_version,evidence_hash,signature_svg)
values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','JK',array['before-after'],'v1',repeat('a',64),'<svg/>');
update public.posts set consent_record_id='30000000-0000-0000-0000-000000000001', status='scheduled' where id='10000000-0000-0000-0000-000000000001';
insert into public.schedule_items (id,user_id,post_id,variant_id,platform,scheduled_at)
values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','instagram',now()+interval '1 day');

-- 3. Revoking consent cancels pending schedule items and moves the post back to review.
update public.consent_records set revoked_at=now() where id='30000000-0000-0000-0000-000000000001';
do $$ begin
  if (select state from public.schedule_items where id='40000000-0000-0000-0000-000000000001') <> 'cancelled' then raise exception 'TEST FAILED: schedule not cancelled on revoke'; end if;
  if (select status from public.posts where id='10000000-0000-0000-0000-000000000001') <> 'review' then raise exception 'TEST FAILED: post not moved to review'; end if;
  raise notice 'ok: revocation cascade';
end $$;

-- 4. Consent evidence is immutable.
do $$ begin
  begin
    update public.consent_records set client_alias='XX' where id='30000000-0000-0000-0000-000000000001';
    raise exception 'TEST FAILED: consent alias edited';
  exception when raise_exception then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'ok: consent immutable';
  end;
end $$;

-- 5. Audit log is append-only for users.
do $$ declare n int; begin
  update public.audit_log set action='tampered';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: audit log updated'; end if;
  delete from public.audit_log;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: audit log deleted'; end if;
  raise notice 'ok: audit append-only';
exception when insufficient_privilege then raise notice 'ok: audit append-only (privilege)';
end $$;

-- 6. User B sees nothing of A's and cannot write into A's account.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if (select count(*) from public.posts) <> 0 then raise exception 'TEST FAILED: B can read A posts'; end if;
  if (select count(*) from public.consent_records) <> 0 then raise exception 'TEST FAILED: B can read A consent'; end if;
  if (select count(*) from public.audit_log) <> 0 then raise exception 'TEST FAILED: B can read A audit'; end if;
  begin
    insert into public.posts (user_id,pillar,template_type,source,idea) values ('00000000-0000-0000-0000-00000000000a','education','tip','pillar','x');
    raise exception 'TEST FAILED: B inserted as A';
  exception when insufficient_privilege then raise notice 'ok: cross-user insert blocked';
  end;
  update public.posts set idea='hacked';
  if exists (select 1 from public.posts where idea='hacked') then raise exception 'TEST FAILED'; end if;
  begin
    -- B tries to attach a variant to A's post (child-owner check)
    insert into public.post_variants (post_id,user_id,platform,format_id) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','instagram','ig-feed');
    raise exception 'TEST FAILED: B attached variant to A post';
  exception when raise_exception then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'ok: cross-owner child blocked';
  end;
  raise notice 'ok: tenant isolation';
end $$;

-- 7. Secrets table is invisible to authenticated users.
do $$ begin
  begin
    perform 1 from public.connected_account_secrets;
    raise exception 'TEST FAILED: secrets readable';
  exception when insufficient_privilege then raise notice 'ok: secrets hidden';
  end;
end $$;

-- 8. Anonymous role has no access.
reset role;
set role anon;
do $$ begin
  begin
    perform 1 from public.posts;
    raise exception 'TEST FAILED: anon can read posts';
  exception when insufficient_privilege then raise notice 'ok: anon blocked';
  end;
end $$;
reset role;
\echo ALL DATABASE TESTS PASSED
-- 9. Service role can run the cron query and account deletion.
set role service_role;
do $$ begin
  perform 1 from public.schedule_items where state = 'pending';
  delete from public.audit_log where user_id = '00000000-0000-0000-0000-00000000000b';
  raise notice 'ok: service role privileges';
end $$;
reset role;
\echo SERVICE ROLE TESTS PASSED
