# ClicVote — Vote en ligne & diffusion d'événements en direct

## Positionnement

Plateforme ivoirienne permettant au public de voter pour les candidats d'un
concours (Miss, télé-crochet, awards, compétition sportive…) et de suivre la
finale en direct, avec classement temps réel et chat modéré.

## Fonctionnalités principales

### Public

- **Découverte** : catalogue des concours, filtres par catégorie et par statut,
  page dédiée aux diffusions en direct.
- **Vote hybride** :
  - un **vote gratuit** par concours et par compte, renouvelé après un délai
    paramétré par l'organisateur (24 h par défaut) ;
  - des **packs de votes payants** réglés par Mobile Money ou carte bancaire.
- **Classement temps réel** : les scores se mettent à jour à la seconde via les
  listeners Firestore ; l'organisateur peut les masquer jusqu'à la proclamation.
- **Diffusion en direct** : player embarqué (YouTube, Facebook, Vimeo, HLS ou
  iframe), avec paywall optionnel, chat modéré et panneau de vote intégré.
- **Espace personnel** : historique des votes, accès aux directs achetés,
  suivi des paiements.

### Organisateur

- Création et cycle de vie du concours (brouillon → publié → votes ouverts →
  clôturé → terminé).
- Gestion des candidats : dossard unique, photo, présentation, élimination.
- Configuration des packs de votes et du vote gratuit.
- Régie du direct : lancement/arrêt de l'antenne, changement de flux à chaud,
  modération du chat, prévisualisation.
- Statistiques : votes, revenus, meilleures compétitions, commandes.
- Assistant de rédaction (Genkit / Gemini) pour la présentation du concours.

### Administration

- Vue consolidée de la plateforme : revenus, votes, organisateurs, membres.
- Supervision des concours et des commandes, avec détection des montants
  incohérents.
- Gestion des utilisateurs, des catégories et des commissions.

## Architecture

- **Next.js 15** (App Router, Server Actions) et **React 18**.
- **Firestore** pour les données ; le SDK Admin côté serveur porte toutes les
  écritures, le SDK client est en lecture seule pour le temps réel.
- **NextAuth** (JWT) pour les sessions et les rôles.
- **Paiement Pro** pour l'encaissement, avec webhook idempotent et validation
  serveur du montant.
- **Cloudinary** pour les visuels, **Resend** pour les e-mails transactionnels.

## Intégrité du scrutin

- Prix et nombre de votes lus exclusivement depuis Firestore : le client ne peut
  pas les manipuler.
- Vote gratuit protégé par un document de suivi et une transaction atomique.
- Compteurs mis à jour par `FieldValue.increment` à l'intérieur de transactions.
- Webhook rejouable sans double crédit : vote et accès live portent
  l'identifiant de la commande.
- Écart entre montant payé et montant attendu → commande marquée `FLAGGED`.

## Style

- Couleur primaire : orange vif (#FF9500), énergie et culture ivoirienne.
- Accent secondaire : rouge « direct » pour les diffusions en cours.
- Police de titres : **Poppins** ; police de texte : **PT Sans**.
- Icônes Lucide, composants shadcn/ui, thèmes clair et sombre.
- Mise en page responsive, pensée mobile d'abord (usage majoritaire du public).
