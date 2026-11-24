# Déploiement de la version web sur GitHub Pages

## Avertissement

Les conditions d'utilisation de GitHub indiquent que Pages ne doit pas servir d'hébergement gratuit à un
service principalement commercial (SaaS, e-commerce). Une application avec abonnement peut entrer dans ce cas.
Vous avez choisi GitHub Pages en connaissance de cause. Si GitHub vous le demande, déployez le même dossier
`apps/web/dist` sur **Cloudflare Pages** ou **Netlify** (gratuits, usage commercial autorisé) : aucune modification
de code n'est nécessaire, seulement `VITE_BASE_PATH=/`.

GitHub Pages gratuit nécessite un **dépôt public**.

## Organisation du dépôt

Envoyez tout le dossier du projet dans un dépôt GitHub (par exemple `coran-app`), branche `main`.
Les fichiers `.env*` sont exclus par `.gitignore` : vérifiez qu'aucun secret n'est envoyé.

```bash
git init && git add . && git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/coran-app.git
git push -u origin main
```

## Configuration (une seule fois)

1. **Settings → Pages → Build and deployment → Source** : `GitHub Actions`.
2. **Settings → Secrets and variables → Actions → Variables** (onglet *Variables*, pas *Secrets*) :
   - `VITE_SUPABASE_URL` = `https://VOTRE_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clé `anon public`
3. **Supabase → Authentication → URL Configuration** : Site URL = `https://VOTRE-COMPTE.github.io/coran-app/`.
4. Secret `APP_PUBLIC_URL` des Edge Functions = la même URL.

## Fonctionnement

- Le fichier `.github/workflows/deploy-pages.yml` lance les tests, construit l'application et la publie à chaque `git push` sur `main`.
- **Chemin de base** : `VITE_BASE_PATH` est automatiquement `/<nom-du-depot>/`. Avec un domaine personnalisé, remplacez-le par `/` dans le workflow.
- **Routes** : l'application utilise des adresses en `#/…` (ex. `…/coran-app/#/lecon/m1l1`). Elles fonctionnent sur GitHub Pages sans configuration serveur ; un `404.html` identique à `index.html` est aussi publié.
- **Fichier de build** : `apps/web/vite.config.ts` ; sortie dans `apps/web/dist`.

## Mise à jour

Modifiez le code, puis :

```bash
pnpm test:core && pnpm seed
git add . && git commit -m "Description de la modification" && git push
```

Le site est mis à jour en 2 à 3 minutes (onglet **Actions** pour suivre). Les modifications de contenu faites dans
**Admin** sont immédiates et ne nécessitent pas de redéploiement.

## Ce qui n'est PAS sur GitHub Pages

Base de données, comptes, fichiers audio et fonctions serveur sont sur **Supabase** ; les paiements sur **Stripe**.
Ils se configurent séparément (`docs/CONFIGURATION.md`).
