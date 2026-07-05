#!/usr/bin/env bash
# Post-prod film BoKa : 5 clips enchaînés -> master (fondus encre) -> frames AVIF+WebP 720p + manifeste.
# Ordre du parcours : A ciel->terre, C terre->coeur, D coeur->alambic, E alambic->goutte, B goutte->flacon.
set -euo pipefail
WORK="${WORK:?export WORK=... (dossier scratchpad contenant clips/)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/site/assets/film"
FPS="${FPS:-8}"            # 8 fps : ~40s de film tiennent dans le budget poids (3-6 Mo AVIF).
DUR_DISSOLVE=0.6          # durée du fondu-dissolution (encre) entre chaque plan.
AVIF_Q="${AVIF_Q:-44}"     # qualité AVIF par frame (plus bas si le total dépasse le budget).
WEBP_Q="${WEBP_Q:-66}"

# Plans dans l'ordre du parcours descendant.
CLIPS=(
  "$WORK/clips/A_sky_terre.mp4"
  "$WORK/clips/C_terre_coeur.mp4"
  "$WORK/clips/D_coeur_alambic.mp4"
  "$WORK/clips/E_alambic_goutte.mp4"
  "$WORK/clips/B_goutte_flacon.mp4"
)
for c in "${CLIPS[@]}"; do
  [ -f "$c" ] || { echo "clip manquant : $c"; exit 1; }
done
N=${#CLIPS[@]}

rm -rf "$OUT/avif" "$OUT/webp" "$WORK/png"
mkdir -p "$OUT/avif" "$OUT/webp" "$WORK/png"

# 1. Durée réelle de chaque clip (pour calculer les offsets de fondu).
DUR=()
for c in "${CLIPS[@]}"; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$c")
  DUR+=("$d")
done

# 2. Construction du filtre : chaque plan mis à l'échelle 1280x720, puis xfade en chaîne.
#    offset du i-e fondu = (longueur cumulée du montage jusque-là) - durée du fondu.
INPUTS=()
FILTER=""
for i in "${!CLIPS[@]}"; do
  INPUTS+=(-i "${CLIPS[$i]}")
  FILTER+="[$i:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=$FPS[v$i];"
done
prev="[v0]"
running="${DUR[0]}"
for ((i=1; i<N; i++)); do
  offset=$(awk "BEGIN{printf \"%.3f\", $running - $DUR_DISSOLVE}")
  if [ "$i" -eq $((N-1)) ]; then out="[v]"; else out="[x$i]"; fi
  FILTER+="${prev}[v$i]xfade=transition=dissolve:duration=$DUR_DISSOLVE:offset=$offset$out;"
  prev="$out"
  running=$(awk "BEGIN{printf \"%.3f\", $running + ${DUR[$i]} - $DUR_DISSOLVE}")
done
FILTER="${FILTER%;}"   # retire le ';' final

ffmpeg -y "${INPUTS[@]}" -filter_complex "$FILTER" \
  -map "[v]" -an -c:v libx264 -crf 18 -pix_fmt yuv420p "$WORK/master.mp4"

# 3. Extraction frames PNG à FPS constant.
ffmpeg -y -i "$WORK/master.mp4" -vf "fps=$FPS" -start_number 1 "$WORK/png/f_%04d.png"

# 4. Encodage par frame en AVIF et WebP.
COUNT=0
for f in "$WORK"/png/f_*.png; do
  base="$(basename "${f%.png}")"
  convert "$f" -quality "$AVIF_Q" "$OUT/avif/$base.avif"
  convert "$f" -quality "$WEBP_Q" "$OUT/webp/$base.webp"
  COUNT=$((COUNT+1))
done

# 5. Tuile de grain 128x128 (bruit monochrome) pour l'overlay.
convert -size 128x128 xc:gray50 +noise Gaussian -colorspace Gray -attenuate 0.35 "$OUT/grain.png"

# 6. Manifeste.
cat > "$OUT/manifest.json" <<JSON
{"count":$COUNT,"pattern":"f_%04d","fps":$FPS,"formats":["avif","webp"],"width":1280,"height":720}
JSON

echo "OK count=$COUNT fps=$FPS"
du -sh "$OUT/avif" "$OUT/webp"
