# Audit du site boka.re & refonte proposée

> Analyse du site actuel (Hostinger Website Builder / Zyro) et refonte livrée dans `site/`.
> Rédigé le 2026-07-04. Objectif : maximiser l'impact auprès de clients potentiels
> (particuliers, points de vente, marchés) et préparer l'auto-hébergement sur le VPS.

## Ce qu'est BoKa (rappel factuel, tiré du site actuel)
Exploitation familiale de **polyculture & élevage en agroécologie**, hauts de la **Chaloupe,
Saint-Leu (La Réunion)**. Créée par les grands-parents dans les années 40, reprise par le père
(élevage), aujourd'hui en diversification familiale. Produits : **huile essentielle & hydrolat
de Géranium Bourbon Rosat** (PAPAM), plantes séchées, **fruits tempérés** (prunes/pommes/poires)
sans intrant. Contact : `boka.reunion+hello@gmail.com`, `+33 6 52 39 77 94`,
Instagram `@bok_agriculture`, Facebook. Labels AB & HVE « en cours ». Partenaires ARMEFLHOR,
Département 974.

---

## Problèmes constatés sur le site actuel

### SEO & partage (priorité haute)
| Constat | Impact |
|---|---|
| `<title>` = « **Accueil** » | Aucune requête Google ne matche ; invisible sur « huile essentielle géranium Réunion ». |
| `<meta name="description">` absente | Google génère un extrait au hasard ; faible taux de clic. |
| `og:image` **vide** | Aucun visuel au partage sur WhatsApp/Facebook/Insta → posts ternes, peu cliqués. |
| Pas de données structurées | Pas d'éligibilité aux résultats enrichis (fiche établissement local). |

### Offre & conversion
- Les **produits** (le cœur de l'activité commerciale) sont noyés dans le récit ; pas de bloc
  clair « voici ce qu'on vend ».
- **« Où trouver nos produits ? »** est posé mais sans réponse ni appel à l'action fort.
- Aucun **CTA** proéminent (contact / commande) ; le téléphone et l'e-mail sont relégués en bas.
- Contenu **daté** : « Certifications prévues en **juillet 2024** » (on est en 2026) → décrédibilise.

### Design & expérience
- Rendu générique « template builder », peu d'identité malgré une matière visuelle superbe
  (paysage de la Chaloupe, illustration géranium).
- Hiérarchie visuelle faible ; peu de respiration ; pas de parcours guidé.

### Technique & coût
- Dépendance totale à **Zyro/Hostinger** (images sur `assets.zyrosite.com`, HTML non exportable).
- **Certificats TLS expirés** (cause : ancienne infra) → « connexion non privée » pour les
  visiteurs. *(Corrigé côté DNS le 2026-07-04, voir `BOKA-MIGRATION-PLAN.md`.)*
- Page d'accueil **~149 Ko** de HTML généré (bloat du builder).

---

## Ce que la refonte (`site/index.html`) apporte

**Design.** Charte tirée de la vraie identité : **vert forêt + rose géranium + crème**,
titrage en serif éditorial (registre patrimoine/terroir), photo de la Chaloupe en hero
plein cadre, parcours clair Hero → Confiance → Produits → Démarche → Histoire → Labels → Contact.

**Offre lisible.** Un bloc **« Nos produits »** en 4 cartes (HE géranium, hydrolat, plantes
séchées, fruits) = on comprend en 5 secondes ce qu'on peut acheter.

**Conversion.** CTA proéminents (« Découvrir nos produits », « Où nous trouver ? »,
« Nous contacter »), bloc contact riche (e-mail, tél cliquable, Instagram, localisation),
liens sociaux visibles.

**SEO.** `<title>` descriptif + `meta description`, Open Graph complet **avec image**
(la Chaloupe), `canonical`, `lang="fr"`, et **données structurées `LocalBusiness`**
(nom, adresse Saint-Leu/974, contact, réseaux) pour le référencement local.

**Indépendance & perf.** **Zéro dépendance externe** : visuels servis en local (`assets/`),
polices système (rapide, respectueux RGPD, pas de Google Fonts), un seul fichier HTML léger,
images en `loading="lazy"`. Prêt à servir tel quel par Caddy/nginx sur le VPS.

**Accessibilité.** HTML sémantique, `alt` sur les images, contrastes soignés,
`prefers-reduced-motion` respecté.

---

## À confirmer / compléter par Karène (ne pas inventer)
- **Statut réel des labels AB / HVE** (obtenus ? en cours ?) → j'ai neutralisé la date de 2024
  en « Démarche engagée ». À ajuster selon la réalité.
- **Points de vente / marchés** : ajouter la vraie réponse à « Où trouver nos produits ? »
  (marchés forains, magasins, vente directe, jours/horaires).
- **Prix / conditionnements** des HE et hydrolats, si vente directe.
- **WhatsApp** : le numéro est un mobile ; un bouton WhatsApp (`https://wa.me/33652397794`)
  boosterait la prise de contact — à activer si utilisé.
- **Orthographe partenaire** : logo « ARMEFLHOR » (association réunionnaise) — vérifier le nom exact.
- **Pages secondaires** de l'ancien site (produits détaillés, tableau composition HE, presse) :
  à recréer si besoin, ou tout regrouper sur cette page unique.

## Prochaines étapes techniques
Voir `BOKA-MIGRATION-PLAN.md` : déploiement Caddy sur le VPS Hetzner, bascule DNS vers l'IP du
VPS, HTTPS Let's Encrypt automatique, puis résiliation de l'hébergement Hostinger.
