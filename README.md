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
npm run genkit:dev # flows Genkit (assistant de rédaction)
```

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `AUTH_SECRET` | Secret de signature des sessions NextAuth |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Compte de service Firebase encodé en base64 (recommandé) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Alternative au compte de service encodé |
| `FIREBASE_STORAGE_BUCKET` | Bucket de stockage Firebase |
| `NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID` | Identifiant marchand Paiement Pro |
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
│   └── api/payment/      Webhook Paiement Pro
├── components/           Composants d'interface (player, chat, classement, formulaires)
├── firebase/             SDK client Firestore et hooks temps réel
└── lib/                  Types, utilitaires, e-mails
```

## Modèle de sécurité

L'authentification repose sur NextAuth, pas sur Firebase Auth. Le SDK Firestore
client est donc **strictement en lecture seule** (`firestore.rules`) et sert
uniquement aux affichages temps réel. Toutes les écritures passent par des
Server Actions qui vérifient la session et le rôle via le SDK Admin.

Voir `docs/blueprint.md` pour la spécification produit et `docs/backend.json`
pour le modèle de données.

## Déploiement

Déploiement des règles et index Firestore :

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
