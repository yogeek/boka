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
