# Film « Encre & essence » — Plan d'implémentation (Phase 0 prototype)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire le prototype 2 plans de la variante film BoKa : générer 2 clips cinématiques « encre & essence » chaînés, les transformer en séquence de frames AVIF/WebP 720p, et les scrubber au scroll dans une nouvelle page `film.html` autonome, avec repli vers `experience.html`.

**Architecture:** Pipeline en deux temps. (1) Génération non déterministe via la CLI Higgsfield (images-clés `nano_banana_2` → clips `veo3_1_lite` chaînés start/end), post-produite par un script ffmpeg local en une séquence de frames locales. (2) Rendu déterministe : `film.html` + `film.js` peignent au scroll la frame correspondante sur un `<canvas>`, avec overlay grain/vignette, en réutilisant le moteur de scroll et la chorégraphie de texte de `experience.js`.

**Tech Stack:** Higgsfield CLI (v1.1.5), ffmpeg 6.1.1 (libaom-av1, libwebp), ImageMagick 6 (délégués AVIF/WebP), JS vanilla zéro-dépendance, WebGL2 non requis (Canvas 2D).

## Global Constraints

Valeurs reprises verbatim du spec `docs/superpowers/specs/2026-07-05-film-encre-essence-design.md`. Chaque tâche les inclut implicitement.

- **Autonomie** : visuels et polices en local, aucun Google Fonts / CDN. Frames committées dans `site/assets/film/`. La page ne doit émettre aucune requête réseau externe.
- **Format** : paysage **16:9**, frames exportées en **720p** (1280×720).
- **Overlay grain/vignette** : présent dès la **v1**.
- **Poids frames cible** : 3-6 Mo pour la séquence complète.
- **Repli** : `prefers-reduced-motion`, Canvas indisponible, ou frames en échec → redirection vers `experience.html`.
- **Ne pas inventer** : aucun claim sur labels AB/HVE ni points de vente ; garder « Démarche engagée » ; date « juillet 2024 » obsolète. Rendu stylisé, pas de faux réalisme.
- **Contacts BoKa uniquement** : boka.reunion+hello@gmail.com, +33 6 52 39 77 94, Instagram @bok_agriculture, Facebook (profile id 61572198946447). Aucun email @boka.re.
- **Sécurité** : ne jamais committer de secret. Les mp4/keyframes bruts restent hors dépôt (dossier de travail scratchpad) ; seules les frames finales sont committées.
- **Style** : français, pas de tirets cadratins.
- **Git** : brancher depuis `main` avant tout commit ; trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Budget** : workspace « Private », 84 crédits. Coût prototype ~24 cr (4 images-clés × 2 + 2 clips × 8), hors regénérations. `veo3_1_lite` force la durée à 8s quand start et end sont fournis.

**Dossier de travail (hors dépôt)** : `/tmp/claude-1000/-home-guillaume-perso-boka/55180550-3e99-456d-bd7c-b5153cb16246/scratchpad/film/` — noté `$WORK` ci-dessous. Contient keyframes, clips, master.mp4, PNG intermédiaires. Rien de ce dossier n'est committé.

## File Structure

- `scripts/build-film-frames.sh` — script de post-prod (dev, non servi au site) : xfade des clips → extraction frames → encodage AVIF+WebP → manifeste. Idempotent.
- `site/film.html` — page prototype (structure clonée de `experience.html`, scripts = `film.js`).
- `site/assets/exp/film.css` — styles spécifiques film (canvas frame, overlay grain/vignette). Réutilise `experience.css` pour texte/landing.
- `site/assets/exp/film.js` — moteur : chargement manifeste, préchargement, scrub Canvas 2D, auto-test mapping, chorégraphie texte + rail (repris de `experience.js`), repli.
- `site/assets/film/manifest.json` — `{count, pattern, fps, formats}`.
- `site/assets/film/avif/f_%04d.avif` — frames AVIF (format primaire).
- `site/assets/film/webp/f_%04d.webp` — frames WebP (repli de décodage).
- `site/assets/film/grain.png` — tuile de bruit 128×128 pour le grain (générée, locale).

---

### Task 1: Génération Higgsfield — images-clés + 2 clips chaînés

Tâche interactive (dépense des crédits, jugement visuel). Pas de cycle TDD : la « vérification » est le contrôle qualité humain + `ffprobe`. **Gate** : l'utilisateur valide le look avant de dépenser les clips, puis avant Task 2.

