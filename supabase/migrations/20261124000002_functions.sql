-- ════════════════════════════════════════════════════════════════════
-- Fonctions serveur : droits, progression validée, administration
-- ════════════════════════════════════════════════════════════════════

-- Droit Premium : calculé UNIQUEMENT à partir des abonnements écrits par les webhooks.
-- past_due = paiement de renouvellement en cours de relance : accès maintenu jusqu'à la fin de période.
create or replace function public.has_premium(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'editor'));
$$;

create or replace function public.can_read_lesson(p_lesson text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where l.id = p_lesson and l.published and m.published
      and (m.tier = 'free' or public.has_premium(auth.uid()))
  ) or public.is_editor();
$$;

-- État des droits pour l'interface.
create or replace function public.my_entitlement()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'premium', public.has_premium(auth.uid()),
    'expires_at', (select max(current_period_end) from public.subscriptions where user_id = auth.uid() and status in ('active','trialing','past_due')),
    'provider', (select provider from public.subscriptions where user_id = auth.uid() and status in ('active','trialing','past_due') order by current_period_end desc nulls first limit 1),
    'cancel_at_period_end', coalesce((select bool_or(cancel_at_period_end) from public.subscriptions where user_id = auth.uid() and status in ('active','trialing','past_due')), false)
  );
$$;

-- Profil créé automatiquement à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Progression : écrite uniquement via ces fonctions ──────────────

-- Reprise de lecture (étape atteinte). Ne peut jamais marquer une leçon comme acquise.
create or replace function public.touch_lesson(p_lesson text, p_step integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.can_read_lesson(p_lesson) then raise exception 'premium_required' using errcode = '42501'; end if;
  insert into public.user_progress (user_id, lesson_id, status, step_index)
  values (auth.uid(), p_lesson, 'started', greatest(0, least(p_step, 500)))
  on conflict (user_id, lesson_id) do update
    set step_index = excluded.step_index, updated_at = now();
end;
$$;

-- Tentative de validation : le serveur vérifie le nombre d'exercices et calcule le statut.
create or replace function public.record_attempt(p_lesson text, p_correct integer, p_total integer, p_missed text[] default '{}')
returns public.user_progress
language plpgsql security definer set search_path = public
as $$
declare
  v_expected integer;
  v_kind text;
  v_score numeric;
  v_row public.user_progress;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.can_read_lesson(p_lesson) then raise exception 'premium_required' using errcode = '42501'; end if;
  select jsonb_array_length(c.content -> 'exercises'), l.kind into v_expected, v_kind
    from public.lesson_contents c join public.lessons l on l.id = c.lesson_id where c.lesson_id = p_lesson;
  if v_expected is null or v_expected = 0 then raise exception 'lesson_without_validation' using errcode = '22023'; end if;
  if p_total <> v_expected then raise exception 'incomplete_attempt: % exercices attendus', v_expected using errcode = '22023'; end if;
  if p_correct < 0 or p_correct > p_total then raise exception 'invalid_score' using errcode = '22023'; end if;
  v_score := p_correct::numeric / p_total;

  insert into public.quiz_results (user_id, lesson_id, kind, correct, total, missed_keys)
  values (auth.uid(), p_lesson, v_kind, p_correct, p_total, coalesce(p_missed[1:100], '{}'));

  insert into public.user_progress as up (user_id, lesson_id, status, best_score, attempts, step_index, completed_at)
  values (auth.uid(), p_lesson, case when v_score >= 0.8 then 'completed' else 'started' end, v_score, 1, 0,
          case when v_score >= 0.8 then now() end)
  on conflict (user_id, lesson_id) do update set
    status = case
      when v_score >= 0.8 then 'completed'
      when up.status in ('completed', 'to_review') then 'to_review'
      else 'started' end,
    best_score = greatest(up.best_score, v_score),
    attempts = up.attempts + 1,
    step_index = 0,
    completed_at = coalesce(up.completed_at, case when v_score >= 0.8 then now() end),
    updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- Fusion de la progression du mode découverte (invité) après création de compte.
-- N'accepte que des leçons GRATUITES. Une leçon n'est importée comme acquise que si
-- l'invité a réussi ses exercices de validation (score >= 80 %) sur cet appareil.
create or replace function public.import_guest_progress(p_items jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_score numeric;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 300 loop
    if exists (select 1 from public.lessons l join public.modules m on m.id = l.module_id
               where l.id = v_item ->> 'lessonId' and m.tier = 'free') then
      v_score := least(greatest(coalesce((v_item ->> 'bestScore')::numeric, 0), 0), 1);
      insert into public.user_progress as up (user_id, lesson_id, status, best_score, attempts, step_index, completed_at)
      values (auth.uid(), v_item ->> 'lessonId',
              case when v_score >= 0.8 then 'completed' else 'started' end, v_score,
              least(coalesce((v_item ->> 'attempts')::int, 0), 1000),
              least(coalesce((v_item ->> 'stepIndex')::int, 0), 500),
              case when v_score >= 0.8 then now() end)
      on conflict (user_id, lesson_id) do update set
        best_score = greatest(up.best_score, excluded.best_score),
        status = case when greatest(up.best_score, excluded.best_score) >= 0.8 and up.status = 'started' then 'completed' else up.status end,
        completed_at = coalesce(up.completed_at, excluded.completed_at),
        updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Temps d'étude (série de jours, temps consacré). Plafonné pour éviter les valeurs absurdes.
create or replace function public.log_study(p_seconds integer, p_day date default current_date)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_day > current_date + 1 or p_day < current_date - 2 then raise exception 'invalid_day' using errcode = '22023'; end if;
  insert into public.study_days (user_id, day, seconds) values (auth.uid(), p_day, least(greatest(p_seconds, 0), 3600))
  on conflict (user_id, day) do update set seconds = least(public.study_days.seconds + least(greatest(p_seconds, 0), 3600), 86400);
end;
$$;

-- ── Administration ──────────────────────────────────────────────────
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'active_7d', (select count(distinct user_id) from public.study_days where day >= current_date - 7),
    'premium', (select count(distinct user_id) from public.subscriptions where status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now())),
    'lessons_completed', (select count(*) from public.user_progress where status = 'completed'),
    'by_module', (select coalesce(jsonb_agg(x order by x.module_id), '[]'::jsonb) from (
        select l.module_id, count(*) filter (where up.status = 'completed') as completed, count(*) as started
        from public.user_progress up join public.lessons l on l.id = up.lesson_id group by l.module_id) x),
    'failed_payments_30d', (select count(*) from public.payment_events where received_at > now() - interval '30 days' and type in ('invoice.payment_failed', 'BILLING_ISSUE'))
  );
