# Configuration du backend

## Projet gratuit

Créer un projet Supabase Free, sans activer de facturation automatique. Ne jamais publier les clés secrètes. L'URL et la clé publishable seules vont dans le frontend.

## Base et stockage

Dans SQL Editor, exécuter une seule fois le contenu de
`supabase/migrations/202610200001_pokeplant.sql`.
Cette migration crée les captures, le bucket privé et les politiques d'accès par propriétaire. Elle ne doit pas être exécutée sur une base contenant déjà ces objets sans vérifier son état.

Seconde migration : `supabase/migrations/202610200002_leaderboard.sql` (classement top 10 sur inscription volontaire : table `leaderboard_profiles` + fonction `get_leaderboard()`, réservée aux utilisateurs connectés).

Troisième migration : `supabase/migrations/202610210003_friends.sql` (profils et demandes d’amitié, progression entre amis et accès aux photos uniquement après acceptation). Les fonctions SQL contrôlent le compte connecté ; les politiques RLS des captures et du stockage empêchent l’accès aux non-amis.

Quatrième migration : `supabase/migrations/202610210004_replace_capture.sql` (remplacement transactionnel d’une capture existante par une nouvelle photo, sans attribuer d’XP supplémentaire). Elle doit être appliquée avant de publier la version qui propose le remplacement.

La fonction SQL de quota est réservée au rôle serveur : 20 essais par compte et par jour UTC, 450 pour tout le site. Une réservation compte même si le service externe échoue. Les compteurs anciens sont purgés après 7 jours.

## Fonctions Edge

Déployer `identify-plant` et `delete-account` avec le dossier partagé `_shared`. Le contrôle JWT de la passerelle est désactivé dans `supabase/config.toml` car chaque fonction valide explicitement le jeton utilisateur avec Supabase Auth `getUser`. Ne pas retirer cette validation.

Avec une CLI Supabase configurée :

```powershell
supabase login
supabase link --project-ref VOTRE_PROJET
supabase db push
supabase functions deploy identify-plant
supabase functions deploy delete-account
```

Ne pas lancer `db push` après avoir appliqué manuellement la même migration sans réconcilier l'historique. Les fonctions peuvent aussi être déployées dans l'éditeur du dashboard avec leurs imports partagés.

Dans Edge Functions > Secrets, saisir directement :

- `PLANTNET_API_KEY` : clé du compte développeur Pl@ntNet.
- `ALLOWED_ORIGINS` : origines exactes séparées par des virgules, sans slash final.

Exemple local : `http://127.0.0.1:4173,http://127.0.0.1:5173,http://localhost:5173`.
Après publication, ajouter la vraie origine HTTPS du site.

Les clés Supabase serveur proviennent uniquement des variables réservées de Supabase. Le code prend en charge les variables historiques et les nouveaux dictionnaires `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`.

## Authentification

Activer les inscriptions et la confirmation e-mail. Configurer un SMTP pour les inscriptions publiques par e-mail et tester son quota ; le service intégré peut être réservé aux membres de l'équipe.

Pour Google : créer un client OAuth de type Application Web et utiliser
`https://VOTRE_PROJET.supabase.co/auth/v1/callback` comme URI de redirection Google.
Saisir l'ID et le secret directement dans Supabase Auth > Providers > Google.
Configurer l'écran de consentement externe, les utilisateurs de test si nécessaires, puis la publication Google avant ouverture générale. Ne demander que les scopes d'identité standards.

Dans Auth > URL Configuration, Site URL est la vraie adresse du frontend. Les Redirect URLs doivent inclure les origines réellement utilisées localement et en production. `127.0.0.1` n'est jamais une adresse de site public.

## Contrats

- `identify-plant` : POST multipart `image` JPEG <= 5 Mo, `organ` parmi auto/leaf/flower/fruit/bark ; bearer utilisateur requis. Réponse `{ candidates: [{ scientificName, commonName, family, score }] }`, 1 à 5 résultats. Erreurs `{ error: string }`.
- `delete-account` : POST JSON `{ "confirmation": "SUPPRIMER" }`, bearer utilisateur requis. Supprime les photos avant le compte ; une erreur partielle demande explicitement de réessayer.
- Aucun GPS envoyé par le frontend, photo réencodée et métadonnées retirées. Le serveur contrôle format, signature et taille ; l'identification reste indicative.

## Vérifications avant ouverture

1. Connexion Google et e-mail, confirmation et récupération du mot de passe.
2. Scan d'une vraie photo, confirmation, sauvegarde, reconnexion et persistance.
3. Deux comptes distincts ne peuvent pas lire ni modifier leurs collections respectives.
4. Un appel anonyme aux captures ne divulgue aucune ligne ; un scan sans jeton renvoie 401.
5. Une origine non autorisée ne reçoit pas d'autorisation CORS.
6. Un doublon d'espèce ne donne pas de nouvelle capture ni de nouveaux XP.
7. Suppression d'un compte de test : compte, lignes et photos supprimés.
8. Vérifier les conditions gratuites et l'attribution Pl@ntNet avant publication ; ne pas considérer le plafond local comme une garantie tarifaire du fournisseur.

Les fichiers seuls ne prouvent pas le déploiement. Vérifier les réponses réelles du projet et le parcours complet avant d'annoncer le service opérationnel.