**Files:**
- Create (hors dépôt): `$WORK/kf/{sky,terre,goutte,flacon}.png`
- Create (hors dépôt): `$WORK/clips/{A_sky_terre,B_goutte_flacon}.mp4`

**Interfaces:**
- Produces: 2 fichiers mp4 8s 16:9 dans `$WORK/clips/`, nommés `A_sky_terre.mp4` et `B_goutte_flacon.mp4`, consommés par Task 2.

- [ ] **Step 1: Préparer le dossier de travail et confirmer l'état CLI**

```bash
WORK="/tmp/claude-1000/-home-guillaume-perso-boka/55180550-3e99-456d-bd7c-b5153cb16246/scratchpad/film"
mkdir -p "$WORK/kf" "$WORK/clips" "$WORK/png"
higgsfield account status
```
Expected: `gdupin@gmail.com — plus plan, N credits` (N ≥ 24).

- [ ] **Step 2: Générer les 4 images-clés (`nano_banana_2`, 2 cr chacune)**

Prompts « encre & essence » (aquarelle / diffusion de pigment, palette géranium `#c15f7c`, crème `#f8f4ec`, cuivre-forêt `#2f4a34`). Générer une à une, en 16:9, télécharger via l'URL retournée.

```bash
cd "$WORK/kf"
# 1. Ciel
higgsfield generate create nano_banana_2 --aspect_ratio 16:9 \
  --prompt "Aerial view above a sea of clouds over volcanic tropical highlands at golden hour, rendered as a soft watercolour ink wash, pigments diffusing in water, warm cream and rose tones, painterly, dreamy, no text" \
  --wait --wait-timeout 8m --json | tee /tmp/kf_sky.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/kf_sky.json | head -1)" -o sky.png
# 2. Terre
higgsfield generate create nano_banana_2 --aspect_ratio 16:9 \
  --prompt "Descending aerial over green terraced highland fields with rows of geranium plants, watercolour ink spreading by capillarity to paint the fields, forest green and rose pigments, painterly, no text" \
  --wait --wait-timeout 8m --json | tee /tmp/kf_terre.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/kf_terre.json | head -1)" -o terre.png
# 3. Goutte
higgsfield generate create nano_banana_2 --aspect_ratio 16:9 \
  --prompt "Extreme close-up of a single amber essential-oil droplet forming at a copper still spout, slow-motion feel, ink-in-water backdrop, warm amber and copper tones, painterly macro, no text" \
  --wait --wait-timeout 8m --json | tee /tmp/kf_goutte.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/kf_goutte.json | head -1)" -o goutte.png
# 4. Flacon
higgsfield generate create nano_banana_2 --aspect_ratio 16:9 \
  --prompt "An amber oil droplet falling into an elegant glass bottle of geranium essential oil, gentle ripple, watercolour ink halo, cream background, rose and copper accents, painterly product shot, no text" \
  --wait --wait-timeout 8m --json | tee /tmp/kf_flacon.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/kf_flacon.json | head -1)" -o flacon.png
```

- [ ] **Step 3: Vérifier les 4 images-clés**

```bash
cd "$WORK/kf" && for f in sky terre goutte flacon; do identify -format "%f %wx%h\n" "$f.png"; done
```
Expected: 4 lignes, largeur ≥ 1280, ratio ~16:9. Contrôle visuel du look « encre & essence ». **Gate** : présenter les 4 images à l'utilisateur ; ne pas passer aux clips sans son accord (dépense à venir : 16 cr).

- [ ] **Step 4: Générer le clip A (ciel → terre) chaîné**

```bash
cd "$WORK/clips"
higgsfield generate create veo3_1_lite --aspect_ratio 16:9 --duration 8 \
  --start-image "$WORK/kf/sky.png" --end-image "$WORK/kf/terre.png" \
  --prompt "Continuous vertical descent from a sea of clouds down to green terraced geranium fields, slow cinematic dolly-down accelerating, clouds parting like ink diffusing in water, watercolour painterly look" \
  --wait --wait-timeout 20m --wait-interval 10s --json | tee /tmp/clipA.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/clipA.json | head -1)" -o A_sky_terre.mp4
```

- [ ] **Step 5: Générer le clip B (goutte → flacon) chaîné**

