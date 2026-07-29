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

**Une seule variable pour les deux modes.** Il n'existe pas de
`PAYSTACK_TEST_SECRET_KEY` : le mode n'est pas déduit du nom de la variable
mais du préfixe de la clé qu'elle contient. Coller une clé `sk_test_…` place
la plateforme en test, une clé `sk_live_…` la place en production. Pour
basculer, on remplace la valeur — jamais le nom.

La clé publique `pk_…` n'est utilisée nulle part : le paiement est initialisé
de serveur à serveur, l'acheteur est ensuite redirigé vers l'URL renvoyée par
Paystack.

### URL à déclarer dans le tableau de bord

| Champ | Valeur |
| --- | --- |
| **Webhook URL** | `https://votre-domaine/api/payment/webhook` |
| **Callback URL** | *laisser vide* — le code fournit un `callback_url` par transaction |

Le webhook est la voie normale. Les onglets *Test* et *Live* ont chacun leur
propre configuration : l'URL doit être déclarée dans les deux.

`NEXT_PUBLIC_BASE_URL` détermine le domaine de retour. À défaut, on retombe sur
le domaine exposé par Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, puis
`VERCEL_URL`) — jamais sur un domaine codé en dur, qui renverrait l'acheteur
sur une page inexistante après un paiement pourtant abouti.

## Règlement d'une commande

`settleOrder` porte la vérification et le crédit. Elle est appelée par **deux**
chemins, car le webhook peut ne jamais arriver — URL mal déclarée, domaine
injoignable, indisponibilité passagère — alors que l'argent, lui, est encaissé :

1. le **webhook**, après validation de la signature ;
2. la **page de retour** `/vote/success`, qui rapproche toute commande encore
   `PENDING` en interrogeant Paystack.

Les deux chemins sont sûrs : le montant provient de l'API Paystack et non de
l'appelant, et `confirm_order_payment` le revalide en base tout en restant
idempotente. Un rejeu ne crédite jamais deux fois.

Une commande reste `PENDING` uniquement si l'acheteur n'est jamais revenu
**et** que le webhook n'est pas passé.

Aucun secret n'est à placer dans cette URL : l'authenticité repose sur la
signature du corps de la requête.

## Diagnostic

Paystack répond `Invalid key` (HTTP 401) sans distinguer les causes. Le
contrôle de format dans `secretKey()` les sépare avant tout appel réseau, et
la page **Admin → Paramètres** interroge `/balance` pour confirmer que la clé
est réellement acceptée. Causes classiques, par fréquence :

1. la clé publique `pk_…` a été collée à la place de la clé secrète ;
2. la clé a été recopiée depuis l'affichage masqué, donc tronquée ;
3. un espace ou un saut de ligne a été conservé au collage (`trim()` le corrige) ;
4. la variable a été ajoutée chez l'hébergeur sans redéploiement.

## Recette

- `npm run test:paystack` — signature et conversion des montants.
- Un paiement réel en mode test (`sk_test_`) reste indispensable : le parcours
  complet, du bouton au crédit des votes, ne peut être validé qu'en conditions
  réelles.
- En cas d'échec, la commande reste `PENDING` dans `orders` : c'est le signe
  que la notification n'est jamais parvenue.
