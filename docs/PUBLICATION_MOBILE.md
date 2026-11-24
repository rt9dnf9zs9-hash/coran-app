# Publication Android et iOS

## Frais obligatoires (impossibles à éviter)

| Boutique | Frais | Commission sur les abonnements |
|---|---|---|
| Google Play | 25 $ une seule fois | 15 % sur les abonnements |
| App Store | 99 $ par an | 15 % (programme Small Business, sur demande) à 30 % |

**Alternative gratuite** : l'application web installable (PWA). Sur Android (Chrome) : menu ⋮ → « Installer l'application ». Sur iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».

## État du code mobile

Le code `apps/mobile` est complet (navigation, leçons, exercices, audio, comptes, achats, suppression de compte)
mais **n'a pas été compilé** dans l'environnement où il a été écrit. Prévoyez une phase de mise au point.

## 1. Préparer le projet

```bash
cd apps/mobile
pnpm install
npx expo install --fix         # aligne les versions sur votre SDK Expo
```

Créez `apps/mobile/.env` :

```
EXPO_PUBLIC_SUPABASE_URL=https://VOTRE_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
EXPO_PUBLIC_WEB_URL=https://VOTRE-COMPTE.github.io/coran-app/
APP_BUNDLE_ID=fr.votredomaine.arabeducoran
```

`APP_BUNDLE_ID` est l'identifiant définitif de l'application (ne peut plus changer après publication).

Les achats intégrés (RevenueCat) ne fonctionnent pas dans Expo Go : utilisez un **build de développement** :

```bash
npm i -g eas-cli && eas login
eas init                                   # crée le projet EAS (gratuit), renseigne EAS_PROJECT_ID
eas build --profile development --platform android
```

Le service de build EAS a une offre gratuite avec un nombre limité de builds par mois.

## 2. Abonnements dans les boutiques

**Google Play Console** (après paiement des 25 $) :
1. Créez l'application, remplissez la fiche, la politique de confidentialité (URL `…/#/confidentialite`), le questionnaire « Sécurité des données » et la classification du contenu.
2. **Monétiser → Abonnements** : créez `premium_annual`, période 1 an, prix en euros.

**App Store Connect** (après paiement des 99 $) :
1. Créez l'application avec le même identifiant.
2. **Abonnements** : groupe « Premium », produit `premium_annual`, durée 1 an.
3. Remplissez les informations de confidentialité et l'accord « Paid Apps ».

**RevenueCat** (gratuit jusqu'à 2 500 $/mois) :
1. Créez le projet, ajoutez les applications iOS et Android (clés de service des boutiques).
2. Entitlement `premium` ← produits `premium_annual` ; Offering `default` avec un package **Annual**.
3. **Integrations → Webhooks** : URL `https://VOTRE_REF.supabase.co/functions/v1/revenuecat-webhook`, en-tête Authorization = `Bearer <REVENUECAT_WEBHOOK_AUTH>`.
4. Copiez les clés publiques SDK dans `.env`.

Les droits Premium achetés sur mobile apparaissent aussi sur le web (même compte), et inversement.

## 3. Construire et publier

```bash
eas build --platform android --profile production   # fichier .aab
eas submit --platform android                        # piste de test interne
eas build --platform ios --profile production
eas submit --platform ios                            # puis TestFlight
```

## 4. Conditions de publication à respecter (déjà prévues dans le code)

- Suppression du compte depuis l'application (Profil).
- Bouton « Restaurer mes achats » (Profil et Premium).
- Prix, durée, renouvellement automatique et résiliation affichés avant l'achat.
- Paiement des contenus numériques via le système de la boutique (pas de lien vers Stripe dans l'app mobile).
- « Se connecter avec Apple » obligatoire sur iOS **si** vous proposez Google : l'écran mobile actuel ne propose que l'e-mail, ce qui est conforme.
- Politique de confidentialité accessible (lien dans Profil).