```bash
cd "$WORK/clips"
higgsfield generate create veo3_1_lite --aspect_ratio 16:9 --duration 8 \
  --start-image "$WORK/kf/goutte.png" --end-image "$WORK/kf/flacon.png" \
  --prompt "Extreme slow-motion of a single amber essential-oil droplet detaching, rotating, falling and landing into a glass bottle with a gentle ripple, chromatic highlight, ink-in-water halo, painterly cinematic" \
  --wait --wait-timeout 20m --wait-interval 10s --json | tee /tmp/clipB.json
curl -sL "$(jq -r '..|.url? // empty' /tmp/clipB.json | head -1)" -o B_goutte_flacon.mp4
```

- [ ] **Step 6: Vérifier les 2 clips**

```bash
cd "$WORK/clips" && for f in A_sky_terre B_goutte_flacon; do ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$f.mp4"; done
```
Expected: 2 lignes, `1280,720` (ou 16:9 équivalent), durée ~8s. **Gate** : contrôle visuel des clips avec l'utilisateur avant Task 2. Regénérer un plan si le mouvement ou le look ne convient pas (coût : 8 cr le plan).

---

### Task 2: Script de post-prod ffmpeg → séquence de frames

Transforme les 2 clips en une séquence continue de frames AVIF + WebP 720p, plus le manifeste et la tuile de grain. Script idempotent (efface et recrée les sorties). La « vérification » = assertions shell sur les sorties.

**Files:**
- Create: `scripts/build-film-frames.sh`
- Create (sorties committées): `site/assets/film/avif/`, `site/assets/film/webp/`, `site/assets/film/manifest.json`, `site/assets/film/grain.png`

**Interfaces:**
- Consumes: `$WORK/clips/A_sky_terre.mp4`, `$WORK/clips/B_goutte_flacon.mp4` (Task 1).
- Produces: `site/assets/film/manifest.json` de forme `{"count":<int>,"pattern":"f_%04d","fps":12,"formats":["avif","webp"],"width":1280,"height":720}` et les frames `f_0001..f_<count>` dans `avif/` et `webp/`. `film.js` (Task 4) consomme ce manifeste.

- [ ] **Step 1: Écrire le script**

```bash
cat > scripts/build-film-frames.sh <<'SH'
#!/usr/bin/env bash
# Post-prod film BoKa : 2 clips -> master (fondu encre) -> frames AVIF+WebP 720p + manifeste.
set -euo pipefail
WORK="${WORK:?export WORK=... (dossier scratchpad contenant clips/)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/site/assets/film"
FPS=12
A="$WORK/clips/A_sky_terre.mp4"
B="$WORK/clips/B_goutte_flacon.mp4"
[ -f "$A" ] && [ -f "$B" ] || { echo "clips manquants dans $WORK/clips"; exit 1; }

rm -rf "$OUT/avif" "$OUT/webp" "$WORK/png"
mkdir -p "$OUT/avif" "$OUT/webp" "$WORK/png"

# 1. Concat avec fondu-dissolution (encre) 0.6s ; offset = 8s - 0.6s = 7.4s.
ffmpeg -y -i "$A" -i "$B" -filter_complex \
"[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1[a];\
 [1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1[b];\
 [a][b]xfade=transition=dissolve:duration=0.6:offset=7.4[v]" \
 -map "[v]" -an -c:v libx264 -crf 18 -pix_fmt yuv420p "$WORK/master.mp4"

# 2. Extraction frames PNG a FPS constant.
ffmpeg -y -i "$WORK/master.mp4" -vf "fps=$FPS" -start_number 1 "$WORK/png/f_%04d.png"

# 3. Encodage par frame en AVIF (q50) et WebP (q72).
COUNT=0
for f in "$WORK"/png/f_*.png; do
  base="$(basename "${f%.png}")"
  convert "$f" -quality 50 "$OUT/avif/$base.avif"
  convert "$f" -quality 72 "$OUT/webp/$base.webp"
  COUNT=$((COUNT+1))
done

# 4. Tuile de grain 128x128 (bruit monochrome) pour l'overlay.
convert -size 128x128 xc:gray50 +noise Gaussian -colorspace Gray -attenuate 0.35 "$OUT/grain.png"

# 5. Manifeste.
cat > "$OUT/manifest.json" <<JSON
{"count":$COUNT,"pattern":"f_%04d","fps":$FPS,"formats":["avif","webp"],"width":1280,"height":720}
JSON

echo "OK count=$COUNT"
du -sh "$OUT/avif" "$OUT/webp"
SH
chmod +x scripts/build-film-frames.sh
```

