-- ════════════════════════════════════════════════════════════════════
-- Schéma principal — Application d'apprentissage de l'arabe coranique
-- ════════════════════════════════════════════════════════════════════

-- ── Comptes ──────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  daily_goal_min smallint not null default 10 check (daily_goal_min between 5 and 60),
  arabic_font text not null default 'amiri' check (arabic_font in ('amiri', 'scheherazade')),
  arabic_scale numeric(3, 2) not null default 1.40 check (arabic_scale between 1.0 and 3.0),
  translit_mode text not null default 'progressive' check (translit_mode in ('always', 'progressive', 'hidden')),
  audio_rate numeric(3, 2) not null default 1.00 check (audio_rate in (0.5, 0.75, 1.0)),
  age_bracket text check (age_bracket in ('under15', '15_17', '18_plus')),
  parental_consent boolean not null default false,
  onboarding jsonb not null default '{}'::jsonb,
  reminders_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  primary key (user_id, role)
);

-- ── Contenu pédagogique ─────────────────────────────────────────────
create table public.courses (
  id smallint primary key,
  slug text not null unique,
  title_fr text not null
);

create table public.modules (
  id smallint primary key,
  course_id smallint not null references public.courses (id),
  position smallint not null,
  title_fr text not null,
  subtitle_fr text not null default '',
  tier text not null check (tier in ('free', 'premium')),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Métadonnées de leçon : visibles par tous (pour afficher le parcours, y compris Premium).
create table public.lessons (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  module_id smallint not null references public.modules (id) on delete cascade,
  position smallint not null,
  title_fr text not null,
  objective_fr text not null default '',
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  est_minutes smallint not null default 5,
  kind text not null default 'lesson' check (kind in ('lesson', 'module_test', 'final_exam')),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, position);

-- Contenu complet (étapes, exercices, corrigés) : protégé par RLS selon l'offre.
create table public.lesson_contents (
  lesson_id text primary key references public.lessons (id) on delete cascade,
  content jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.vocabulary (
  id text primary key,
  arabic text not null,
  transliteration text not null,
  meaning_fr text not null,
  root text,
  note_fr text,
  quran_ref jsonb,
  updated_at timestamptz not null default now()
);

-- Table de correspondance clé audio → fichier, avec preuve des droits.
create table public.audio_assets (
  key text primary key check (key ~ '^[a-z]+:[a-z0-9_-]+$'),
  bucket text not null check (bucket in ('audio-public', 'audio-premium')),
  storage_path text not null,
  duration_ms integer check (duration_ms > 0),
  speaker text not null,
  license text not null check (char_length(license) > 3),
  rights_proof text not null check (char_length(rights_proof) > 3),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

-- ── Texte coranique de référence (Tanzil, importé tel quel) ─────────
create table public.quran_ayat (
  surah smallint not null check (surah between 1 and 114),
  ayah smallint not null check (ayah >= 1),
  text_uthmani text,
  text_simple text,
  source text not null,
  primary key (surah, ayah)
);

create table public.quran_words (
  surah smallint not null,
  ayah smallint not null,
  word_index smallint not null check (word_index >= 1),
  text text not null,
  primary key (surah, ayah, word_index),
  foreign key (surah, ayah) references public.quran_ayat (surah, ayah) on delete cascade
);

create table public.quran_import_log (
  id bigserial primary key,
  source text not null,
  file_sha256 text not null,
  ayat_count integer not null,
  imported_at timestamptz not null default now()
);

-- ── Apprentissage ───────────────────────────────────────────────────
create table public.user_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  status text not null check (status in ('started', 'completed', 'to_review')),
  best_score numeric(4, 3) not null default 0 check (best_score between 0 and 1),
  attempts integer not null default 0,
  step_index smallint not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index user_progress_user_idx on public.user_progress (user_id, updated_at desc);

create table public.quiz_results (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  kind text not null,
  correct smallint not null check (correct >= 0),
  total smallint not null check (total > 0 and correct <= total),
  score numeric(4, 3) generated always as (correct::numeric / total) stored,
  missed_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index quiz_results_user_idx on public.quiz_results (user_id, created_at desc);

create table public.review_schedule (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 80),
  ease numeric(4, 2) not null default 2.5 check (ease between 1.3 and 3.0),
  interval_days integer not null default 0 check (interval_days >= 0),
  reps integer not null default 0,
  lapses integer not null default 0,
  due timestamptz not null default now(),
  last_result text check (last_result in ('good', 'again')),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index review_due_idx on public.review_schedule (user_id, due);

create table public.study_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);

-- ── Abonnements et paiements ────────────────────────────────────────
create table public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique
);

create table public.subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'app_store', 'play_store')),
  provider_ref text not null,
  product_id text,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired', 'refunded', 'revoked', 'incomplete')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index subscriptions_user_idx on public.subscriptions (user_id);

-- Journal idempotent des webhooks : un événement n'est traité qu'une fois.
create table public.payment_events (
  id bigserial primary key,
  provider text not null check (provider in ('stripe', 'revenuecat')),
  event_id text not null,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

-- ── Configuration et audit ──────────────────────────────────────────
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  at timestamptz not null default now()
);
create index audit_log_at_idx on public.audit_log (at desc);

insert into public.app_settings (key, value, is_public) values
  ('premium_price', '{"amount_cents": 3999, "currency": "eur", "interval": "year", "display": "39,99 €", "stripe_price_id": null}', true),
  ('legal', '{"renewal_notice_days": 30, "support_email": "support@exemple.fr"}', true);
