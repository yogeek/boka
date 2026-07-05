# Point de restauration — Film « Encre & essence »

> Journal de décision et point de reprise. Date : **2026-07-05**.
> À lire avec le spec `specs/2026-07-05-film-encre-essence-design.md` et le plan `plans/2026-07-05-film-encre-essence.md`.

## État actuel (ce qui est committé)

- **Branche :** `feat/film-encre-essence` — **poussée**, **PR #1 ouverte** vers `main` (https://github.com/yogeek/boka/pull/1). Worktree conservé pour itérer sur les retours.
- **Dernier commit :** `2d3748f` — « Fix film : l'huile de l'alambic reste ambrée (plan E régénéré) ». Précédents : `fb04592` (effet buvard), `47e63ae` (point de restauration), `9bf2e02` (5 plans enchaînés).
- **Variante retenue et exécutée : run 5 plans compressé** (~52 cr consommés), dans le budget.
- **Livrables :**
  - `site/film.html` + `site/assets/exp/film.{js,css}` : scrub d'une séquence d'images sur canvas 2D, overlay grain + vignette, repli `experience.html` (WebGL2) si reduced-motion / pas de canvas / échec de frame.
  - `site/assets/film/avif/` : 302 frames `f_0001..f_0302` (AVIF 720p, ~5,3 Mo, dans le budget poids).
  - `site/assets/film/webp/` : 302 frames de repli (WebP, ~12 Mo).
  - `site/assets/film/grain.png` + `manifest.json` (`count:302, pattern:f_%04d, fps:8, 1280x720`).
  - `scripts/build-film-frames.sh` : post-prod générique 5 clips → master (fondus encre 0,6 s) → frames AVIF+WebP + manifeste. Params par env : `FPS` (déf. 8), `AVIF_Q` (déf. 44), `WEBP_Q` (déf. 66).
- **Ordre du parcours (5 plans) :** A ciel→terre, C terre→cœur, D cœur→alambic, E alambic→goutte, B goutte→flacon.
- **Sources brutes (hors dépôt, scratchpad) :** clips mp4, keyframes et PNG restent dans le scratchpad de session, jamais committés. Seules les frames finales sont dans le dépôt.

## Point de restauration : revenir au storyboard 8 plans

Le spec (§3 et §6) décrit un **storyboard complet à 8 plans**, une seule descente continue, choisi comme la version « riche » mais **mise de côté faute de budget crédits**. Pour y revenir :

| # | Plan | Contenu |
|---|------|---------|
| 1 | Le ciel | Mer de nuages sur les hauts, lumière dorée, lavis aquarelle. |
| 2 | (descente) | Transition ciel → relief. |
| 3 | La terre | Arrivée sur les hauts de la Chaloupe. |
| 4 | Le cœur de la plante | Plongée macro dans une feuille de Géranium Bourbon Rosat. |
| 5 | L'alambic | Transport vers l'alambic en cuivre dans la vapeur. |
| 6 | La distillation | Sortie du serpentin, l'essence se sépare, une goutte se forme. |
| 7 | La goutte | La goutte ambrée se détache, tourne, tombe. |
| 8 | Le flacon | La goutte entre dans le flacon (produit final BoKa). Onde. Débouche sur la landing. |

- **Coût estimé (spec §6) :** run complet 8 plans ~82 cr (9 images-clés × 2 + 8 clips × 8, hors regénérations). Recharge visée ~130-150 cr pour avoir la marge de regénérer.
- **Le run 5 plans actuel condense** : ciel→terre (plans 1-3) et goutte→flacon (plans 7-8).
- **Pour rebasculer :** générer les images-clés manquantes (nano_banana_2), les clips intermédiaires (veo3_1_lite start/end chaînés), ajouter les fichiers clips au tableau `CLIPS` de `scripts/build-film-frames.sh` dans l'ordre 1→8, relancer le script. Le reste de la chaîne (film.html/js/css) est agnostique au nombre de plans.

## Crédits

- **Solde Higgsfield au 2026-07-05 : 21 crédits** (plan « plus »).
- Insuffisant pour le storyboard 8 plans complet → nécessiterait une recharge.
- Suffisant pour **une** regénération de clip ciblée (~8 cr) — voir retours ci-dessous.

## Retours visuels — TRAITÉS (2026-07-05)

1. ✅ **Huile → eau avant la transition.** Corrigé : keyframe de départ du plan E régénérée (huile ambrée) + clip E régénéré (veo3_1_lite), re-bake des 302 frames. Committé `2d3748f`. Vérifié sur `f_0205`.
2. ✅ **Révélation « buvard » (v1).** Masque procédural CSS en place (`film.css` `.landing.buvard`, `--reveal` piloté au scroll dans `film.js`). Committé `fb04592`. **Mais** timing à revoir, voir ci-dessous.

## Retours visuels EN ATTENTE (prochaine session)

1. **Le tuyau (condenseur) de l'alambic se transforme en liquide.** Depuis la regénération du plan E, le bras condenseur en cuivre semble fondre / se muer en filet d'huile — « dommage ». On ne voit plus l'eau (bien), mais le tuyau doit rester un tuyau en cuivre rigide ; seul le distillat qui en sort doit couler. → **Regénérer le plan E** (~8 cr, veo3_1_lite) avec un prompt qui verrouille le bras condenseur : « the copper condenser arm stays a solid rigid copper pipe, it does not melt or turn into liquid ; only the amber oil that drips from its tip flows ». Vérifier ensuite avec un contact strip 1fps de tout le clip (pas seulement la 1re frame) avant re-bake. Solde crédits à reconfirmer (`balance`).

2. **Effet buvard : le texte apparaît trop tôt.** Actuellement le texte de la landing se révèle **avant** que la goutte ne touche la zone de texte. Voulu : la goutte tombe d'abord sur la **zone de papier buvard vierge** (aucun texte visible), **s'y dissout**, et **ensuite seulement** le texte apparaît par diffusion depuis le point d'impact. → **Front-end pur** (coût crédits nul), `film.js` + `film.css` : décaler le début de `--reveal` pour qu'il ne démarre qu'au moment de l'impact de la goutte (et non quand le haut de la landing entre dans le cadre), ajouter une phase « goutte pose + dilution » avant l'ouverture du masque. Voir `textChoreography()` dans `site/assets/exp/film.js:108` (calcul de `p`/`pr`) et `.landing.buvard` dans `site/assets/exp/film.css:26`.

## Contraintes permanentes (rappel)

- Site autonome : visuels locaux, pas de Google Fonts / CDN.
- Contacts BoKa uniquement : boka.reunion+hello@gmail.com, +33 6 52 39 77 94, Instagram @bok_agriculture, Facebook (id 61572198946447). Aucun email @boka.re.
- Ne pas inventer : labels AB/HVE et points de vente à confirmer par Karène ; garder « Démarche engagée ». Date « juillet 2024 » obsolète.
- Secrets jamais committés ; mp4/keyframes bruts hors dépôt.
- Jeton API Hostinger : **révoqué** (2026-07-05). Plus d'action requise.
