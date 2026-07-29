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
npm run test:paystack  # signature du webhook et conversion des montants
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
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset d'upload Cloudinary |
| `RESEND_API_KEY` | Envoi des e-mails de confirmation |
| `NEXT_PUBLIC_BASE_URL` | URL publique, utilisée dans les e-mails |

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
