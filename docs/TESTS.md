# Tests

| Commande | Ce qui est vérifié | Résultat lors de la livraison |
|---|---|---|
| `pnpm test:core` | Alphabet, formes, correction et explications des exercices, seuil de 80 %, fusion de progression entre appareils, droits gratuit/Premium, expiration, répétition espacée ; contenu (8 modules, identifiants uniques, chaque exercice valide et corrigé, aucun verset en dur) ; signatures Stripe, rejeu, statuts d'abonnement, événements RevenueCat | **27 / 27 réussis** |
| `pnpm test:db` | Migrations + seed sur PostgreSQL, puis 43 tentatives d'accès : anonyme, gratuit, Premium, expiré, remboursé, administrateur, contournements (s'attribuer un abonnement, devenir admin, écrire « acquis », changer le prix, lire du Premium, modifier le Coran) | **43 / 43 réussis** |
| `pnpm test:e2e` | Dans Chromium (mobile 390 px et ordinateur 1280 px) : accueil, questionnaire, leçon complète réussie, leçon ratée avec corrections, révisions, progression, distinction gratuit/Premium, page d'offre, RTL, thème, aucune erreur JavaScript | **10 / 10 réussis** |

## Non testé lors de la livraison (environnement sans accès aux services externes)

- Appels réels à Supabase Auth (inscription, e-mails, réinitialisation), Storage, Edge Functions déployées.
- Paiements Stripe réels (mode Test) et achats intégrés RevenueCat : suivez la recette de `CONFIGURATION.md §4.7`.
- Application mobile : compilation et tests sur appareils Android / iPhone.
- Rendu avec les polices Amiri / Scheherazade (chargées depuis Google Fonts, inaccessible pendant les tests : la police de secours a été utilisée).

## Recette manuelle conseillée après configuration

1. Inscription → e-mail de confirmation → connexion → la progression du mode découverte est reprise.
2. Leçon sur ordinateur, reprise sur téléphone (même compte) au même endroit.
3. Achat test Stripe → accès module 6 sur le web **et** sur le téléphone.
4. Résiliation via le portail → accès conservé jusqu'à la date de fin.
5. Remboursement total dans Stripe → accès retiré immédiatement.
6. Compte gratuit : ouvrir `#/lecon/m6l1` → offre Premium, aucun contenu.
7. Mode avion pendant une leçon gratuite → bandeau « Hors ligne », synchronisation au retour.
