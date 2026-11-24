-- ════════════════════════════════════════════════════════════════════
-- Row Level Security : toutes les tables sont fermées par défaut.
-- Les écritures sensibles passent par des fonctions SECURITY DEFINER
-- ou par les Edge Functions (service_role, qui contourne RLS).
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.vocabulary enable row level security;
alter table public.audio_assets enable row level security;
alter table public.quran_ayat enable row level security;
alter table public.quran_words enable row level security;
alter table public.quran_import_log enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_results enable row level security;
alter table public.review_schedule enable row level security;
alter table public.study_days enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

-- Profils : chacun le sien ; l'admin peut lire.
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Rôles : lecture de ses propres rôles. Attribution uniquement en SQL (service_role), jamais depuis l'app.
create policy roles_select on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Catalogue : public (y compris titres des leçons Premium, pour afficher le parcours).
create policy courses_read on public.courses for select to anon, authenticated using (true);
create policy modules_read on public.modules for select to anon, authenticated using (published or public.is_editor());
create policy lessons_read on public.lessons for select to anon, authenticated using (
  (published and exists (select 1 from public.modules m where m.id = module_id and m.published)) or public.is_editor());

-- Contenu complet : gratuit pour tous, Premium seulement avec un abonnement actif.
create policy lesson_contents_read on public.lesson_contents for select to anon, authenticated using (public.can_read_lesson(lesson_id));

-- Écriture du contenu : éditeurs et administrateurs.
create policy modules_write on public.modules for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy lessons_write on public.lessons for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy lesson_contents_write on public.lesson_contents for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy vocabulary_read on public.vocabulary for select to anon, authenticated using (true);
create policy vocabulary_write on public.vocabulary for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy audio_read on public.audio_assets for select to anon, authenticated using (true);
create policy audio_write on public.audio_assets for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Texte coranique : lecture publique, aucune écriture depuis l'app.
create policy quran_ayat_read on public.quran_ayat for select to anon, authenticated using (true);
create policy quran_words_read on public.quran_words for select to anon, authenticated using (true);
create policy quran_log_read on public.quran_import_log for select to authenticated using (public.is_admin());

-- Progression : lecture de la sienne ; écriture via touch_lesson / record_attempt uniquement.
create policy progress_select on public.user_progress for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy quiz_select on public.quiz_results for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy study_select on public.study_days for select to authenticated using (user_id = auth.uid());

-- Révisions : faible enjeu, l'utilisateur gère ses propres cartes.
create policy review_all on public.review_schedule for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Abonnements : lecture des siens ; écriture UNIQUEMENT par les webhooks (service_role).
create policy subs_select on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy billing_select on public.billing_customers for select to authenticated using (user_id = auth.uid());
create policy payment_events_admin on public.payment_events for select to authenticated using (public.is_admin());

-- Réglages : les clés publiques (prix affiché, mentions) sont lisibles par tous ; modification admin.
create policy settings_read on public.app_settings for select to anon, authenticated using (is_public or public.is_admin());
create policy settings_write on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audit_admin on public.audit_log for select to authenticated using (public.is_admin());

-- Privilèges de base (Supabase accorde déjà l'usage du schéma ; on restreint aux opérations prévues).
revoke all on all tables in schema public from anon, authenticated;
grant select on public.courses, public.modules, public.lessons, public.lesson_contents, public.vocabulary,
  public.audio_assets, public.quran_ayat, public.quran_words, public.app_settings to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles, public.user_progress, public.quiz_results, public.study_days,
  public.subscriptions, public.billing_customers, public.payment_events, public.audit_log, public.quran_import_log to authenticated;
grant select, insert, update, delete on public.review_schedule to authenticated;
grant insert, update, delete on public.modules, public.lessons, public.lesson_contents, public.vocabulary, public.audio_assets to authenticated;
grant update on public.app_settings to authenticated;
-- Colonnes du profil modifiables par l'utilisateur (pas d'élévation possible) :
revoke update on public.profiles from authenticated;
grant update (display_name, daily_goal_min, arabic_font, arabic_scale, translit_mode, audio_rate, age_bracket, parental_consent, onboarding, reminders_enabled) on public.profiles to authenticated;
