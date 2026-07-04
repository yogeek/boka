# BoKa (boka.re) — Plan de reprise / migration

> Document de passation. Rédigé le **2026-07-04**. Destiné à être repris dans une autre
> session (éventuellement un autre modèle). Il est **self-contained** : tout le contexte
> nécessaire est ici, aucune dépendance à la mémoire de la session précédente.
>
> Branche de travail : `claude/boka-site-improvements-1xqpb7` (dépôt `/home/guillaume/perso/slides`).

---

## 0. TL;DR — où on en est

- **boka.re** = site **vitrine** de l'exploitation **BoKa** de Karène, créé avec **Hostinger
  Website Builder** (ex-Zyro). Très peu de trafic.
- **Problème résolu aujourd'hui** : le HTTPS était cassé car les **certificats Let's Encrypt
  avaient expiré** (apex le 30 mai 2026, `www` le 28 juin 2026). Cause : le site était resté
  sur l'ancienne infra Hostinger qui ne renouvelle plus le TLS. **Correctif appliqué** :
  bascule DNS de l'apex + `www` vers `connect.hostinger.com` (nouvelle plateforme Hostinger
  qui réémet automatiquement un cert valide). Voir §2.
- **Objectif stratégique** : **consolider l'hébergement**. Aujourd'hui l'utilisateur paie
  **2 serveurs** : l'hébergement Hostinger (pour boka.re) **+** un **VPS Hetzner** qui fait
  tourner **Daria** (un agent Hermes / NousResearch). But : héberger la vitrine boka.re **sur
  le VPS Hetzner** et **résilier l'hébergement Hostinger** (en gardant juste le domaine).
- **Faisabilité confirmée** : OUI, ressources largement suffisantes (voir §3).
- **Reste à faire** : récupérer/reconstruire le site en statique, déployer via Caddy sur le
  VPS, repointer le DNS vers le VPS, résilier Hostinger. Voir §4 et §6.

---

## 1. Faits confirmés par l'utilisateur (2026-07-04)

- **VPS Hetzner** : petit gabarit, **2–4 Go de RAM** (type CX22 / CPX11).
- **Daria (Hermes agent)** : utilise un **modèle LLM via API distante** (Claude/OpenAI…),
  **pas** de modèle local sur le VPS → empreinte RAM faible (~200–600 Mo).
- **Email @boka.re** : **aucune boîte utilisée**. → migration simplifiée, on peut retirer les
  MX Hostinger sans risque.
- Le site est une **vitrine** (statique dans l'esprit : pas d'appli dynamique connue). À
  reconfirmer s'il y a un **formulaire de contact** (voir §5, piège formulaire).

---

## 2. État DNS — AVANT / APRÈS le correctif d'aujourd'hui

Zone gérée chez **Hostinger** (API `https://developers.hostinger.com/api/dns/v1/zones/boka.re`).

### 2.1 Correctif appliqué aujourd'hui (déjà en production, propagé)

Bascule vers la nouvelle plateforme Hostinger pour débloquer la réémission du certificat :

| Nom  | Type  | Valeur APRÈS (état actuel)   | TTL |
|------|-------|------------------------------|-----|
| `@`  | ALIAS | `connect.hostinger.com.`     | 300 |
| `www`| CNAME | `connect.hostinger.com.`     | 300 |

Le reste de la zone (**mail : MX, SPF, DKIM ×2, DMARC, autodiscover, autoconfig**) est
**intact**.

### 2.2 État AVANT le correctif (pour rollback éventuel)

> ⚠️ La sauvegarde JSON complète était dans un scratchpad **éphémère** (perdu entre sessions).
> Les valeurs d'origine ci-dessous sont donc consignées ici en dur.

| Nom  | Type  | Valeur AVANT                                             | TTL |
|------|-------|----------------------------------------------------------|-----|
| `@`  | ALIAS | `boka.re.cdn.hstgr.net.` **+** `connect.zyrosite.com.`   | 300 |
| `www`| CNAME | `www.boka.re.cdn.hstgr.net.`                             | 300 |

Note : `connect.zyrosite.com` et `connect.hostinger.com` résolvent vers la **même** infra
(`connect.hstgr.net`). L'e-mail Hostinger parlant d'enregistrements `A 34.120.137.41` /
`AAAA 2600:1901:0:84ef::` était **générique/obsolète** : la zone réelle utilisait déjà un
ALIAS à l'apex, pas des A/AAAA en dur.

