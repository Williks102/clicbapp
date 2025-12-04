# Système de File d'Attente Virtuelle

## Vue d'ensemble

Le système de file d'attente virtuelle permet de gérer l'affluence lors de l'ouverture des ventes de billets en limitant le nombre d'utilisateurs qui peuvent effectuer un achat simultanément.

## Fonctionnalités

### Pour les utilisateurs
- **Chronomètre en temps réel** - Affiche le temps d'attente écoulé
- **Position dans la file** - Numéro de position et nombre de personnes devant
- **Temps d'attente estimé** - Calcul dynamique basé sur la position dans la file
- **Interface animée** - Animations et transitions fluides
- **Redirection automatique** - Passage automatique au checkout quand c'est le tour de l'utilisateur

### Pour les organisateurs
- **Configuration flexible** - Activer/désactiver la file d'attente par événement
- **Paramètres ajustables** - Nombre max d'utilisateurs simultanés et temps moyen de checkout
- **Activation automatique** - Possibilité d'activer la queue automatiquement selon des critères

## Architecture

### Composants

#### 1. `QueueWaitingRoom` (`/src/components/queue-waiting-room.tsx`)
Composant visuel de la salle d'attente avec :
- Chronomètre temps réel
- Affichage de la position
- Barre de progression
- Animations
- Bouton pour quitter la file

#### 2. `useQueue` Hook (`/src/hooks/use-queue.ts`)
Hook React pour gérer la logique de la file d'attente :
- Rejoindre/quitter la file
- Écouter les changements en temps réel via Firebase
- Calculer la position et le temps d'attente estimé
- Gérer l'expiration automatique

#### 3. `QueueConfigForm` (`/src/components/queue-config-form.tsx`)
Formulaire pour que les organisateurs configurent la file d'attente :
- Activer/désactiver
- Définir le nombre max d'utilisateurs simultanés
- Définir le temps moyen de checkout

### Actions Serveur (`/src/app/actions/queue-actions.ts`)

#### `getQueueConfig(eventId: string)`
Récupère la configuration de la file d'attente pour un événement.

#### `setQueueEnabled(eventId, enabled, maxConcurrentUsers, averageCheckoutTime)`
Active ou désactive la file d'attente avec les paramètres spécifiés.

#### `cleanExpiredQueueUsers()`
Nettoie automatiquement les utilisateurs expirés de la file.

#### `getQueueStats(eventId, ticketId)`
Récupère les statistiques de la file d'attente en temps réel.

#### `shouldEnableQueue(eventId, ticketId)`
Détermine si la file d'attente doit être activée automatiquement.

### Types (`/src/lib/types.ts`)

```typescript
// Configuration de la file d'attente
export type QueueConfig = {
  enabled: boolean;
  maxConcurrentUsers: number;
  averageCheckoutTime: number;
};

// Utilisateur dans la file
export type QueueUser = {
  id: string;
  sessionId: string;
  eventId: string;
  ticketId: string;
  joinedAt: string;
  expiresAt?: string;
  status: 'waiting' | 'active' | 'completed' | 'expired';
};

// État de la file côté client
export type QueueState = {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number;
  status: 'waiting' | 'active' | 'expired';
  joinedAt: Date;
};
```

## Structure Firebase

### Collection `queues`
Stocke tous les utilisateurs dans les files d'attente :

```
queues/
  {eventId}_{ticketId}_{sessionId}/
    - sessionId: string
    - eventId: string
    - ticketId: string
    - joinedAt: string (ISO)
    - expiresAt: string (ISO)
    - status: 'waiting' | 'active' | 'completed' | 'expired'
    - createdAt: Timestamp
```

### Collection `queueConfigs`
Configuration de la file d'attente par événement :

```
queueConfigs/
  {eventId}/
    - enabled: boolean
    - maxConcurrentUsers: number
    - averageCheckoutTime: number (secondes)
```

## Configuration Firebase

Assurez-vous d'ajouter ces règles de sécurité Firestore :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Files d'attente - tout le monde peut créer, modifier et lire sa propre session
    match /queues/{queueId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Configuration des files - seuls les organisateurs/admins
    match /queueConfigs/{eventId} {
      allow read: if true;
      allow write: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'organizer' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

## Utilisation

### 1. Intégration dans la page événement

La file d'attente est déjà intégrée dans `/src/app/events/[id]/page.tsx`.

Par défaut, elle s'active quand il reste moins de 20 billets :

```typescript
const shouldUseQueue = ticket.quantity < 20;
```

Vous pouvez personnaliser cette logique selon vos besoins.

### 2. Configuration par l'organisateur

Ajoutez le composant `QueueConfigForm` dans la page de configuration de l'événement :

```tsx
import { QueueConfigForm } from '@/components/queue-config-form';

// Dans votre page
<QueueConfigForm eventId={event.id} initialConfig={queueConfig} />
```

### 3. Activation conditionnelle

Plusieurs stratégies possibles :

#### Activation par quantité de billets
```typescript
const shouldUseQueue = ticket.quantity < 20;
```

#### Activation par configuration
```typescript
const config = await getQueueConfig(eventId);
const shouldUseQueue = config?.enabled ?? false;
```

#### Activation par affluence
```typescript
const shouldUseQueue = await shouldEnableQueue(eventId, ticketId);
```

### 4. Nettoyage automatique

Créez un Cloud Function ou un cron job pour nettoyer les sessions expirées :

```typescript
import { cleanExpiredQueueUsers } from '@/app/actions/queue-actions';

// Exécuter toutes les 5 minutes
export async function cleanupQueue() {
  const result = await cleanExpiredQueueUsers();
  console.log(`Cleaned ${result.cleaned} expired queue users`);
}
```

## Paramètres recommandés

### Événements petits (< 100 billets)
- `maxConcurrentUsers`: 3-5
- `averageCheckoutTime`: 300 secondes (5 minutes)

### Événements moyens (100-500 billets)
- `maxConcurrentUsers`: 5-10
- `averageCheckoutTime`: 240 secondes (4 minutes)

### Événements larges (> 500 billets)
- `maxConcurrentUsers`: 10-20
- `averageCheckoutTime`: 180 secondes (3 minutes)

## Améliorations futures

- [ ] Priorité pour les utilisateurs VIP
- [ ] Statistiques temps réel pour les organisateurs
- [ ] Notifications push quand c'est le tour de l'utilisateur
- [ ] File d'attente par catégorie de billets
- [ ] Réservation temporaire des billets pendant le checkout
- [ ] API webhook pour notifier les systèmes externes

## Support

Pour toute question ou problème, consultez la documentation Firebase ou contactez l'équipe de développement.