- [ ] **Step 2: Exécuter le script**

```bash
export WORK="/tmp/claude-1000/-home-guillaume-perso-boka/55180550-3e99-456d-bd7c-b5153cb16246/scratchpad/film"
./scripts/build-film-frames.sh
```
Expected: `OK count=~185` puis deux lignes `du -sh`.

- [ ] **Step 3: Vérifier count, dimensions, poids, manifeste**

```bash
AVIF=$(ls site/assets/film/avif | wc -l); WEBP=$(ls site/assets/film/webp | wc -l)
CNT=$(jq .count site/assets/film/manifest.json)
echo "avif=$AVIF webp=$WEBP manifest=$CNT"
[ "$AVIF" = "$WEBP" ] && [ "$AVIF" = "$CNT" ] && echo "COUNT OK" || echo "COUNT MISMATCH"
identify -format "%wx%h\n" "$(ls site/assets/film/avif/*.avif | head -1)"
du -sh site/assets/film/avif
jq -e '.count>0 and .width==1280 and .height==720' site/assets/film/manifest.json
```
Expected: `COUNT OK`, dimension `1280x720`, poids AVIF ≤ ~4 Mo, `jq -e` renvoie true (exit 0). Si AVIF > 4 Mo : baisser `-quality` à 42 et relancer.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-film-frames.sh site/assets/film/manifest.json site/assets/film/grain.png site/assets/film/avif site/assets/film/webp
git commit -m "Film: pipeline post-prod ffmpeg + séquence frames prototype (2 plans)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Page `film.html` + styles `film.css`

Structure statique clonée de `experience.html` (canvas, entête, scènes-texte, landing, rail, noscript), scripts = `film.js`. `film.css` ajoute le canvas de frames et l'overlay grain/vignette ; le reste vient de `experience.css`.

**Files:**
- Create: `site/film.html`
- Create: `site/assets/exp/film.css`

**Interfaces:**
- Produces: DOM avec `<canvas id="film-canvas">`, `<div class="grain">`, `<div class="vignette">`, `<main id="film">` (6 `.scene` data-scene 0-5), `.landing` data-scene=6, `<nav class="rail">`, consommé par `film.js` (Task 4).

- [ ] **Step 1: Créer `film.css`**

```css
/* Film « Encre & essence » — canvas de frames + overlay grain/vignette. */
#film-canvas{
  position:fixed; inset:0; width:100vw; height:100vh; display:block; z-index:0;
  background:#0d1310;
}
/* Overlays au-dessus du canvas, sous le contenu (#film z-index:10). */
.grain,.vignette{position:fixed; inset:0; z-index:2; pointer-events:none}
.vignette{background:radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(8,10,8,.55) 100%)}
.grain{
  background-image:url(../film/grain.png); background-size:128px 128px;
  opacity:.06; mix-blend-mode:overlay; animation:grainshift .5s steps(2) infinite;
}
@keyframes grainshift{
  0%{transform:translate(0,0)} 25%{transform:translate(-6px,4px)}
  50%{transform:translate(5px,-5px)} 75%{transform:translate(-4px,-6px)} 100%{transform:translate(0,0)}
}
@media(prefers-reduced-motion:reduce){ .grain{animation:none} }
/* La couche texte reste au-dessus des overlays. */
#film{position:relative; z-index:10}
```

- [ ] **Step 2: Créer `film.html`**

