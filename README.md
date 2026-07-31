# ClicVote

Plateforme de **vote en ligne** et de **diffusion d'événements en direct** :
le public soutient ses candidats favoris (vote gratuit ou packs payants) et suit
la finale en direct, avec classement temps réel et chat modéré.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:9003
```

Autres scripts utiles :

```bash
npm run build      # build de production
npm run typecheck  # vérification TypeScript
npm test           # signature du webhook, montants, URL de diffusion
npm run genkit:dev # flows Genkit (assistant de rédaction)
```

## Mise en place de la base (Supabase)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Appliquez le schéma — via la CLI :

   ```bash
   supabase link --project-ref <votre-ref>
   supabase db push          # applique supabase/migrations/
   ```

   …ou en collant le contenu de `supabase/migrations/20260728120000_init.sql`
   puis de `supabase/seed.sql` dans l'éditeur SQL du tableau de bord.

3. Créez un compte administrateur, au choix.

   **Depuis l'éditeur SQL** — `pgcrypto` produit un hachage bcrypt que
   l'application sait relire, aucune installation locale n'est nécessaire :

   ```sql
   insert into users (name, email, password_hash, role)
   values (
     'Nom Admin',
     'admin@exemple.ci',
     crypt('motdepasse-solide', gen_salt('bf', 12)),
     'admin'
   );
   ```

   Pour promouvoir un compte déjà inscrit via `/signup` :

   ```sql
   update users set role = 'admin' where email = 'admin@exemple.ci';
   ```

   **Ou en local**, avec `NEXT_PUBLIC_SUPABASE_URL` et
   `SUPABASE_SERVICE_ROLE_KEY` dans un `.env` :

   ```bash
   npm run create-admin admin@exemple.ci "motdepasse-solide" "Nom Admin"
   ```

   Le rôle est inscrit dans la session à la connexion : après une promotion,
   déconnectez-vous puis reconnectez-vous.

Le schéma active la réplication temps réel sur `competitions`, `candidates` et
`chat_messages` : rien d'autre à configurer pour le classement et le chat.

Pour contrôler l'installation, exécutez `supabase/check-install.sql` dans
l'éditeur SQL : chaque ligne doit afficher `OK`.

Les privilèges des rôles `anon` et `service_role` sont accordés par la
migration. Sur une base créée avant leur ajout, exécutez `supabase/grants.sql` :
sans ces privilèges, PostgreSQL refuse l'accès aux tables avant même
d'évaluer les politiques RLS, et l'application ne peut rien lire ni écrire.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, utilisée par le navigateur (lecture seule) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur, contourne RLS — **ne jamais exposer au client** |
| `AUTH_SECRET` | Secret de signature des sessions NextAuth |
| `PAYSTACK_SECRET_KEY` | Clé secrète Paystack — une seule variable pour les deux modes : `sk_test_…` en recette, `sk_live_…` en production. **Jamais préfixée `NEXT_PUBLIC_`** |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary — **requis** par le widget d'envoi d'images |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset d'upload Cloudinary, en mode **unsigned** — obligatoire, l'envoi n'est pas signé côté serveur |
| `RESEND_API_KEY` | Envoi des e-mails de confirmation |
| `NEXT_PUBLIC_BASE_URL` | URL publique du site : retour après paiement et liens des e-mails. À défaut, le domaine exposé par Vercel est utilisé |
| `CRON_SECRET` | Protège `/api/cron/maintenance`. **Sans elle, l'entretien périodique est refusé** |

## Structure

```
src/
├── app/
│   ├── actions/          Server Actions (concours, candidats, votes, commandes, direct, chat)
│   ├── competitions/     Pages publiques : concours, candidats, tunnel de vote, direct
│   ├── live/             Liste des diffusions
│   ├── dashboard/        Espace organisateur
│   ├── admin/            Back-office plateforme
│   └── api/payment/      Webhook Paystack
├── components/           Composants d'interface (player, chat, classement, formulaires)
├── hooks/
│   └── use-realtime-query.ts   Lecture + abonnement temps réel Supabase
└── lib/
    ├── supabase/         Clients, types de lignes SQL et convertisseurs
    └── types.ts          Types applicatifs (camelCase) utilisés par l'interface

