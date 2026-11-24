# Contenu pédagogique, texte coranique et droits audio

## Contenu fourni

| Module | Offre | Leçons | Contenu |
|---|---|---|---|
| 1. L'alphabet | Gratuit | 8 + test | 28 lettres, noms, sons, points, familles de lettres jumelles |
| 2. Les formes | Gratuit | 4 + test | 4 positions, 6 lettres non liantes, لا, ة, ى |
| 3. Voyelles et signes | Gratuit | 8 + test | fatḥa, kasra, ḍamma, sukūn, shadda, tanwīn, voyelles longues, initiation au tajwīd |
| 4. Apprendre à lire | Gratuit | 5 + test | syllabes ouvertes/fermées, voyelles longues, shadda, article |
| 5. Vocabulaire | Gratuit | 6 + test + **examen général** | 40 mots fréquents avec racines et occurrences |
| 6. Conjugaison | Premium | 6 + test | racine, schème فَعَلَ, accompli, inaccompli, futur, impératif |
| 7. Grammaire | Premium | 6 + test | nom/verbe/particule, iḍāfa, phrases nominale et verbale, pronoms, cas |
| 8. Compréhension | Premium | 4 + test | analyse de 1:2 à 1:6 |

Source : `packages/content/src/*.ts`. Après modification : `pnpm seed`, puis exécutez `supabase/seed.sql`
(ou modifiez directement dans **Admin → Contenu**).

### Relecture obligatoire avant publication

Ce contenu a été rédigé avec rigueur mais **doit être relu par un enseignant d'arabe qualifié**, en particulier :
les descriptions articulatoires (module 1), les règles de tajwīd (3.8), les racines discutées (le nom اللَّه est
volontairement présenté sans racine), et les analyses grammaticales du module 8 (iʿrāb), où les divergences entre
grammairiens sont signalées. Une analyse grammaticale n'est pas présentée comme une interprétation religieuse.

## Texte coranique

- Source : **Tanzil Project** (tanzil.net), version 1.1, licence **CC BY 3.0** : copie autorisée **sans modification**,
  mention de la source et lien vers tanzil.net (affichés sous chaque citation).
- Lecture : **Ḥafṣ ʿan ʿĀṣim** (indiqué dans l'application). Les variantes de lecture ne sont mentionnées que lorsqu'elles
  sont vérifiées (ex. مَالِكِ / مَلِكِ en 1:4).
- Garanties techniques : le contenu ne contient **aucun verset en dur** ; une citation est une référence
  `{ surah, ayah, wordFrom?, wordTo? }` lue dans `quran_ayat` / `quran_words`. Un test automatique vérifie l'absence de texte coranique recopié,
  et la base refuse toute modification du texte importé.
- Les exemples pédagogiques (mots isolés, phrases d'exemple) sont affichés dans un cadre distinct des citations.

## Audios

- **118 enregistrements** sont nécessaires : liste, chemin suggéré et leçons concernées dans `docs/AUDIOS_A_ENREGISTRER.csv`.
- N'utilisez **que des enregistrements dont vous détenez les droits commerciaux** : le plus simple est de les faire enregistrer
  par un enseignant ou un récitant, avec un contrat de cession de droits signé.
- Les récitations de sites existants (ex. récitations de versets complets) ne sont **pas** libres de droits par défaut : obtenez une autorisation écrite.
- Téléversement : **Admin → Audios**. Les champs licence et preuve des droits sont obligatoires (contrôle en base).
- Format conseillé : AAC (.m4a) mono 64 kb/s, 0,3 s de silence avant/après, voix claire, sans musique ni effet.
- Espace `audio-public` pour les modules 1 à 5, `audio-premium` (URL signées, abonnés seulement) pour 6 à 8.
- Tant qu'un audio manque, l'application affiche « Enregistrement bientôt disponible » ; aucun son n'est simulé ni généré.