Cloner `experience.html` en remplaçant : `<canvas id="gl">` → `<canvas id="film-canvas">` + deux overlays ; les deux `<link>`/`<script>` d'expérience par `film.css`+`experience.css` et `film.js`. Garder JSON-LD, contacts, textes, landing à l'identique.

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BoKa · Le Film — De la fleur à la goutte</title>
<meta name="description" content="Une descente cinématique « encre & essence » au cœur de BoKa : du ciel des hauts de la Chaloupe jusqu'à la goutte d'huile essentielle de Géranium Bourbon Rosat.">
<meta name="theme-color" content="#2f4a34">
<link rel="icon" href="assets/logo.png">
<meta property="og:title" content="BoKa · Le Film">
<meta property="og:description" content="Une descente cinématique, du ciel à la goutte d'huile essentielle.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/exp/sky.webp">
<link rel="preload" as="image" href="assets/film/avif/f_0001.avif">
<link rel="stylesheet" href="assets/exp/experience.css">
<link rel="stylesheet" href="assets/exp/film.css">
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"LocalBusiness",
  "name":"BoKa",
  "description":"Exploitation familiale en polyculture et élevage, conduite en agroécologie dans les hauts de la Chaloupe. Plantes à parfum (Géranium Bourbon Rosat), fruits tempérés.",
  "address":{"@type":"PostalAddress","addressLocality":"Saint-Leu","addressRegion":"La Réunion","postalCode":"97436","addressCountry":"RE"},
  "areaServed":"La Réunion",
  "email":"boka.reunion+hello@gmail.com",
  "telephone":"+33652397794",
  "sameAs":["https://www.instagram.com/bok_agriculture","https://www.facebook.com/profile.php?id=61572198946447"]
}
</script>
</head>
<body>

<canvas id="film-canvas" aria-hidden="true"></canvas>
<div class="vignette" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>

<header class="xp-top">
  <a class="xp-brand" href="index.html"><b>Bo</b>Ka</a>
  <a class="xp-classic" href="experience.html">Version interactive</a>
</header>

<main id="film">
  <section class="scene" data-scene="0"><div class="copy"><div class="hero-mark">
    <p class="eyebrow">Dans les hauts de la Chaloupe</p>
    <h1 class="hero-title"><b>Bo</b>Ka</h1>
    <p class="hero-tag">Le film</p>
  </div></div></section>
  <section class="scene" data-scene="1"><div class="copy">
    <p class="eyebrow">Saint-Leu · La Réunion</p>
    <h2 class="pivot">Une terre,<br>une famille.</h2>
    <p class="sub">Depuis les années 1940, une même famille prend soin de cette terre des hauts de la Chaloupe.</p>
  </div></section>
  <section class="scene" data-scene="2"><div class="copy">
    <h2 class="pivot">Cultivée en <span class="accent">agroécologie</span>.</h2>
    <p class="sub">Des plantes à parfum et des fruits, cultivés sans aucun intrant. La biodiversité comme alliée, pas comme contrainte.</p>
  </div></section>
  <section class="scene" data-scene="3"><div class="copy">
    <h2 class="pivot">Le Géranium<br><span class="accent">Bourbon Rosat</span>.</h2>
    <p class="sub">Notre PAPAM phare, distillé sur l'exploitation. Une signature olfactive emblématique de La Réunion.</p>
  </div></section>
  <section class="scene" data-scene="4"><div class="copy">
    <p class="eyebrow">Distillation</p>
    <h2 class="pivot">Au cœur<br>de l'alambic.</h2>
    <p class="sub">La vapeur traverse la plante, l'essence se sépare, goutte après goutte.</p>
  </div></section>
  <section class="scene" data-scene="5"><div class="copy">
    <h2 class="pivot">Une goutte.<br>Toute la Chaloupe.</h2>
    <p class="sub">De la fleur à l'essence, tout se fait ici, au rythme de la terre.</p>
  </div></section>
</main>

