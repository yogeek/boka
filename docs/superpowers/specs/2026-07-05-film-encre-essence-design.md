# BoKa · Film « Encre & essence » — Design

Date : 2026-07-05
Statut : validé (design), prototype à produire avant run complet

## 1. Objectif

Créer une seconde variante cinématique de la landing BoKa, plus « marketing video » : le visiteur vit, en scrollant, tout le processus qui mène à l'apparition d'une goutte d'huile essentielle de Géranium Bourbon Rosat, du ciel au flacon. Objectif de qualité : quasi-professionnel (« award winning »).

Cette variante vit **à côté** de `experience.html` (le rendu WebGL2 actuel), qui reste le repli autonome. Elle ne remplace rien.

## 2. Direction artistique : « Encre & essence »

Rendu stylisé / artistique (pas de faux photo-réalisme de la vraie ferme, cohérent avec la contrainte « ne pas inventer »). Fil conducteur visuel : **le pigment qui diffuse dans un liquide**. Le ciel est un lavis d'aquarelle, le champ se « peint » par capillarité, la vapeur de l'alambic se condense comme de l'encre à l'envers.

Palette dérivée des tokens existants :
- Géranium `#c15f7c` / `#f4c9d4`
- Crème `#f8f4ec`
- Cuivre / forêt `#2f4a34`

La diffusion d'encre est la **signature** de l'expérience et sert aussi de style de transition entre plans.

## 3. Storyboard — 8 plans, une seule descente continue

Un seul mouvement descendant, du ciel à la goutte, sans coupure perçue. Chaque plan part de l'image-clé N et finit sur l'image-clé N+1 (raccords parfaits par construction).

| # | Plan | Sujet | Caméra & effet |
|---|------|-------|----------------|
| 1 | Le ciel | Mer de nuages sur les hauts, lumière dorée, lavis aquarelle. Titre BoKa émerge. | Push-in lent, amorce de descente |
| 2 | La descente | Plongée verticale à travers les nuages vers les terrasses vertes de la Chaloupe. | Dolly vertical accélérant ; nuages diffusant comme de l'encre |
| 3 | La terre | Arrivée au-dessus des rangs de géranium, le terroir familial. | Glissé avant ; le champ se peint par capillarité |
| 4 | Le cœur de la plante | Plongée macro dans une feuille de Géranium Bourbon Rosat (nervures, poils, glandes). | Push-in macro + légère orbite ; illustration botanique qui s'anime |
| 5 | L'alambic | Transport vers l'alambic en cuivre dans la vapeur. | Révélation en orbite ; la vapeur condense |
| 6 | La distillation | Sortie du serpentin, l'essence se sépare, une goutte se forme. | Ralenti, push vers la goutte naissante |
| 7 | La goutte | Ralenti extrême : la goutte ambrée se détache, tourne, tombe. | Suivi de chute + orbite légère ; éclat chromatique |
| 8 | Le flacon | La goutte entre dans le flacon (produit final BoKa). Onde. | Léger recul révélant le flacon = atterrissage vers le contenu |

Le plan 8 débouche sur la « landing » (grille produits, contact, footer) — même structure et même contenu que `experience.html`, donc rien de perdu côté contenu ni SEO.

Les beats de texte existants se calent sur les plans (« Une terre, une famille » → 3 ; « Bourbon Rosat » → 4 ; « Une goutte, toute la Chaloupe » → 6-7).

## 4. Architecture technique

Nouvelle page `site/film.html`, sœur de `experience.html`.

- **Rendu** : `<canvas>` fixe plein écran. Le scroll pilote un index de frame (`scrollY → t → frameIndex`) et on peint la frame d'une **séquence d'images** préchargée (technique scroll-scrubbed, Apple/Awwwards).
- **Séquence** : ~200 frames pour tout le voyage, en **local** dans `site/assets/film/` (contrainte « site autonome », aucun CDN). Cible poids : 3-6 Mo (AVIF ~15-25 Ko/frame ; fallback WebP).
- **Préchargement** : ~20 premières frames en priorité, reste en lazy-load progressif. Manifeste JSON listant les frames.
- **Texte + rail** : réutilisation du moteur de `experience.js` (t lissé lerp, chorégraphie de texte par distance au centre, rail de progression). Fichier JS dédié `film.js` dérivé de `experience.js`.
- **Overlay grain / vignette / dissolution d'encre** : passe légère (canvas 2D ou mini-shader) par-dessus la frame, **dès la v1**. Grain fin animé + vignette douce pour lier les plans et donner le grain « pellicule ».
- **Format** : paysage **16:9**, frames exportées en **720p** (1280×720).
- **Repli** : `prefers-reduced-motion`, support absent, ou frames en échec de chargement → redirection propre vers `experience.html` (qui a déjà son repli statique). Aucune régression, autonomie totale.