### 2.3 Vérification à faire au reprise (le cert doit être réémis)

```bash
# Le certificat doit maintenant être VALIDE (notAfter dans le futur, ssl_verify=0)
echo | openssl s_client -connect boka.re:443 -servername boka.re 2>/dev/null | openssl x509 -noout -dates
curl -s -o /dev/null -w "code=%{http_code} ssl_verify=%{ssl_verify_result}\n" https://boka.re/
# ssl_verify=0 = OK ; ssl_verify=10 = encore expiré (X509_V_ERR_CERT_HAS_EXPIRED)
```

Un `ScheduleWakeup` avait été posé pour re-checker la réémission toutes les ~30 min. Si on
reprend dans une nouvelle session, refaire la vérif manuellement ci-dessus. Réémission
Hostinger : quelques minutes à ~2 h après la bascule DNS. Si toujours cassé après ~3 h →
vérifier dans **hPanel → Website Builder → SSL**, ou support Hostinger.

---

## 3. Évaluation des ressources (VPS 2–4 Go, Daria en API distante)

Un site vitrine statique = HTML/CSS/images servis par nginx/Caddy → **~10 Mo RAM, ~0 % CPU au
repos, quelques Mo de disque**. Bilan sur le VPS :

| Poste                                   | RAM typique |
|-----------------------------------------|-------------|
| OS                                      | ~300 Mo     |
| Daria/Hermes (API distante)             | ~200–600 Mo |
| Caddy (reverse-proxy + HTTPS auto)      | ~30 Mo      |
| **Site vitrine statique**               | **~10 Mo**  |
| **Total**                               | **< 1,5 Go**|

→ **Confortable même sur un 2 Go.** La vitrine est négligeable. (Le seul cas où ce serait
tendu : si Daria tournait un **modèle local** — ce **n'est pas** le cas ici.)

---

## 4. Architecture cible sur le VPS Hetzner

**Caddy** en reverse-proxy devant tout (HTTPS Let's Encrypt **automatique** avec
renouvellement auto → plus jamais de cert expiré) :

- `boka.re` + `www.boka.re` → dossier statique `/var/www/boka.re`
- `daria.<domaine>` (ou sous-domaine choisi) → reverse-proxy vers Daria/Hermes (port local)
- **DNS** : apex + `www` de boka.re → **IP du VPS Hetzner** (on retire l'ALIAS
  `connect.hostinger.com` mis aujourd'hui). Retirer aussi les **MX** (pas d'email).
- **Coût** : 0 € de plus sur le VPS. On **résilie l'hébergement Hostinger**, on **garde le
  domaine** (~10–15 €/an) — ou on le transfère vers un registrar moins cher.

Alternative à Caddy : nginx + certbot (plus verbeux, renouvellement à surveiller). **Caddy
recommandé** ici pour la simplicité et l'HTTPS auto.

---

## 5. Comment récupérer le site (le vrai obstacle)

Hostinger Website Builder **n'exporte pas** un site statique propre. Deux voies :

- **Option A — Miroir du rendu** : aspirer le site live en statique.
  ```bash
  # Depuis une machine avec accès réseau au site :
  wget --mirror --convert-links --adjust-extension --page-requisites --no-parent \
       -e robots=off https://boka.re/
  # (ou httrack). Sert ensuite tel quel via Caddy.
  ```
  Marche pour une vraie vitrine. On **perd l'éditeur visuel**. Un éventuel **formulaire de
  contact** devra être remplacé (Formspree, ou un petit handler côté VPS) car le backend du
  formulaire Hostinger ne suivra pas.

- **Option B — Reconstruire en statique amélioré** (**recommandé**) : c'est la **tâche
  d'origine** (voir §7) = auditer + refaire une **landing page améliorée**. Meilleur rendu
  **et** auto-hébergé. On récupère juste l'**identité visuelle** (logo, textes, photos,
  couleurs, coordonnées) du site actuel pour repartir dessus.

**Piège formulaire** : vérifier si le site actuel a un formulaire de contact / réservation.
Si oui, prévoir un remplacement (Formspree gratuit, ou endpoint sur le VPS).

---

## 6. Runbook de déploiement (à exécuter sur le VPS — nécessite accès SSH)

