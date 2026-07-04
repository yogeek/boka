# AGENTS.md — Projet BoKa (boka.re)

Fichier d'orientation pour un agent (Claude Code…) reprenant le travail depuis ce dossier.
Lis-le en entier avant d'agir. Les détails sont dans les 3 docs pointés ci-dessous.

## Le projet en une phrase
Site vitrine de **BoKa**, exploitation familiale en polyculture & élevage **agroécologique**
dans les hauts de la Chaloupe à **Saint-Leu, La Réunion (974)** (Karène). On refait le site et
on le **migre de Hostinger vers le VPS Hetzner** qui héberge déjà l'agent Daria, pour ne plus
payer deux serveurs.

## Documents de référence (à lire selon le besoin)
| Fichier | Contenu |
|---|---|
| `BOKA-MIGRATION-PLAN.md` | Plan complet : fix DNS/cert Hostinger déjà appliqué (avec valeurs de rollback), migration vers le VPS Hetzner, runbook Caddy, résiliation Hostinger. **Source de vérité.** |
| `AUDIT.md` | Analyse du site actuel + ce que la refonte améliore + liste « à confirmer par Karène ». |
| `README.md` | Layout du dépôt, preview locale, résumé déploiement. |

## État actuel (ce qui est FAIT)
1. **Fix DNS/cert Hostinger appliqué le 2026-07-04** : le HTTPS était cassé (certs Let's Encrypt
   expirés, site coincé sur l'ancienne infra). Apex `@` et `www` basculés en ALIAS/CNAME vers
   `connect.hostinger.com`. Mail (MX/SPF/DKIM/DMARC) intact. **Vérifier que le cert a bien été
   réémis** (commande dans `BOKA-MIGRATION-PLAN.md` §2.3). C'est un correctif provisoire ; la
   cible reste la migration sur le VPS.
2. **Refonte du site livrée** dans `site/` : `index.html` autonome (CSS inline, visuels locaux
   dans `site/assets/`, zéro dépendance externe, SEO complet + JSON-LD, responsive, accessible).
   Charte : vert forêt + rose géranium + crème, hero photo de la Chaloupe.
3. **Poussé sur `git@github.com:yogeek/boka.git` (branche `main`).**

## Prochaines étapes (ce qui RESTE)
1. **Déployer sur le VPS Hetzner** (runbook `BOKA-MIGRATION-PLAN.md` §6) : installer **Caddy**,
   copier `site/` vers `/var/www/boka.re`, HTTPS Let's Encrypt automatique.
   → **L'agent n'a pas encore d'accès SSH au VPS.** Demander l'accès, sinon l'utilisateur
   exécute le runbook lui-même.
2. **Repointer le DNS** de boka.re vers l'IP du VPS (retirer l'ALIAS `connect.hostinger.com`,
   retirer les MX car pas d'email).
3. **Résilier l'hébergement Hostinger** (garder juste le domaine).
4. **Compléter le contenu** avec Karène (voir `AUDIT.md`) : statut réel des labels AB/HVE,
   points de vente/marchés, prix, éventuel bouton WhatsApp.

## Faits confirmés (ne pas redemander)
- VPS Hetzner : **petit (2–4 Go RAM)**, largement suffisant pour la vitrine.
- Daria (Hermes) : **API LLM distante**, pas de modèle local → empreinte faible.
- **Aucun email @boka.re** utilisé → migration simplifiée.
- Contacts BoKa : `boka.reunion+hello@gmail.com`, `+33 6 52 39 77 94`,
  Instagram `@bok_agriculture`, Facebook (profile id 61572198946447).
- Produits : HE & hydrolat de **Géranium Bourbon Rosat** (PAPAM), plantes séchées, fruits
  tempérés (prunes/pommes/poires) sans intrant, élevage bovin.

## Pièges / à ne pas oublier
- 🔴 **Révoquer le jeton API Hostinger** collé en clair dans une session précédente
  (hPanel → Compte → API). Ne jamais committer de secret (voir `.gitignore`).
- **Ne pas inventer** : statut des labels et points de vente à confirmer par Karène ; la date
  « juillet 2024 » de l'ancien site est obsolète (on est en 2026), neutralisée en « Démarche engagée ».
- Le site doit rester **autonome** (visuels locaux, pas de Google Fonts / CDN) : c'est le but
  de la migration (indépendance vis-à-vis de Zyro/Hostinger).
- Bases d'outils locales (`.headroom/`, `.tokensave/`) : **ignorées**, ne pas versionner.

## Conventions
- Langue : **français**. Style : **pas de tirets cadratins** (règle globale de l'utilisateur).
- Preview locale : `cd site && python3 -m http.server 8080` → http://localhost:8080