## 5. Pipeline de génération (Higgsfield CLI)

Piloté depuis bash, plan par plan, jugé ensemble, regénéré au besoin. La CLI est authentifiée (`hf auth login` fait) et le workspace « Private » est sélectionné.

1. **Images-clés** — modèle `nano_banana_2` (2 cr/image, 16:9). Une image « encre & essence » par frontière de plan. On juge le look ici (peu cher) avant la vidéo.
2. **Clips** — modèle `veo3_1_lite` (8 cr le plan de 8s, 16:9). Chaque clip : `--start-image` = image-clé N, `--end-image` = image-clé N+1. Prompt = mouvement caméra + effet (push-in, dolly, orbite, ralenti). Contrainte modèle : durée forcée à 8s quand start et end sont tous deux fournis.
3. **Post-production** — ffmpeg local (gratuit) : extraction frames, léger retiming, fondus d'encre aux jonctions, export AVIF optimisé + génération du manifeste.
4. **Intégration** — frames dans `site/assets/film/`, `film.html` + `film.js`. Commit.

Modèles retenus après inspection des coûts réels (workspace « Private », 84 crédits) :
- `nano_banana_2` : 2 cr/image
- `veo3_1_lite` 8s : 8 cr
- (alternatives plus chères écartées pour le prototype : `seedance1_5` 720p 9,6 cr / 1080p 24 cr ; `veo3_1` basic 22 cr)

## 6. Budget et phasage

Budget disponible : **84 crédits**. Le run complet 8 plans coûte ~82 cr (9 images-clés × 2 + 8 clips × 8), sans marge d'itération. Décision : **procéder en prototype d'abord**.

**Phase 0 — Prototype (~24 cr : 4 images-clés × 2 + 2 clips × 8, hors regénérations)** :
- Générer 2 plans aux extrêmes : **ciel → terre** (plans 1-3 condensés) et **goutte → flacon** (plans 7-8).
- Construire `film.html` + `film.js` + pipeline ffmpeg de bout en bout sur ces 2 plans.
- Valider : look « encre & essence », qualité des raccords via chaînage start/end, fluidité du scrub, poids des frames.

**Décision post-prototype** (sur pièces réelles) :
- Soit **run 5 plans compressé** (~52 cr + marge) dans le budget actuel.
- Soit **recharge de crédits** (~130-150 cr visés) pour le storyboard 8 plans complet avec marge d'itération.

## 7. Contraintes projet (rappel, non négociables)

- **Autonomie** : visuels et polices en local, aucun Google Fonts / CDN. Les frames générées sont committées dans `site/assets/film/`.
- **Ne pas inventer** : pas de claim sur les labels AB/HVE ni les points de vente (à confirmer par Karène) ; garder « Démarche engagée » ; la date « juillet 2024 » est obsolète. Le rendu stylisé évite tout faux réalisme de la ferme.
- **Contacts BoKa uniquement** : boka.reunion+hello@gmail.com, +33 6 52 39 77 94, Instagram @bok_agriculture, Facebook (profile id 61572198946447). Aucun email @boka.re.
- **Sécurité** : ne jamais committer de secret ; le jeton API Hostinger collé en clair précédemment reste à révoquer par l'utilisateur.
- **Style** : français, pas de tirets cadratins.
- **Git** : trailer de commit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## 8. Critères de succès

- Le scroll donne l'illusion d'une descente continue et fluide du ciel au flacon, sans effet diaporama.
- Le rendu « encre & essence » est reconnaissable et cohérent d'un plan à l'autre.
- Page autonome (aucune requête externe), poids frames 3-6 Mo, dégradation propre vers `experience.html`.
- Contenu et contacts inchangés, aucune invention.

## 9. Décisions tranchées

- Format : paysage **16:9**.
- Résolution des frames : **720p** (1280×720), à confirmer sur le poids réel au prototype.
- Overlay grain/vignette : **v1**.
