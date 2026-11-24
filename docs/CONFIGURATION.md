# Guide de configuration

Durée estimée : 1 à 2 heures. Tout est gratuit sauf mention contraire.

## 1. Supabase (base de données, comptes, fichiers audio)

1. Créez un compte sur https://supabase.com puis **New project**. Région : **Europe (Frankfurt ou Paris)** (RGPD). Notez le mot de passe de la base.
2. **Project Settings → API** : copiez
   - `Project URL` → `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
   - clé `anon public` → `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - clé `service_role` : **ne la copiez nulle part**, elle reste dans Supabase.
3. **SQL Editor** : exécutez dans l'ordre le contenu de
   1. `supabase/migrations/20261124000001_schema.sql`
   2. `supabase/migrations/20261124000002_functions.sql`
   3. `supabase/migrations/20261124000003_rls.sql`
   4. `supabase/migrations/20261124000004_storage.sql`
   5. `supabase/seed.sql` (contenu des 8 modules)

   (Alternative en ligne de commande : `npx supabase link` puis `npx supabase db push` et `psql … -f supabase/seed.sql`.)
4. **Texte coranique** : suivez `data/tanzil/README.md`, puis exécutez `supabase/quran.sql` dans le SQL Editor.
5. **Authentication → URL Configuration** :
   - Site URL : `https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/`
   - Redirect URLs : la même URL + `http://localhost:5173/`
6. **Authentication → Providers → Email** : laissez « Confirm email » activé.
   Optionnel : Google et Apple (nécessitent de créer des identifiants chez Google / Apple ; « Se connecter avec Apple » demande le compte Apple Developer payant).
7. **Authentication → Emails** : traduisez les modèles d'e-mails en français.

## 2. Devenir administrateur

Inscrivez-vous dans l'application avec votre e-mail, puis dans le SQL Editor :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'votre@email.fr';
```

L'onglet **Admin** apparaît après reconnexion. Le rôle `editor` donne accès au contenu sans les statistiques ni les utilisateurs.

## 3. Fonctions serveur (Edge Functions)

Installez la CLI : `npm i -g supabase` puis `supabase login` et `supabase link --project-ref VOTRE_REF`.

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-portal
supabase functions deploy admin-set-price
supabase functions deploy delete-account
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

Secrets (jamais dans GitHub) :

```bash
supabase secrets set APP_PUBLIC_URL=https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/
supabase secrets set APP_ORIGIN=https://VOTRE-COMPTE.github.io
supabase secrets set STRIPE_SECRET_KEY=sk_test_...        # clé TEST d'abord
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...       # étape 4.4
supabase secrets set REVENUECAT_WEBHOOK_AUTH=$(openssl rand -hex 32)   # si mobile
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement aux fonctions.

## 4. Stripe (paiement web)

Stripe n'a pas de frais fixes : il prélève une commission sur chaque paiement encaissé.

1. Créez un compte sur https://stripe.com (au nom de votre société). Restez en **mode Test** pour commencer.
2. **Developers → API keys** : copiez la clé secrète `sk_test_…` dans `STRIPE_SECRET_KEY` (étape 3).
3. **Créer le prix** : dans l'application, onglet **Admin → Prix**, saisissez le prix annuel (ex. 39,99). Cela crée le produit et le prix dans Stripe et l'enregistre dans `app_settings`. Pour le changer plus tard, refaites la même opération : aucun code à modifier.
4. **Developers → Webhooks → Add endpoint** :
   - URL : `https://VOTRE_REF.supabase.co/functions/v1/stripe-webhook`
   - Événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`
   - Copiez le « Signing secret » `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
5. **Settings → Billing → Customer portal** : activez l'annulation d'abonnement et la mise à jour du moyen de paiement.
6. **Settings → Billing → Subscriptions and emails** : activez
   - « Send emails about upcoming renewals » (rappel avant renouvellement annuel, obligation française),
   - « Send emails when card payments fail » et les relances automatiques (Smart Retries).
7. **Test** : carte `4242 4242 4242 4242`, date future, CVC quelconque. Vérifiez dans Admin → Abonnements que le statut passe à `active`. Testez aussi la carte `4000 0000 0000 0341` (paiement refusé) et un remboursement depuis le tableau de bord Stripe.
8. **Mise en production** : activez le compte Stripe, recréez le webhook en mode Live, remplacez les secrets par les clés `sk_live_…` / `whsec_…`, puis refaites Admin → Prix (les prix Test et Live sont distincts).

## 5. Variables publiques de l'application web

Dans GitHub : **Settings → Secrets and variables → Actions → Variables** :
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (la clé « anon » est publique par conception : la sécurité repose sur les règles RLS testées).

## 6. Audios

Voir `docs/CONTENU_ET_DROITS.md`. Téléversement depuis **Admin → Audios** (licence et preuve des droits obligatoires).

## 7. Tâches planifiées (facultatif)

Purge des données anciennes (3 ans) avec pg_cron (**Database → Extensions → pg_cron**) :

```sql
select cron.schedule('purge-mensuelle', '0 3 1 * *', 'select public.purge_old_data()');
```
