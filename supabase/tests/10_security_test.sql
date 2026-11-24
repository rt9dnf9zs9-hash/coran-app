-- Tests de sécurité : un utilisateur gratuit ne doit JAMAIS accéder au Premium
-- en contournant l'interface (requêtes directes avec sa clé et son jeton).
\set ON_ERROR_STOP on

-- Jeu de données : 3 comptes
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000f', 'gratuit@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'premium@test.fr'),
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.fr')
on conflict do nothing;
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000a', 'admin') on conflict do nothing;
insert into public.subscriptions (user_id, provider, provider_ref, status, current_period_end)
values ('00000000-0000-0000-0000-00000000000b', 'stripe', 'sub_test_1', 'active', now() + interval '300 days');
insert into storage.objects (bucket_id, name) values ('audio-public', 'letter/ba.m4a'), ('audio-premium', 'word/kataba.m4a');
insert into public.quran_ayat (surah, ayah, text_simple, source) values (1, 1, 'texte de test', 'test');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
end $$;

-- nombre de lignes visibles ; 0 si l'accès est refusé (refus = protection effective)
create or replace function pg_temp.visible(q text) returns int language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || q || ') x' into n;
  return n;
exception when insufficient_privilege then
  return 0;
end $$;

create table pg_temp.results (name text, ok boolean, detail text);
grant all on pg_temp.results to anon, authenticated;

-- ── 1. Visiteur anonyme ─────────────────────────────────────────────
set role anon;
select pg_temp.as_user(null);
insert into pg_temp.results select 'anon lit le contenu gratuit', count(*) > 0, count(*)::text from public.lesson_contents where lesson_id = 'm1l1';
insert into pg_temp.results select 'anon ne lit PAS le contenu Premium', count(*) = 0, count(*)::text from public.lesson_contents where lesson_id like 'm6%';
insert into pg_temp.results select 'anon voit le titre des leçons Premium', count(*) > 0, count(*)::text from public.lessons where module_id = 6;
insert into pg_temp.results select 'anon lit le prix public', count(*) = 1, '' from public.app_settings where key = 'premium_price';
insert into pg_temp.results select 'anon ne lit pas les abonnements', pg_temp.visible('select * from public.subscriptions') = 0, '';
insert into pg_temp.results select 'anon ne lit pas la progression', pg_temp.visible('select * from public.user_progress') = 0, '';
insert into pg_temp.results select 'anon ne lit pas l’audio Premium', count(*) = 0, '' from storage.objects where bucket_id = 'audio-premium';
reset role;

-- ── 2. Utilisateur gratuit ──────────────────────────────────────────
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
insert into pg_temp.results select 'gratuit lit le module 5', count(*) > 0, '' from public.lesson_contents where lesson_id = 'm5l1';
insert into pg_temp.results select 'gratuit ne lit PAS le module 6', count(*) = 0, '' from public.lesson_contents where lesson_id like 'm6%';
insert into pg_temp.results select 'gratuit ne lit PAS le module 8', count(*) = 0, '' from public.lesson_contents where lesson_id like 'm8%';
insert into pg_temp.results select 'gratuit : my_entitlement = false', (public.my_entitlement() ->> 'premium')::boolean = false, '';
insert into pg_temp.results select 'gratuit ne voit pas l’audio Premium', count(*) = 0, '' from storage.objects where bucket_id = 'audio-premium';
insert into pg_temp.results select 'gratuit voit l’audio public', count(*) = 1, '' from storage.objects where bucket_id = 'audio-public';

