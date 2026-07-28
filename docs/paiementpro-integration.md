# Intégration Paiement Pro

## Principe

Deux tunnels de paiement partagent la même mécanique :

- **`VOTE_PACK`** : achat d'un pack de votes pour un candidat ;
- **`LIVE_ACCESS`** : achat de l'accès à une diffusion en direct payante.

Chaque tunnel crée une commande `PENDING` côté serveur avant d'appeler le SDK
Paiement Pro. La référence de paiement **est** l'identifiant du document
`orders/{reference}`.

## Flux

1. **Initialisation côté serveur** (`initializeVotePackOrder` /
   `initializeLiveAccessOrder`, dans `src/app/actions/order-actions.ts`) :
   - vérification du concours, du candidat et de la fenêtre de vote ;
   - lecture du **prix et du nombre de votes depuis Firestore** — jamais depuis
     le client ;
   - génération d'une `referenceNumber` unique ;
   - création de la commande avec le statut `PENDING`.
2. **Redirection** (`redirectToPayment`, dans `src/hooks/use-paiementpro.ts`) :
   le client ne transmet à la passerelle que des données déjà validées par le
   serveur. `returnContext` ne sert qu'au débogage.
3. **Webhook** (`src/app/api/payment/webhook/route.ts`), idempotent :
   - la commande est retrouvée par `referenceNumber` ;
   - une commande qui n'est plus `PENDING` est ignorée ;
   - un montant différent de celui calculé côté serveur marque la commande
     `FLAGGED` et interrompt le traitement ;
   - les votes sont crédités par transaction Firestore, avec un document de vote
     portant l'identifiant de la commande — un rejeu ne double jamais le crédit ;
   - l'accès au direct est créé sous le même identifiant de commande ;
   - la commande passe `PAID`, puis l'e-mail de confirmation est envoyé (son
     échec n'invalide jamais le paiement).
4. **Retour utilisateur** (`/vote/success?reference=…`) : la page interroge le
   statut de la commande et poursuit l'attente tant que le webhook n'a pas été
   reçu.

## Mapping des champs Paiement Pro

- `amount` : montant total (F CFA), calculé côté serveur
- `description` : obligatoire
- `channel` : `MOBILE_MONEY_CI` ou `CARD`
- `countryCurrencyCode` : `952`
- `referenceNumber` : obligatoire et unique — identifiant de la commande
- `customerEmail`, `customerFirstName`, `customerLastname`, `customerPhoneNumber`
- `notificationURL` : `/api/payment/webhook`
- `returnURL` : `/vote/success?reference=…`
- `returnContext` : métadonnées minimales

## Variables d'environnement

- `NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID`
- (à ajouter) secret de signature du webhook dès que Paiement Pro documente
  l'en-tête correspondant.

## Étapes suivantes

- Vérification cryptographique de la signature du webhook.
- Tâche de réconciliation des commandes restées `PENDING` au-delà de 24 h.
- Revue périodique des commandes `FLAGGED`.