<section class="landing" data-scene="6">
  <div class="wrap">
    <div class="lead">
      <p class="eyebrow">Rencontre</p>
      <h2>Une exploitation familiale, en polyculture &amp; élevage.</h2>
      <p>Nous diversifions l'exploitation autour des PAPAM (Plantes Aromatiques à Parfum et Médicinales) et d'un verger de fruits tempérés. Le Géranium Bourbon Rosat en est le fleuron.</p>
    </div>
    <div class="grid">
      <article class="card"><span class="k">Géranium Bourbon Rosat</span><h3>Huile essentielle</h3><p>Notre PAPAM phare, distillé sur l'exploitation. Une signature olfactive emblématique de La Réunion.</p></article>
      <article class="card"><span class="k">Géranium Bourbon Rosat</span><h3>Eau florale</h3><p>L'hydrolat issu de la distillation, doux et parfumé, pour le soin et le bien-être au quotidien.</p></article>
      <article class="card"><span class="k">PAPAM</span><h3>Plantes séchées</h3><p>Nos plantes récoltées et séchées avec soin. Des haies de fleurs jaunes et d'Ambaville nourrissent aussi la biodiversité.</p></article>
      <article class="card"><span class="k">Verger</span><h3>Prunes · Pommes · Poires</h3><p>Un verger de fruits tempérés cultivé sans aucun intrant. Vendus bruts, au rythme des saisons.</p></article>
    </div>
    <div class="contact">
      <p class="eyebrow" style="color:var(--geranium-l)">Contact</p>
      <h2>Envie de nos produits&nbsp;?</h2>
      <p>Pour commander, connaître nos points de vente ou simplement échanger sur l'exploitation, nous sommes à votre écoute.</p>
      <div class="rows">
        <a class="line" href="mailto:boka.reunion+hello@gmail.com">boka.reunion+hello@gmail.com</a>
        <a class="line" href="tel:+33652397794">+33 6 52 39 77 94</a>
      </div>
      <a class="btn btn-rose" href="mailto:boka.reunion+hello@gmail.com">Nous écrire</a>
      <div class="socials">
        <a href="https://www.instagram.com/bok_agriculture" rel="noopener">Instagram</a>
        <a href="https://www.facebook.com/profile.php?id=61572198946447" rel="noopener">Facebook</a>
      </div>
    </div>
    <div class="foot"><p>BoKa · Les hauts de la Chaloupe, Saint-Leu, La Réunion (974) — <a href="index.html">Version classique du site</a></p></div>
  </div>
</section>

<nav class="rail" aria-label="Progression"></nav>
<div class="scroll-hint" aria-hidden="true"><span>Défiler</span><span class="chev"></span></div>
<noscript><p style="padding:2rem;color:#fff;text-align:center">Ce film utilise JavaScript. Découvrez BoKa sur la <a href="index.html" style="color:#f4c9d4">version classique du site</a>.</p></noscript>

<script src="assets/exp/film.js"></script>
</body>
</html>
```

- [ ] **Step 3: Vérifier la structure (aucun script exécuté)**

```bash
grep -c 'data-scene' site/film.html   # attendu: 7
grep -c 'boka.re"' site/film.html || true   # attendu: 0 (aucun @boka.re)
grep -o 'assets/exp/film.js' site/film.html # attendu: présent
```
Expected: 7 scènes, aucun email @boka.re, `film.js` référencé.

- [ ] **Step 4: Commit**

```bash
git add site/film.html site/assets/exp/film.css
git commit -m "Film: page film.html + styles overlay grain/vignette

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Moteur `film.js` — manifeste, préchargement, scrub, repli

Cœur logique. Réutilise la mécanique de `experience.js` (t lissé lerp 0.075, chorégraphie de texte, rail 7 points). Ajoute : chargement du manifeste, choix de format (AVIF sinon WebP), préchargement, rendu Canvas 2D « cover » de la frame au scroll, auto-test de la fonction pure `frameIndexFor`, repli.

**Files:**
- Create: `site/assets/exp/film.js`

**Interfaces:**
- Consumes: `site/assets/film/manifest.json` (`{count,pattern,fps,formats,width,height}`), frames `avif/` ou `webp/`, DOM de Task 3.
- Produces: pure `frameIndexFor(t, count)` → entier `[0, count-1]` ; effet de bord : peint la frame sur `#film-canvas`. Bascule vers `experience.html` en repli.

- [ ] **Step 1: Écrire `film.js` avec l'auto-test de mapping en tête**

