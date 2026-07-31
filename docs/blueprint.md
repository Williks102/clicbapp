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
- **Diffusion seule** : un événement peut être retransmis sans scrutin. Il
  figure alors sur la page des diffusions, hors du catalogue des concours.
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
- **PostgreSQL / Supabase** pour les données ; la clé `service_role` porte
  toutes les écritures côté serveur, la clé `anon` est en lecture seule et
  alimente le temps réel (classement, chat).
- **NextAuth** (JWT) pour les sessions et les rôles, mots de passe en bcrypt.
- **Paystack** pour l'encaissement (Orange, MTN, Moov, carte), avec
  initialisation de serveur à serveur, webhook signé et idempotent.
- **Cloudinary** pour les visuels, **Resend** pour les e-mails transactionnels.

## Intégrité du scrutin

- Prix et nombre de votes lus exclusivement depuis la base : le client ne peut
  pas les manipuler.
- Dossards uniques et accès aux directs non dupliqués : contraintes SQL.
- Compteurs de votes maintenus par triggers depuis la table `votes`.
- Vote gratuit : délai d'attente et enregistrement dans une seule transaction
  (`cast_free_vote`).
- Webhook idempotent et revalidation du montant (`confirm_order_payment`).
- Écart entre montant payé et montant attendu → commande marquée `FLAGGED`,
  aucun vote crédité.

## Style

- Couleur primaire : orange vif (#FF9500), énergie et culture ivoirienne.
- Accent secondaire : rouge « direct » pour les diffusions en cours.
- Police de titres : **Poppins** ; police de texte : **PT Sans**.
- Icônes Lucide, composants shadcn/ui, thèmes clair et sombre.
- Mise en page responsive, pensée mobile d'abord (usage majoritaire du public).
