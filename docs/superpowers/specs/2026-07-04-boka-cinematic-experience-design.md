# Spec : « BoKa · L'Expérience » — landing cinématique 3D scroll

**Date** : 2026-07-04
**Statut** : validé (brainstorming avec Guillaume)
**Fichier cible** : `site/experience.html` (page séparée, la `index.html` actuelle reste la version pragmatique)

## Objectif

Créer une seconde landing page immersive de type « award site » (inspiration Awwwards) : une
descente cinématique dans les hauts de la Chaloupe pilotée par le scroll, qui raconte BoKa
(terre, famille, agroécologie, Géranium Bourbon Rosat) tout en gardant l'identité de marque
existante (palette forêt / rose géranium / crème, titres serif, ton sobre et vrai).

La page est **autonome et complète** : produits, labels, partenaires et contact intégrés.
Si Karène la préfère, elle pourra remplacer `index.html` sans perte de contenu.

## Décisions actées

| Décision | Choix |
|---|---|
| Placement | Page séparée `site/experience.html`, lien discret croisé entre les deux versions |
| Narratif | « Descente dans la Chaloupe » : ciel → vallée → champs → héritage → alambic → goutte d'essence → contact |
| Assets | Hybride : moteur WebGL maison + photos réelles + 4 visuels IA (Higgsfield MCP, modèle le plus cinématique) avec fallback procédural |
| Moteur | WebGL2 écrit à la main, zéro dépendance (pas de CDN, pas de lib vendorée), conforme à la contrainte « site autonome » de AGENTS.md |
| Contenu | Standalone complet (produits, labels « démarche engagée », partenaires, contact, JSON-LD) |
| Audio | Aucun (poids, autonomie, YAGNI) |

## Le parcours de scroll (7 scènes, ~700vh)

Le scroll est la seule entrée. Une timeline globale `t ∈ [0,1]` est dérivée de `scrollY`
lissé (lerp), chaque scène possède un sous-intervalle avec ses easings.
Un rail de progression discret (7 points) permet de sauter d'une scène à l'autre.

| # | Scène | Visuel | Texte pivot (FR) |
|---|---|---|---|
| 0 | Ciel | Brume/nuages (shader procédural + still IA nuages sur le cirque), logo BoKa émergeant du brouillard, god rays légers | « Dans les hauts de la Chaloupe… » |
| 1 | La descente | Les nuages s'écartent, vallée `hero-chaloupe.jpg` révélée en parallaxe 2.5D (calques + depth map), particules/oiseaux | « …une terre, une famille, depuis les années 1940. » |
| 2 | La terre | La caméra se pose dans les champs, calques macro `geranium.jpg`, pollen, lumière chaude | « Cultivée en agroécologie, sans aucun intrant. » |
| 3 | L'héritage | `grand-pere.jpg` traité comme un tirage d'archive éclairé flottant dans le noir, grain argentique, transition sépia → couleur | « Quatre générations. Une transmission. » |
| 4 | L'alambic | Still IA d'un alambic en cuivre, vapeur en shader qui monte et se condense au scroll | « Le Géranium Bourbon Rosat, distillé sur place. » |
| 5 | L'essence | Scène signature 100 % shader : une goutte d'huile géante (réfraction, dispersion) se forme et tombe ; l'impact se morphe en cartes produits (HE, hydrolat, plantes séchées, fruits) | « Une goutte. Toute la Chaloupe. » |
| 6 | Rencontre | Atterrissage calme : labels « démarche engagée » (AB, HVE), partenaires (ARMEFLHOR, Département 974), bloc contact complet, footer | « Envie de nos produits ? » |

## Architecture

```
site/
  experience.html          → markup + textes FR + JSON-LD (mêmes données SEO que index)
  assets/exp/
    experience.css         → layout, typo, styles du fallback statique
    experience.js          → moteur de scroll + chorégraphie des scènes (~25 KB)
    gl.js                  → renderer WebGL2 minimal + passes shaders (~20 KB)
    *.webp                 → stills IA + depth maps (< 2,5 MB au total)
```

- **Moteur de scroll** : boucle rAF, `scrollY` lissé, mappé sur la timeline globale. Aucune lib.
- **Renderer** : un seul canvas plein écran en `position:fixed`, un fragment shader par scène,
  crossfades entre scènes. Textures : photos existantes + stills IA + depth maps.
- **Couche texte DOM** au-dessus du canvas : vrai HTML (sélectionnable, indexable, accessible),
  animé uniquement en transform/opacity.
- **Depth maps** : dégradés/masques en niveaux de gris peints à la main (pas d'outil externe).

## Assets IA (Higgsfield MCP)

4 stills, modèle le plus cinématique disponible, prompts ancrés dans le lieu réel
(cirque de la Chaloupe, hauts tropicaux brumeux, géranium bourbon, alambic cuivre, backplate
macro goutte d'huile). Chaque image : WebP ≤ 1600 px, stockée en local (aucune ressource distante).

**Budget crédits** : images uniquement, pas de vidéo. ~4 finales × 2 essais ≈ 8-10 générations.

**Fallback sans crédits / MCP indisponible** (aucune perte structurelle) :
- Scène 0 → brouillard 100 % procédural
- Scène 4 → silhouette d'alambic stylisée en shader + vraie vapeur shader
- Scènes 1-3 utilisent déjà les photos réelles ; scène 5 est déjà 100 % shader

## Performance, fallbacks, accessibilité

- Budget : < 3,5 MB total, < 70 KB JS, cible 60 fps sur mobile milieu de gamme
  (résolution de rendu réduite si `devicePixelRatio` > 2, particules plafonnées).
- `prefers-reduced-motion` ou WebGL2 absent → version statique élégante du même contenu
  (CSS pur, photos, pas de canvas). Contenu DOM identique : rien n'est perdu.
- Chargement des textures paresseux par scène ; premier rendu (scène 0) < ~1 s.
- Liens croisés : `index.html` reçoit un lien discret « Vivre l'expérience ✦ »,
  `experience.html` propose « Version classique ».
- Textes réels en DOM : SEO préservé, lecteurs d'écran OK, JSON-LD identique à l'index.

## Tests / validation

- Preview locale : `python3 -m http.server 8080` depuis `site/`.
- Vérification Chrome (claude-in-chrome) : desktop + viewport mobile, transitions de scènes,
  fallback WebGL désactivé, `prefers-reduced-motion`, passe Lighthouse perf.

## Hors périmètre

- Audio, vidéo scrubbée, e-commerce, CMS, analytics.
- Toute affirmation non confirmée par Karène (labels : rester sur « démarche engagée »,
  pas de points de vente inventés). Mêmes contacts que l'index.
