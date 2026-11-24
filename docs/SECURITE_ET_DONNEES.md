# Sécurité et données personnelles

## Principes

1. **Le Premium ne dépend jamais du navigateur.** Le contenu des modules 6 à 8 est servi par la base uniquement si
   `has_premium(auth.uid())` est vrai. Cette fonction lit la table `subscriptions`, qui n'est **écrite que par les webhooks**
   (Stripe, RevenueCat) avec la clé `service_role`. Modifier le JavaScript, le stockage local ou une requête ne donne rien.
2. **Une leçon n'est acquise que via le serveur** : `record_attempt` vérifie que le nombre d'exercices correspond à la leçon,
   calcule le statut (80 % requis) et refuse les leçons Premium sans abonnement. L'écriture directe dans `user_progress` est interdite.
3. **Le retour sur la page de confirmation de paiement n'accorde rien** : la page attend la confirmation du webhook.
4. **Aucune clé secrète dans le code** : Stripe et `service_role` sont des secrets Supabase ; seule la clé `anon` (publique) est dans l'app.
5. **Webhooks** : signature Stripe vérifiée (HMAC-SHA256, tolérance 5 min contre le rejeu), jeton RevenueCat comparé à temps constant,
   **idempotence** par la table `payment_events` (`unique(provider, event_id)`) : un événement reçu deux fois n'est traité qu'une fois.
6. **Administration** : rôles dans `user_roles`, attribués uniquement en SQL ; toutes les écritures de contenu sont vérifiées par RLS (`is_editor()`)
   et journalisées dans `audit_log`.
7. **Texte coranique immuable** : déclencheurs qui refusent toute modification de `quran_ayat` / `quran_words`.

Tests : `bash scripts/test-db.sh` (43 vérifications, dont toutes les tentatives de contournement ci-dessus).

## Données personnelles (RGPD)

| Donnée | Finalité | Conservation |
|---|---|---|
| E-mail, mot de passe chiffré | Compte | Jusqu'à suppression du compte |
| Progression, résultats, révisions, temps d'étude | Service | Jusqu'à suppression du compte ; résultats de tests purgés après 3 ans |
| Tranche d'âge, accord parental | Protection des mineurs (consentement parental avant 15 ans en France) | Jusqu'à suppression |
| Abonnements, événements de paiement | Facturation, obligations comptables | 3 ans pour les journaux de paiement (`purge_old_data`) |

- Hébergement : choisissez une **région européenne** dans Supabase.
- Pas de publicité, pas de SDK de suivi : l'usage d'une application coranique peut révéler des convictions religieuses (donnée sensible, article 9 du RGPD).
- Droits : export (Profil → Télécharger mes données), suppression (Profil → Supprimer mon compte : suppression en cascade).
- À faire par vous : registre des traitements, mentions légales (éditeur : votre société), validation des modèles de textes juridiques par un professionnel.

## Obligations liées à l'abonnement (France) — à faire valider par un juriste

- Résiliation en ligne simple : portail client Stripe (web), réglages de la boutique (mobile).
- Information avant reconduction tacite : e-mails de rappel Stripe (à activer, voir CONFIGURATION.md §4.6).
- Droit de rétractation pour contenu numérique : texte de renonciation affiché sur la page de paiement Stripe.