do $$ begin
  begin
    perform public.record_attempt('m6l1', 3, 3);
    insert into pg_temp.results values ('gratuit ne peut pas valider une leçon Premium', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas valider une leçon Premium', sqlerrm like 'premium_required%', sqlerrm);
  end;
  begin
    perform public.touch_lesson('m7l1', 1);
    insert into pg_temp.results values ('gratuit ne peut pas démarrer une leçon Premium', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas démarrer une leçon Premium', sqlerrm like 'premium_required%', sqlerrm);
  end;
  begin
    insert into public.subscriptions (user_id, provider, provider_ref, status, current_period_end)
    values (auth.uid(), 'stripe', 'fake', 'active', now() + interval '1 year');
    insert into pg_temp.results values ('gratuit ne peut pas s’attribuer un abonnement', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas s’attribuer un abonnement', true, sqlerrm);
  end;
  begin
    insert into public.user_roles values (auth.uid(), 'admin');
    insert into pg_temp.results values ('gratuit ne peut pas devenir admin', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas devenir admin', true, sqlerrm);
  end;
  begin
    insert into public.user_progress (user_id, lesson_id, status, best_score) values (auth.uid(), 'm1l1', 'completed', 1);
    insert into pg_temp.results values ('gratuit ne peut pas écrire « acquis » directement', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas écrire « acquis » directement', true, sqlerrm);
  end;
  begin
    update public.app_settings set value = '{"amount_cents": 1}' where key = 'premium_price';
    insert into pg_temp.results select 'gratuit ne peut pas changer le prix', (select (value->>'amount_cents')::int from public.app_settings where key='premium_price') <> 1, '';
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas changer le prix', true, sqlerrm);
  end;
  begin
    perform public.admin_stats();
    insert into pg_temp.results values ('gratuit n’a pas accès aux statistiques admin', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('gratuit n’a pas accès aux statistiques admin', true, sqlerrm);
  end;
  begin
    update public.lesson_contents set content = '{}' where lesson_id = 'm1l1';
    insert into pg_temp.results select 'gratuit ne peut pas modifier une leçon', (select content <> '{}'::jsonb from public.lesson_contents where lesson_id='m1l1'), '';
  exception when others then
    insert into pg_temp.results values ('gratuit ne peut pas modifier une leçon', true, sqlerrm);
  end;
end $$;

-- Validation : tentative incomplète refusée, 80 % requis
do $$
declare n int; r public.user_progress;
begin
  select jsonb_array_length(content->'exercises') into n from public.lesson_contents where lesson_id = 'm1l1';
  begin
    perform public.record_attempt('m1l1', 1, 1);
    insert into pg_temp.results values ('tentative incomplète refusée', false, 'accepté !');
  exception when others then
    insert into pg_temp.results values ('tentative incomplète refusée', sqlerrm like 'incomplete_attempt%', sqlerrm);
  end;
  r := public.record_attempt('m1l1', (n * 0.5)::int, n);
  insert into pg_temp.results values ('50 % : leçon non acquise', r.status = 'started', r.status);
  r := public.record_attempt('m1l1', n, n);
  insert into pg_temp.results values ('100 % : leçon acquise', r.status = 'completed', r.status);
  r := public.record_attempt('m1l1', 0, n);
  insert into pg_temp.results values ('échec après réussite : « à revoir », acquis conservé', r.status = 'to_review' and r.best_score = 1, r.status);
end $$;
insert into pg_temp.results select 'gratuit lit sa progression', count(*) = 1, '' from public.user_progress where lesson_id = 'm1l1';
insert into pg_temp.results select 'invité : import limité aux leçons gratuites', public.import_guest_progress('[{"lessonId":"m2l1","stepIndex":2,"bestScore":0.9},{"lessonId":"m6l1","stepIndex":1,"bestScore":1},{"lessonId":"m2l2","bestScore":0.5}]') = 2, '';
insert into pg_temp.results select 'invité : leçon gratuite réussie importée comme acquise', status = 'completed', status from public.user_progress where lesson_id = 'm2l1';
insert into pg_temp.results select 'invité : leçon non réussie importée comme commencée', status = 'started', status from public.user_progress where lesson_id = 'm2l2';
insert into pg_temp.results select 'invité : aucune leçon Premium importée', count(*) = 0, '' from public.user_progress where lesson_id = 'm6l1';
reset role;

-- ── 3. Utilisateur Premium ──────────────────────────────────────────
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into pg_temp.results select 'premium lit le module 6', count(*) > 0, '' from public.lesson_contents where lesson_id like 'm6%';
insert into pg_temp.results select 'premium lit l’audio Premium', count(*) = 1, '' from storage.objects where bucket_id = 'audio-premium';
insert into pg_temp.results select 'premium ne voit pas la progression des autres', count(*) = 0, '' from public.user_progress where user_id <> auth.uid();
do $$ declare n int; r public.user_progress; begin
  select jsonb_array_length(content->'exercises') into n from public.lesson_contents where lesson_id = 'm6l1';
  r := public.record_attempt('m6l1', n, n);
  insert into pg_temp.results values ('premium valide une leçon Premium', r.status = 'completed', r.status);
end $$;
reset role;

-- Expiration : l'abonnement arrive à échéance
update public.subscriptions set current_period_end = now() - interval '1 minute' where provider_ref = 'sub_test_1';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into pg_temp.results select 'expiré : module 6 de nouveau verrouillé', count(*) = 0, '' from public.lesson_contents where lesson_id like 'm6%';
insert into pg_temp.results select 'expiré : la progression Premium est conservée', count(*) = 1, '' from public.user_progress where lesson_id = 'm6l1';
insert into pg_temp.results select 'expiré : le gratuit reste ouvert', count(*) > 0, '' from public.lesson_contents where lesson_id = 'm5l1';
reset role;

-- Remboursement / révocation
update public.subscriptions set current_period_end = now() + interval '200 days', status = 'refunded' where provider_ref = 'sub_test_1';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into pg_temp.results select 'remboursé : plus d’accès Premium', (public.my_entitlement() ->> 'premium')::boolean = false, '';
reset role;

-- ── 4. Administrateur ───────────────────────────────────────────────
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into pg_temp.results select 'admin lit les statistiques', (public.admin_stats() ->> 'users')::int = 3, public.admin_stats()::text;
insert into pg_temp.results select 'admin lit le contenu Premium (édition)', count(*) > 0, '' from public.lesson_contents where lesson_id like 'm8%';
update public.app_settings set value = jsonb_set(value, '{display}', '"44,99 €"') where key = 'premium_price';
insert into pg_temp.results select 'admin modifie le prix affiché', value->>'display' = '44,99 €', '' from public.app_settings where key = 'premium_price';
insert into pg_temp.results select 'modification du prix journalisée', count(*) >= 1, '' from public.audit_log where entity = 'app_settings';
reset role;

-- ── 5. Intégrité du texte coranique ─────────────────────────────────
do $$ begin
  begin
    update public.quran_ayat set text_simple = 'modifié' where surah = 1 and ayah = 1;
    insert into pg_temp.results values ('texte coranique non modifiable', false, 'modifié !');
  exception when others then
    insert into pg_temp.results values ('texte coranique non modifiable', true, sqlerrm);
  end;
end $$;

-- ── Rapport ─────────────────────────────────────────────────────────
\pset footer off
select case when ok then 'OK   ' else 'ÉCHEC' end as res, name, case when ok then '' else detail end as detail from pg_temp.results;
do $$ declare f int; begin
  select count(*) into f from pg_temp.results where not ok;
  if f > 0 then raise exception '% test(s) de sécurité en échec', f; end if;
  raise notice 'Tous les tests de sécurité passent (% tests).', (select count(*) from pg_temp.results);
end $$;