> ⚠️ L'assistant n'avait **pas** d'accès SSH au VPS Hetzner dans la session d'origine (absent
> de `~/.ssh/config`). Pour que l'assistant déploie : fournir un accès SSH. Sinon, l'utilisateur
> exécute ce runbook lui-même.

```bash
# 1. Installer Caddy (Debian/Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# 2. Déposer le site
sudo mkdir -p /var/www/boka.re
# ... copier les fichiers HTML/CSS/images ici ...

# 3. Caddyfile (/etc/caddy/Caddyfile) — HTTPS auto Let's Encrypt
#    boka.re, www.boka.re {
#        root * /var/www/boka.re
#        encode gzip zstd
#        file_server
#        redir https://boka.re{uri}  # canonicaliser www -> apex (optionnel)
#    }
#    daria.EXEMPLE.re {            # sous-domaine pour Daria (optionnel)
#        reverse_proxy localhost:PORT_DARIA
#    }
sudo systemctl reload caddy

# 4. Ensuite seulement : repointer le DNS (voir §6.1) puis vérifier le cert.
```

### 6.1 Bascule DNS finale (via l'API Hostinger, ou hPanel)

- Remplacer l'ALIAS `@` → `connect.hostinger.com` par **A `@` → <IP_VPS>** (+ AAAA si IPv6).
- Remplacer `www` CNAME → **A/CNAME vers le VPS** (ou CNAME `www` → `boka.re`).
- **Supprimer les MX** (pas d'email) — ou les laisser inertes si on préfère.
- Faire la bascule **après** que Caddy réponde déjà en HTTP sur l'IP du VPS, pour que
  Let's Encrypt (ACME) valide immédiatement et émette le cert.

Endpoint API DNS (auth par Bearer token Hostinger) :
`PUT https://developers.hostinger.com/api/dns/v1/zones/boka.re`
Body : `{"overwrite": true, "zone": [ {"name":"@","type":"A","ttl":300,"records":[{"content":"<IP_VPS>"}]}, ... ]}`

### 6.2 Résiliation Hostinger

- Une fois boka.re servi depuis le VPS avec cert valide et vérifié pendant quelques jours :
  **résilier le plan d'hébergement** Hostinger dans hPanel.
- **Garder l'enregistrement du domaine** boka.re (ou le transférer vers un registrar moins
  cher : Gandi, OVH, Cloudflare Registrar…).

---

## 7. Tâche d'origine (toujours à faire) : audit + landing page améliorée

La demande initiale de l'utilisateur : **analyser boka.re** et **proposer des améliorations
sur tous les aspects** (design, offre, conversion, SEO, technique) pour maximiser l'impact
auprès de clients potentiels, puis **générer une landing page améliorée en HTML**.

Cette landing page **est** l'artefact de migration (Option B du §5). Prochaines étapes
concrètes :

1. **Récupérer le contenu réel** du site (maintenant que la machine a un accès réseau, on
   peut fetch `https://boka.re/` — utiliser `-k`/`--insecure` tant que le cert n'est pas
   réémis) : logo, textes, photos, palette, activité exacte de BoKa, coordonnées, CTA.
2. **Auditer** : design, clarté de l'offre, appels à l'action, preuves sociales, SEO
   (title/meta/OpenGraph), performance, accessibilité, mobile.
3. **Produire** une landing page statique améliorée (HTML/CSS autonome) sur la branche
   `claude/boka-site-improvements-1xqpb7`.
4. Cette page servira de site à déployer via Caddy (§6).

---

## 8. Sécurité / à ne pas oublier

- 🔴 **Révoquer le jeton API Hostinger** qui a été collé en clair dans le chat de la session
  d'origine (hPanel → Compte → API), puis en régénérer un si besoin. Un jeton Hostinger donne
  un accès **complet** au compte.
- Ne pas committer de jeton/secret dans le dépôt.

---

## 9. Récap décision

| Question                                          | Réponse |
|---------------------------------------------------|---------|
| Migrer boka.re sur le VPS Hetzner est-il possible ? | **Oui** |
| Les ressources (2–4 Go, Daria en API) suffisent ?  | **Oui, large marge** |
| Email à préserver ?                                | **Non** |
| Gain financier                                     | **= coût du plan d'hébergement Hostinger** (on garde juste le domaine) |
| Principal effort                                   | Récupérer/reconstruire le site (Website Builder n'exporte pas) + déployer Caddy |
| Bénéfice bonus                                     | HTTPS auto-renouvelé (fini les certs expirés) |
