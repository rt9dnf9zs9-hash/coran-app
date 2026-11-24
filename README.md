# Arabe du Coran — application d'apprentissage

Application pour apprendre, en français, à lire et comprendre l'arabe coranique.
Web installable (PWA) + Android/iOS (Expo) + backend Supabase. Modules 1 à 5 gratuits, modules 6 à 8 en abonnement annuel.

## Ce qui est livré

| Partie | Emplacement | État |
|---|---|---|
| Logique partagée (exercices, correction, progression, révisions) | `packages/core` | ✅ testée (18 tests unitaires) |
| Contenu pédagogique : 8 modules, 56 leçons, 40 mots | `packages/content` | ✅ testé — **à faire relire par un enseignant qualifié** |
| Base de données, sécurité RLS, fonctions serveur | `supabase/migrations` | ✅ testée sur PostgreSQL (43 tests de sécurité) |
| Paiements Stripe + RevenueCat (webhooks, signatures) | `supabase/functions` | ✅ logique testée (9 tests) — appels réels à Stripe non testés |
| Application web React + TypeScript | `apps/web` | ✅ testée dans Chromium (10 tests de parcours, mode découverte) |
| Espace administrateur | `apps/web/src/pages/Admin.tsx` | ⚠️ écrit, non testé contre un vrai Supabase |
| Application mobile Expo | `apps/mobile` | ⚠️ écrite, **non compilée ni testée** (voir plus bas) |
| Déploiement GitHub Pages, tests automatiques, maintien Supabase actif | `.github/workflows` | ⚠️ écrits, s'exécuteront sur GitHub |

## Coûts réels

| Service | Coût |
|---|---|
| GitHub Pages, GitHub Actions (dépôt public) | Gratuit |
| Supabase (offre gratuite : 500 Mo de base, 1 Go de fichiers, 50 000 utilisateurs actifs/mois) | Gratuit — projet mis en pause après 7 jours sans activité (la tâche `keepalive.yml` l'évite) |
| Stripe | Pas d'abonnement ; commission prélevée sur chaque paiement reçu |
| RevenueCat | Gratuit jusqu'à 2 500 $ de revenus suivis par mois |
| **Google Play** | **25 $ une fois** (obligatoire pour publier sur Android) |
| **App Store** | **99 $ par an** (obligatoire pour publier sur iPhone) |

**Sans payer les boutiques**, l'application web s'installe sur Android et iPhone comme une application
(menu du navigateur → « Ajouter à l'écran d'accueil ») et le paiement passe par Stripe.

⚠️ **GitHub Pages** : les conditions de GitHub n'autorisent pas Pages comme hébergement gratuit d'un service
principalement commercial (SaaS). Vous avez choisi de l'utiliser malgré tout : en cas de problème, la même
version se déploie sans modification sur Cloudflare Pages ou Netlify (gratuits). GitHub Pages gratuit exige
aussi un **dépôt public** (le code est visible ; aucun secret n'y figure).

## Démarrage rapide (sur votre ordinateur)

```bash
corepack enable && pnpm install
pnpm test:core          # tests logique + contenu + paiements
pnpm seed               # régénère supabase/seed.sql et le contenu embarqué
cp .env.example apps/web/.env.local   # puis renseignez l'URL et la clé « anon » Supabase
pnpm dev:web            # http://localhost:5173
```

Sans fichier `.env.local`, l'application fonctionne en **mode découverte** : parcours gratuit complet, progression gardée dans le navigateur.

## Guides

1. [Configuration Supabase, Stripe, administrateur](docs/CONFIGURATION.md)
2. [Déploiement GitHub Pages](docs/DEPLOIEMENT_GITHUB_PAGES.md)
3. [Publication Android et iOS](docs/PUBLICATION_MOBILE.md)
4. [Sécurité et données personnelles](docs/SECURITE_ET_DONNEES.md)
5. [Contenu, texte coranique et droits audio](docs/CONTENU_ET_DROITS.md)
6. [Tests](docs/TESTS.md)

## Structure

```
apps/web/            Application web (Vite + React + TS), PWA, admin
apps/mobile/         Application Expo (Android / iOS)
packages/core/       Types, correction des exercices, progression, répétition espacée, alphabet
packages/content/    Contenu des 8 modules + générateur du seed SQL
supabase/migrations/ Schéma, fonctions, RLS, stockage
supabase/functions/  Edge Functions : checkout, portail, webhooks Stripe/RevenueCat, prix, suppression de compte
supabase/tests/      Tests de sécurité SQL
scripts/             Tests base de données, import du texte Tanzil
docs/                Guides
```

## Limites connues (à lire)

- **Audios** : aucun enregistrement n'est fourni (118 sont nécessaires, liste dans `docs/AUDIOS_A_ENREGISTRER.csv`). En attendant, l'application l'indique (« Enregistrement bientôt disponible ») et les exercices d'écoute utilisent la description du son.
- **Texte coranique** : à importer depuis Tanzil (`data/tanzil/README.md`). Tant qu'il ne l'est pas, les citations affichent leur référence sans texte.
- **Contenu** : rédigé avec soin mais doit être **relu et validé par un enseignant d'arabe qualifié** avant publication (notamment les analyses du module 8).
- **Mobile** : le code n'a pas pu être compilé dans l'environnement de création (pas d'accès aux paquets Expo). Comptez une phase de mise au point lors du premier `expo run`.
- **Textes juridiques** (`Legal.tsx`, conditions de vente) : modèles à faire valider par un juriste.