```javascript
/* BoKa · Le Film — scrub d'une séquence de frames au scroll. Zéro-dépendance.
   Repli vers experience.html si mouvement réduit, Canvas absent, ou frames en échec. */
(function () {
  'use strict';

  // --- Fonction pure : timeline t in [0,1] -> index de frame [0, count-1]. ---
  function frameIndexFor(t, count) {
    if (count <= 0) return 0;
    var i = Math.round(t * (count - 1));
    return i < 0 ? 0 : (i > count - 1 ? count - 1 : i);
  }

  // --- Auto-test console (tient lieu de test unitaire dans ce site sans framework). ---
  (function selftest() {
    var ok = true, c = 10;
    ok = ok && frameIndexFor(0, c) === 0;
    ok = ok && frameIndexFor(1, c) === 9;
    ok = ok && frameIndexFor(0.5, c) === 5;   // round(4.5)=5 (arrondi JS vers +inf)
    ok = ok && frameIndexFor(-1, c) === 0;    // borné bas
    ok = ok && frameIndexFor(2, c) === 9;     // borné haut
    ok = ok && frameIndexFor(0.5, 0) === 0;   // count nul
    console.log('[film:selftest] frameIndexFor ' + (ok ? 'PASS' : 'FAIL'));
  })();

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('film-canvas');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var rail = document.querySelector('.rail');
  var hint = document.querySelector('.scroll-hint');

  function bail() { location.replace('experience.html'); }
  if (reduce || !canvas || !canvas.getContext) { bail(); return; }
  var ctx = canvas.getContext('2d');
  if (!ctx) { bail(); return; }

  // --- Chargement du manifeste puis des frames. ---
  fetch('assets/film/manifest.json').then(function (r) { return r.json(); })
    .then(start).catch(bail);

  function pad(n) { var s = '' + n; while (s.length < 4) s = '0' + s; return s; }
  function frameURL(fmt, i) { return 'assets/film/' + fmt + '/f_' + pad(i + 1) + '.' + fmt; }

  function start(man) {
    var count = man.count | 0;
    if (count <= 0) return bail();

    // Choix de format : tester la 1re frame AVIF, sinon WebP, sinon repli.
    probe('avif', function (fmt) {
      if (!fmt) return bail();
      loadAll(fmt, count, man);
    });
  }

  function probe(fmt, cb) {
    var img = new Image();
    img.onload = function () { cb(fmt); };
    img.onerror = function () { if (fmt === 'avif') probe('webp', cb); else cb(null); };
    img.src = frameURL(fmt, 0);
  }

  function loadAll(fmt, count, man) {
    var frames = new Array(count), loaded = 0, failed = 0, ready = false;

    function onOne() {
      loaded++;
      if (!ready && loaded >= Math.min(20, count)) { ready = true; run(); }
    }
    function load(i, priority) {
      var img = new Image();
      if (!priority) img.loading = 'eager';
      img.onload = onOne;
      img.onerror = function () { failed++; if (failed > count * 0.1) bail(); onOne(); };
      img.src = frameURL(fmt, i);
      frames[i] = img;
    }
    var i;
    for (i = 0; i < Math.min(20, count); i++) load(i, true);
    for (i = 20; i < count; i++) load(i, false);

    // --- État lissé + rendu. ---
    function run() {
      root.classList.add('is-live');
      buildRail();
      var dots = rail ? Array.prototype.slice.call(rail.children) : [];
      var t = 0, tTarget = 0, cur = -1, scrolled = false;

      function resize() {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        cur = -1; // force un repaint
      }
      function onScroll() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        tTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (!scrolled && window.scrollY > 8) { scrolled = true; if (hint) hint.classList.add('gone'); }
      }
      function paint(i) {
        var img = frames[i];
        if (!img || !img.complete || !img.naturalWidth) return;
        var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
        var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      }
      function textChoreography() {
        var vh = window.innerHeight, active = Math.round(t * 6);
        for (var k = 0; k < scenes.length; k++) {
          var r = scenes[k].getBoundingClientRect();
          var d = (r.top + r.height / 2 - vh / 2) / vh;
          var vis = Math.max(0, 1 - Math.min(1, Math.abs(d) * 1.7));
          var copy = scenes[k].querySelector('.copy');
          if (copy) { copy.style.opacity = vis.toFixed(3); copy.style.transform = 'translate3d(0,' + (d * 40).toFixed(1) + 'px,0)'; }
        }
        for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('on', j === active);
      }
      function frame() {
        t += (tTarget - t) * 0.075;
        var idx = frameIndexFor(t, count);
        if (idx !== cur) { paint(idx); cur = idx; }
        textChoreography();
        requestAnimationFrame(frame);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { resize(); onScroll(); });
      resize(); onScroll();
      requestAnimationFrame(frame);
    }

    function buildRail() {
      if (!rail) return;
      for (var n = 0; n < 7; n++) {
        var b = document.createElement('button');
        b.className = 'rail-dot'; b.type = 'button';
        b.setAttribute('aria-label', 'Aller à la scène ' + (n + 1)); b.dataset.i = n;
        b.addEventListener('click', function (e) {
          var target = document.querySelector('[data-scene="' + e.currentTarget.dataset.i + '"]');
          if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        });
        rail.appendChild(b);
      }
    }
  }
})();
```

- [ ] **Step 2: Vérifier l'auto-test de mapping dans le navigateur**

