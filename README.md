# PokePlant

Une aventure botanique en français : photographie une plante, confirme une proposition de Pl@ntNet et ajoute une nouvelle espèce à ton Plantédex. Site web responsive installable comme une application (PWA), sans passer par une boutique.

Le précédent prototype Expo a été remplacé par React + TypeScript + Vite. L’identité graphique et les illustrations SVG sont originales ; le projet n’est pas affilié à Pokémon.

## Site en ligne

[Ouvrir PokePlant](https://melodious-pegasus-01724c.netlify.app).

Le site est publié sur Netlify depuis la branche `main`. Supabase Auth et les fonctions autorisent cette origine HTTPS ; les adresses locales restent disponibles pour le développement.

Parcours validés le 20 octobre 2026 :

- Compilation de production et 45 tests unitaires réussis.
- Connexion Google, identification réelle et capture conservée après rechargement, confirmées par le propriétaire sur l’aperçu local.
- Connexion Google sur le site public et récupération de la même collection sur téléphone, confirmées par le propriétaire.
- Site public accessible en HTTPS et prérequêtes CORS des deux fonctions acceptées depuis son origine.

La suppression complète d’un compte et l’isolation entre deux comptes restent à tester de bout en bout. Le parcours e-mail nécessite encore la configuration et la validation d’un SMTP pour une ouverture au public ; utiliser Google en attendant. Vérifier également les conditions et l’attribution Pl@ntNet avant une ouverture à grande échelle.

## Ce qui est inclus

- Accueil « carnet d’explorateur », 37 fiches botaniques de départ, recherche sans accents et filtres.
- Captures de **toute espèce reconnue**, pas seulement les 37 fiches de départ.
- Photo prise avec l’appareil photo uniquement (pas d’import depuis la galerie) ; conversion JPEG, réduction à 1600 px maximum et retrait des métadonnées avant envoi.
- Consentement à l’envoi vers Pl@ntNet, jusqu’à 5 suggestions et confirmation explicite. Aucune identification fictive.
- Connexion Google et comptes e-mail/mot de passe, confirmation par mail et réinitialisation via Supabase.
- Collection et photos privées, synchronisées entre appareils par Supabase avec politiques d’accès côté serveur.
- Une capture par espèce et par compte : **100 XP par nouvelle espèce**, **300 XP par niveau**, 6 badges.
- Export JSON du carnet (sans les fichiers photo), déconnexion et suppression du compte et des photos.
- Manifest, icônes PNG et service worker : installation sur Android/ordinateur et ajout à l’écran d’accueil sur iOS.
- Le service worker met seulement l’interface en cache, **jamais les réponses API ni les photos privées**. Internet reste nécessaire pour les comptes, les scans et la sauvegarde ; pas de capture hors ligne.

## Démarrage local

Prérequis : Node.js 22.12+ ou 24 LTS et npm. Sous Windows, utiliser `npm.cmd` si PowerShell bloque `npm.ps1`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Ouvrir l’URL affichée (normalement `http://127.0.0.1:5173`).

Sans configuration, le site affiche explicitement un **aperçu** : fiches et interface accessibles, mais aucun faux compte ni fausse capture. L’aperçu ne prouve pas le fonctionnement des services distants.

## Activer les comptes, les photos et le scan

Suivre le [guide backend](docs/backend.md) pour créer un projet Supabase, appliquer la migration et déployer les fonctions. Créer également une clé sur [Pl@ntNet pour développeurs](https://my.plantnet.org/).

1. Copier `.env.example` vers `.env.local`.
2. Renseigner **uniquement** l’URL publique du projet et sa clé publique publishable (ou anon) :

```dotenv
VITE_SUPABASE_URL=https://identifiant-du-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=cle-publique-publishable
```

3. Configurer côté serveur la clé Pl@ntNet et les origines autorisées (voir guide).
4. Relancer Vite ; les variables `VITE_` sont intégrées à la compilation.
5. Dans Supabase Auth, configurer le Site URL et les URL de redirection autorisées, dont l’origine locale réellement utilisée. Activer la confirmation e-mail.

**Ne jamais mettre une clé `service_role`, `sb_secret_…` ou la clé Pl@ntNet dans une variable `VITE_`, dans le frontend ou dans Git.** Les fichiers `.env` sont ignorés.

Les e-mails du service Auth intégré à Supabase sont limités et peuvent être restreints aux adresses de l’équipe tant qu’un SMTP n’est pas configuré. Pour une ouverture au public, configurer et tester un fournisseur SMTP et ses limites gratuites. Une inscription ne doit pas être annoncée comme disponible au public avant ce test.

La connexion **Google** nécessite l’activation du fournisseur Google dans Supabase et un client OAuth Web dans Google Cloud. Son URL de callback est `https://identifiant-du-projet.supabase.co/auth/v1/callback` (pas l’URL du frontend). Le secret OAuth est à renseigner uniquement dans Supabase, jamais dans les variables `VITE_`. Google ne nécessite pas de SMTP pour la connexion ; le parcours e-mail/mot de passe, lui, en a besoin pour le public. Les deux fournisseurs doivent être configurés et testés séparément.

## Gratuit, dans des limites explicites

Le code n’exige aucun abonnement. Les services externes restent soumis à leurs offres, conditions et évolutions :

- [Pl@ntNet](https://my.plantnet.org/pricing) : vérifier le quota et l’attribution requis par l’offre gratuite avant ouverture. Le backend impose un plafond conservateur de **450 essais par jour pour tout le site**, et **20 par compte**, sans passage automatique à une offre payante. Les essais échoués après réservation du quota comptent aussi.
- [Supabase Free](https://supabase.com/pricing) : limites de stockage, trafic, base et e-mails. Les projets gratuits peuvent être suspendus selon les règles du fournisseur. Les photos compressées limitent l’espace utilisé mais ne le rendent pas illimité.
- Hébergement statique : Netlify, Cloudflare Pages ou Vercel selon l’usage et leurs conditions. Choisir un sous-domaine gratuit ; un nom de domaine personnalisé n’est pas nécessaire.

Les fonctions renvoient une erreur explicite si un quota est atteint. Aucun dépassement payant n’est activé par le code. Il appartient au propriétaire de ne pas activer de facturation automatique chez ses fournisseurs.

## Déploiement du site

La configuration [Netlify](netlify.toml) est fournie :

1. Connecter ce dépôt dans Netlify avec l’offre gratuite adaptée à l’usage.
2. Build : `npm run build` ; répertoire publié : `dist` ; Node 24.
3. Définir les deux variables publiques `VITE_SUPABASE_*` dans l’hébergement, puis déployer.
4. Ajouter l’origine HTTPS finale aux redirections Supabase Auth et à `ALLOWED_ORIGINS` des fonctions, puis redéployer les fonctions si nécessaire.
5. Tester inscription/confirmation, connexion, réinitialisation, scan, capture, reconnexion, accès à un second compte et suppression sur **le vrai domaine**.

Cloudflare Pages et Vercel peuvent publier le même dossier `dist`. Configurer un repli SPA vers `index.html` si l’hébergeur le demande.

### Installer comme une application

- Android / Chrome / Edge : menu du navigateur → Installer l’application.
- iPhone / iPad : Safari → Partager → Sur l’écran d’accueil → Ajouter.
- La PWA doit être servie en HTTPS, hors exception locale `localhost`/`127.0.0.1`.
- Lors d’une mise à jour, une notification propose de recharger ; finir une capture avant de mettre à jour.
- Un téléphone ne peut pas utiliser le `localhost` de ton ordinateur. Pour tester son appareil photo et l’installation sur téléphone, utiliser le déploiement HTTPS.

## Validation

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

Les tests unitaires couvrent les seuils exacts de XP/niveaux/badges, les doublons, la recherche, le format des résultats, les erreurs de sauvegarde et les limites de fichiers. Les services Supabase/Pl@ntNet ne peuvent être validés de bout en bout qu’avec un projet configuré ; suivre également les tests du guide backend.

Les icônes sont incluses. Pour les régénérer sans outil externe :

```powershell
npm.cmd run icons
```

## Limites assumées

- Pas de diagnostic de santé, de conseil médical, de garantie de comestibilité, d’entretien ni de fonctionnalités sociales.
- Pas d’import HEIC : exporter les photos iPhone en JPEG si le navigateur ne les fournit pas déjà ainsi.
- Une seule capture conservée par nom scientifique normalisé. Pl@ntNet peut utiliser des synonymes botaniques ; des noms distincts ne sont pas automatiquement fusionnés.
- Jeu solo, pas de classement compétitif : l’utilisateur confirme une suggestion. Ce n’est pas un système anti-triche ni une base de preuves scientifiques.
- Les badges et XP sont calculés depuis la collection actuelle, pas depuis des événements historiques.
- Ne pas cueillir les plantes pour jouer ; respecter les propriétés et espaces protégés.
