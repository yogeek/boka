# BoKa — boka.re

Site vitrine de **BoKa**, exploitation familiale en polyculture & élevage agroécologique dans
les hauts de la Chaloupe à **Saint-Leu, La Réunion**. Huile essentielle & hydrolat de Géranium
Bourbon Rosat, plantes aromatiques séchées, fruits tempérés cultivés sans intrant.

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `site/` | Le site statique prêt à déployer (racine web). |
| `site/index.html` | Landing page (fichier autonome, CSS inline, zéro dépendance externe). |
| `site/assets/` | Visuels servis en local (hero, géranium, logo, labels…). |
| `AUDIT.md` | Analyse du site actuel + ce que la refonte améliore (SEO, offre, design). |
| `BOKA-MIGRATION-PLAN.md` | Plan de migration Hostinger → VPS Hetzner + fix DNS/cert déjà appliqué. |

## Prévisualiser en local

```bash
cd site
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```
(Ouvrir `site/index.html` directement dans le navigateur fonctionne aussi.)

## Déploiement (VPS Hetzner, Caddy)

Résumé — détails complets dans `BOKA-MIGRATION-PLAN.md` :

1. Copier `site/` vers `/var/www/boka.re` sur le VPS.
2. Caddy sert `boka.re` en statique (HTTPS Let's Encrypt automatique).
3. Repointer le DNS de boka.re vers l'IP du VPS.
4. Résilier l'hébergement Hostinger (garder le domaine).

## À compléter par Karène

Voir la section dédiée dans `AUDIT.md` (statut réel des labels, points de vente, prix,
WhatsApp éventuel…).