supabase/
├── migrations/           Schéma, triggers, fonctions et politiques RLS
└── seed.sql              Catégories de référence
```

## Dépendances forcées

Le bloc `overrides` de `package.json` impose des versions corrigées à quatre
dépendances transitives. Elles ne remontent pas d'elles-mêmes : `dotprompt`
reste figé et entraîne un `handlebars` vulnérable jusque dans la dernière
version de Genkit, et le reste vient de la chaîne Firebase que Genkit
réintroduit pour l'assistant de rédaction.

| Paquet | Vulnérabilité corrigée | Amené par |
| --- | --- | --- |
| `handlebars` | injection de code via templates partiels | `genkit → dotprompt` |
| `websocket-driver` | contournement des limites de ressources | `genkit → firebase` |
| `fast-xml-parser` | expansion d'entités et dépassement de pile | `genkit → firebase-admin` |
| `protobufjs` | exécution de code arbitraire | `genkit-cli` (développement) |

Ces contraintes sont à réexaminer à chaque montée de Genkit : elles deviendront
inutiles le jour où l'amont livrera les versions corrigées.

## Modèle de sécurité

L'authentification repose sur NextAuth (mots de passe hachés en bcrypt dans la
table `users`), pas sur Supabase Auth. Le navigateur n'utilise que la clé
`anon`, dont les politiques RLS n'autorisent que la **lecture** des données
publiques : concours publiés, candidats, chat, catégories, profils
d'organisateurs. Toutes les écritures passent par des Server Actions qui
vérifient session et rôle avec la clé `service_role`.

## Intégrité du scrutin

Garanties portées par la base, et non par le code applicatif :

- **Dossards uniques** — contrainte `unique (competition_id, number)`.
- **Compteurs de votes** — maintenus par triggers depuis la table `votes` ;
  aucune dérive possible entre les votes et les totaux affichés.
- **Vote gratuit** — la fonction `cast_free_vote` contrôle le délai d'attente
  et enregistre le vote dans une seule transaction : deux requêtes simultanées
  ne peuvent pas produire deux votes.
- **Paiements** — `confirm_order_payment` est idempotente et revalide le
  montant ; un webhook rejoué ne crédite jamais deux fois, et un montant
  incohérent bascule la commande en `FLAGGED` sans créditer de votes.
- **Accès aux directs** — `unique (user_id, competition_id)`.
- **Commandes abandonnées** — `expire_stale_orders` clôt les commandes restées
  en attente au-delà de 24 h. Le statut `EXPIRED` reste réversible : un
  règlement confirmé tardivement par Paystack crédite quand même les votes.

## Événements sans vote

Le vote est facultatif. Un événement peut se limiter à une diffusion en direct :
la fenêtre de scrutin devient alors inutile, aucun candidat n'est attendu, et
les packs de votes ne sont pas demandés. La contrainte `event_offers_something`
impose seulement qu'un événement porte l'un des deux — vote ou diffusion.

Ces événements apparaissent sur `/live` mais **pas** dans le catalogue des
concours : on ne propose pas de voter là où il n'y a rien à voter. Le refus est
également porté par la base — `cast_free_vote` lève `VOTING_DISABLED` — de sorte
qu'aucune voie d'appel ne peut enregistrer un vote sur une retransmission.

## Entretien périodique

`/api/cron/maintenance` clôt les commandes abandonnées et purge les compteurs
de limitation de débit. Il est déclenché une fois par jour par le planificateur
déclaré dans `vercel.json` et s'authentifie par `CRON_SECRET` : sans ce secret,
le point d'entrée refuse toute requête plutôt que de rester ouvert.

## Résistance aux tentatives répétées

La connexion et l'inscription sont limitées en débit, par adresse IP **et** par
adresse e-mail : la première borne le balayage de plusieurs comptes, la seconde
l'essai de mots de passe sur un compte précis. Les compteurs vivent dans la
table `auth_throttle` et non en mémoire — les instances serverless ne partagent
rien et sont recyclées en permanence, si bien qu'un compteur en mémoire se
réinitialise à chaque démarrage à froid.

Le contrôle est appliqué dans `authorize`, et non dans la page de connexion :
le point d'entrée NextAuth est public et s'appelle directement.

## Adresses de diffusion

Les URL de direct et de rediffusion finissent dans le `src` d'une iframe.
`checkLiveUrl` impose HTTPS et restreint les hôtes à ceux autorisés par
`frame-src` dans la Content Security Policy — un domaine hors de cette liste
serait de toute façon bloqué par le navigateur, sans message pour
l'organisateur. La liste des deux fichiers doit rester alignée.

Voir `docs/blueprint.md` pour la spécification produit et `docs/backend.json`
pour le modèle de données.

## Déploiement

L'application est un projet Next.js standard : elle se déploie sur Vercel comme
sur Firebase App Hosting (`apphosting.yaml`).

Déclarez toutes les variables du tableau ci-dessus chez l'hébergeur, puis
**relancez un déploiement** : les variables `NEXT_PUBLIC_*` sont intégrées au
build et ne sont pas prises en compte tant que le projet n'est pas reconstruit.

`AUTH_SECRET` est indispensable — sans elle, aucune session ne peut être
signée et la connexion échoue. Générez-la avec :

```bash
openssl rand -base64 32
```
