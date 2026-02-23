# Intégration Paiement Pro (proposition)

## Diagnostic du repo

Le checkout charge déjà le SDK Paiement Pro côté client et redirige correctement vers l'URL de paiement.

Point critique observé: le webhook utilisait `returnContext` provenant du navigateur comme source de vérité pour créer la vente. Ce champ est manipulable côté client.

## Solution d'intégration recommandée

1. **Préparer une session de paiement côté serveur** avant d'appeler Paiement Pro.
   - Vérifier event + ticket + stock.
   - Calculer le montant côté serveur.
   - Générer une `referenceNumber` unique.
   - Enregistrer `purchaseData` en base (`payment_sessions/{referenceNumber}`).
2. **Envoyer au SDK uniquement des données sûres**.
   - `referenceNumber` issue du serveur.
   - `returnContext` minimal (`paymentSessionId`).
3. **Traiter le webhook en mode idempotent**.
   - Rechercher la session de paiement par `referenceNumber`.
   - Ignorer les callbacks en double si déjà `completed`.
   - Créer le ticket à partir des données stockées serveur (jamais depuis le payload client).
   - Marquer la session `completed` et stocker `saleId`.

## Mapping des champs Paiement Pro (doc fournie)

- `amount`: montant total (FCFA)
- `description`: obligatoire
- `channel`: `MOBILE_MONEY_CI` ou `CARD`
- `countryCurrencyCode`: `952`
- `referenceNumber`: obligatoire et unique
- `customerEmail`, `customerFirstName`, `customerLastname`, `customerPhoneNumber`: obligatoires
- `notificationURL`: endpoint webhook (`/api/payment/webhook`)
- `returnURL`: URL de retour front (`/purchase/success?orderId=...`)
- `returnContext`: métadonnées minimales (token/session id)

## Variables d'environnement

- `NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID`
- (à ajouter plus tard) secret/signature webhook Paiement Pro dès que la doc officielle du header de signature est disponible.

## Étapes suivantes

- Ajouter la vérification cryptographique de signature webhook (si Paiement Pro la fournit).
- Ajouter un écran de statut de commande qui lit la session serveur au retour utilisateur.
- Mettre en place une tâche de réconciliation pour les paiements `initiated` non finalisés.
