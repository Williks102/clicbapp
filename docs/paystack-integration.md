# Intégration Paystack

Paystack couvre la Côte d'Ivoire en **XOF**, avec Orange Money, MTN Mobile
Money, Moov Money et la carte bancaire.

## Pourquoi ce changement

L'intégration précédente reposait sur un SDK chargé dans le navigateur et sur
un webhook non authentifié : toute personne connaissant la référence d'une
commande — l'acheteur en premier lieu — pouvait se faire créditer des votes
sans payer. Paystack signe ses notifications, ce qui ferme cette porte.

## Flux

1. **Initialisation, de serveur à serveur** (`src/lib/paystack.ts`).
   `POST https://api.paystack.co/transaction/initialize`, authentifié par la
   clé secrète. Le montant, la devise et la référence sont fixés côté serveur ;
   aucune clé ni aucun SDK n'atteint le navigateur.
   La réponse fournit une `authorization_url` vers laquelle le client est
   simplement redirigé — c'est Paystack qui affiche la page de paiement et
   collecte le numéro mobile money.

2. **Webhook** (`/api/payment/webhook`), avec trois barrières successives :
   - la signature `x-paystack-signature`, HMAC-SHA512 du **corps brut** calculé
     avec la clé secrète et comparé en temps constant ;
   - un appel à `GET /transaction/verify/:reference` : l'état réel de la
     transaction est lu chez Paystack, la charge utile reçue n'est jamais crue
     sur parole ;
   - `confirm_order_payment` en base, qui revalide le montant et reste
     idempotente en cas de rejeu.

3. **Retour utilisateur** : `callback_url` renvoie vers
   `/vote/success?reference=…`, qui interroge le statut de la commande et
   patiente tant que le webhook n'est pas arrivé.

## Le piège du montant

Paystack attend un montant en sous-unités. **Le franc CFA n'a pas de
sous-unité, mais l'API impose malgré tout la multiplication par 100.** Omettre
cette conversion facturerait le centième du prix affiché ; l'oublier au retour
créditerait cent fois trop. La conversion est isolée dans `toSubunit` /
`fromSubunit`, couvertes par `npm run test:paystack`.

## Configuration

| Variable | Rôle |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Clé secrète (`sk_test_…` ou `sk_live_…`). **Jamais préfixée `NEXT_PUBLIC_`** |
| `NEXT_PUBLIC_BASE_URL` | Base de l'URL de retour après paiement |

Dans le tableau de bord Paystack, section *Webhooks*, déclarez l'URL :

```
https://votre-domaine/api/payment/webhook
```

Aucun secret n'est à placer dans cette URL : l'authenticité repose sur la
signature du corps de la requête.

## Recette

- `npm run test:paystack` — signature et conversion des montants.
- Un paiement réel en mode test (`sk_test_`) reste indispensable : le parcours
  complet, du bouton au crédit des votes, ne peut être validé qu'en conditions
  réelles.
- En cas d'échec, la commande reste `PENDING` dans `orders` : c'est le signe
  que la notification n'est jamais parvenue.