end;
$$;

create or replace function public.admin_list_users(p_search text default null, p_limit integer default 50)
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, premium boolean, roles text[])
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, public.has_premium(u.id),
           coalesce(array(select r.role from public.user_roles r where r.user_id = u.id), '{}')
    from auth.users u
    where p_search is null or u.email ilike '%' || p_search || '%'
    order by u.created_at desc
    limit least(p_limit, 200);
end;
$$;

-- Journal d'audit automatique des modifications de contenu et de réglages.
create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_details jsonb := null;
begin
  if tg_op = 'UPDATE' and tg_table_name = 'app_settings' then
    v_details := jsonb_build_object('old', to_jsonb(old) -> 'value', 'new', to_jsonb(new) -> 'value');
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'lesson_id', v_row ->> 'key'), v_details);
  return coalesce(new, old);
end;
$$;
create trigger audit_modules after insert or update or delete on public.modules for each row execute function public.audit_trigger();
create trigger audit_lessons after insert or update or delete on public.lessons for each row execute function public.audit_trigger();
create trigger audit_lesson_contents after insert or update or delete on public.lesson_contents for each row execute function public.audit_trigger();
create trigger audit_settings after insert or update or delete on public.app_settings for each row execute function public.audit_trigger();
create trigger audit_audio after insert or update or delete on public.audio_assets for each row execute function public.audit_trigger();

-- Le texte coranique est immuable une fois importé (seul le script d'import, en service_role, l'écrit).
create or replace function public.forbid_quran_update()
returns trigger language plpgsql as $$
begin
  raise exception 'Le texte coranique de référence ne peut pas être modifié. Réimportez le fichier Tanzil vérifié.';
end;
$$;
create trigger quran_ayat_immutable before update on public.quran_ayat for each row execute function public.forbid_quran_update();
create trigger quran_words_immutable before update on public.quran_words for each row execute function public.forbid_quran_update();

-- Conservation des données : purge des journaux de paiement de plus de 3 ans
-- (à planifier avec pg_cron, voir docs/SECURITE_ET_DONNEES.md).
create or replace function public.purge_old_data()
returns void language sql security definer set search_path = public as $$
  delete from public.payment_events where received_at < now() - interval '3 years';
  delete from public.audit_log where at < now() - interval '3 years';
  delete from public.quiz_results where created_at < now() - interval '3 years';
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_list_users(text, integer) from public, anon;
revoke execute on function public.record_attempt(text, integer, integer, text[]) from public, anon;
revoke execute on function public.touch_lesson(text, integer) from public, anon;
revoke execute on function public.import_guest_progress(jsonb) from public, anon;
revoke execute on function public.log_study(integer, date) from public, anon;
grant execute on function public.admin_stats(), public.admin_list_users(text, integer),
  public.record_attempt(text, integer, integer, text[]), public.touch_lesson(text, integer),
  public.import_guest_progress(jsonb), public.log_study(integer, date) to authenticated;
grant execute on function public.has_premium(uuid), public.is_admin(), public.is_editor(),
  public.can_read_lesson(text), public.my_entitlement() to anon, authenticated;
