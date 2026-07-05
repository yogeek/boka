# Point de restauration — Film « Encre & essence »

> Journal de décision et point de reprise. Date : **2026-07-05**.
> À lire avec le spec `specs/2026-07-05-film-encre-essence-design.md` et le plan `plans/2026-07-05-film-encre-essence.md`.

## État actuel (ce qui est committé)

- **Branche :** `feat/film-encre-essence` (non mergée, non poussée).
- **Dernier commit :** `9bf2e02` — « Phase 1 film : 5 plans enchaînés (ciel → terre → cœur → alambic → goutte → flacon) ».
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

## Retours visuels en attente (2026-07-05)

1. **Huile → eau avant la transition.** L'huile qui coule de l'alambic devient de l'eau juste avant la transition ; elle devrait rester huile (ambrée, visqueuse). → Défaut de génération dans le clip **E (alambic→goutte)** ou **B (goutte→flacon)**. Correctif : regénérer le clip fautif (~8 cr) avec un prompt insistant sur l'huile ambrée visqueuse, translucide dorée, pas d'eau claire.

2. **Révélation « buvard » en fin de film.** La goutte qui tombe disparaît derrière le bas de page (« Rencontre »). Voulu : la dilution aquarelle de la goutte fait apparaître la suite de la page, comme un buvard sur lequel tombe un liquide et d'où sortent les mots. → **Effet front-end** (transition canvas → DOM landing, masque/`mask-image` en tache d'encre qui grandit, texte révélé par la diffusion). Coût crédits faible ou nul ; une texture de diffusion aquarelle peut optionnellement être générée (~2 cr) mais un masque procédural CSS/canvas suffit.

## Contraintes permanentes (rappel)

- Site autonome : visuels locaux, pas de Google Fonts / CDN.
- Contacts BoKa uniquement : boka.reunion+hello@gmail.com, +33 6 52 39 77 94, Instagram @bok_agriculture, Facebook (id 61572198946447). Aucun email @boka.re.
- Ne pas inventer : labels AB/HVE et points de vente à confirmer par Karène ; garder « Démarche engagée ». Date « juillet 2024 » obsolète.
- Secrets jamais committés ; mp4/keyframes bruts hors dépôt.