Servir le site et charger `film.html`, lire la console (outils Chrome), filtrer `[film:selftest]`.

```bash
cd site && python3 -m http.server 8099 >/dev/null 2>&1 &
```
Puis via les outils Chrome : `navigate` vers `http://localhost:8099/film.html`, `read_console_messages` pattern `[film:selftest]`.
Expected: `[film:selftest] frameIndexFor PASS`.

- [ ] **Step 3: Vérifier le scrub et l'état live**

Via les outils Chrome sur `http://localhost:8099/film.html` : exécuter `javascript_tool` renvoyant `JSON.stringify({live:document.documentElement.classList.contains('is-live'), w:document.getElementById('film-canvas').width})`, puis scroller (`computer` scroll ou `window.scrollTo`) et prendre 2-3 captures à des positions différentes.
Expected: `live:true`, le canvas peint des frames différentes selon la position de scroll (image du ciel en haut, du flacon en bas).

- [ ] **Step 4: Vérifier l'autonomie réseau (aucune requête externe)**

Via `read_network_requests` : lister les requêtes de la page.
Expected: toutes en `localhost:8099` (frames, manifest, css, grain). Aucun domaine externe.

- [ ] **Step 5: Vérifier le repli**

Charger `http://localhost:8099/film.html` avec émulation `prefers-reduced-motion: reduce` (ou tester en renommant temporairement `manifest.json`). 
Expected: redirection vers `experience.html`.

- [ ] **Step 6: Commit**

```bash
git add site/assets/exp/film.js
git commit -m "Film: moteur film.js (scrub frames, préchargement, repli)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Vérification finale et bilan prototype

Passe de contrôle globale + décision sur la suite (5 plans vs recharge), sur pièces réelles.

**Files:** aucune création ; vérification.

- [ ] **Step 1: Contrôle qualité global**

Sur `http://localhost:8099/film.html` : dérouler tout le scroll, vérifier fluidité du scrub, lisibilité des textes par-dessus, overlay grain/vignette discret, cohérence « encre & essence », transition dissolution au raccord des 2 plans, atterrissage sur la landing.

- [ ] **Step 2: Contrôle poids et budget**

```bash
du -sh site/assets/film; higgsfield account status
```
Expected: séquence 3-6 Mo ; noter les crédits restants.

- [ ] **Step 3: Arrêter le serveur local**

```bash
pkill -f "http.server 8099" || true
```

- [ ] **Step 4: Présenter le bilan et trancher la suite**

Montrer le prototype à l'utilisateur. Décision (spec §6) : **run 5 plans compressé** (~52 cr, budget actuel) ou **recharge de crédits** pour le storyboard 8 plans. Cette décision ouvre une Phase 1 (hors de ce plan).

## Self-Review

**Couverture du spec :**
- §2 direction artistique « encre & essence » → prompts Task 1 (aquarelle/diffusion) + overlay grain/vignette Task 3.
- §3 storyboard / raccords chaînés → Task 1 start/end images + fondu dissolution Task 2.
- §4 architecture (canvas scrub, frames locales, préchargement, texte/rail réutilisés, repli, overlay v1) → Tasks 3-4.
- §5 pipeline (nano_banana_2 → veo3_1_lite → ffmpeg → AVIF/WebP → manifeste) → Tasks 1-2.
- §6 budget / prototype d'abord → gates de coût Task 1, bilan Task 5.
- §7 contraintes (autonomie, contacts, pas d'invention, secrets, style, git) → Global Constraints + vérifs Task 3 Step 3 et Task 4 Step 4.
- §8 critères de succès → Task 5.
- §9 décisions (16:9, 720p, overlay v1) → Global Constraints + Task 2/3.

**Placeholders :** aucun « TBD/TODO ». Le nombre de frames (~185) est une estimation vérifiée par assertion, pas un placeholder.

**Cohérence des types :** `frameIndexFor(t, count)` défini et utilisé de façon identique (Task 4). Manifeste `{count,pattern,fps,formats,width,height}` produit en Task 2 et consommé en Task 4. Nommage frames `f_%04d` cohérent script/JS (`pad` sur 4 chiffres).

**Écart assumé vs spec :** le prototype saute la continuité narrative terre→goutte (plans 4-6 non générés) ; assumé car Phase 0 vise à valider look + pipeline + scrub, pas le récit complet. Noté au bilan Task 5.
