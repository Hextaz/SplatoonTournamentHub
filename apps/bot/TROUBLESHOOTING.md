# Guide de Dépannage - Service de Rôles et Pseudos

## Solution par défaut : WebhookRolesService

Le bot utilise maintenant **WebhookRolesService** par défaut, qui est la solution la plus fiable. Au lieu de surveiller la base de données (Realtime/Polling), c'est Supabase qui envoie une requête HTTP au bot quand il y a un changement.

### Configuration des Webhooks Supabase

Pour que le webhook fonctionne, vous devez configurer un **Database Webhook** dans Supabase :

1. Allez dans votre projet Supabase
2. Database → Webhooks
3. Cliquez sur "New Webhook"
4. Configurez comme suit :
   - **Name** : `team-update-webhook`
   - **Events** : Sélectionnez `INSERT`, `UPDATE`, `DELETE`
   - **Table** : `teams`
   - **URL** : `https://ton-bot.fly.dev/api/webhook/team-update`
   - **Secret** : (optionnel) Ajoutez un secret pour la signature
5. Cliquez sur "Save"

### Pourquoi Webhook est la meilleure solution ?

| Caractéristique | Realtime | Polling | Webhook ✅ |
|----------------|----------|---------|------------|
| Latence | ~100ms | ~5s | ~100ms |
| Charge réseau | Faible | Moyenne | Faible |
| Fiabilité | Dépend de Supabase | Élevée | **100% fiable** |
| Consommation RAM | Oui | Oui | **Non** |
| Perte d'événements | Possible si crash | Possible si crash | **Non (Supabase réessaie)** |

### Problème : Realtime ne fonctionne plus

Si vous essayez d'utiliser Realtime et que ça ne marche pas, voici les causes possibles :

### Symptômes
- Logs montrant `Realtime channel status: TIMED_OUT`
- Logs montrant `Channel timed out, attempting to reconnect...`
- Service PresenceRolesService échoue à se connecter

### Causes Possibles

1. **Realtime non activé dans Supabase**
   - Allez dans votre projet Supabase
   - Settings → API → Realtime
   - Vérifiez que Realtime est activé

2. **Realtime non activé pour la table `teams`**
   - Allez dans votre projet Supabase
   - Database → Replication
   - Vérifiez que la table `teams` est activée pour Realtime
   - Activez-la si nécessaire

3. **Problème de réseau/firewall**
   - Vérifiez que votre serveur (Fly.io) peut accéder à Supabase
   - Vérifiez les règles de firewall

4. **Configuration incorrecte**
   - Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont corrects
   - Vérifiez que la clé Service Role est valide

### Solution : Utiliser le Service de Polling (Fallback)

Si vous préférez utiliser le polling à la place du webhook :

#### 1. Ajouter la variable d'environnement

Sur Fly.io :
```bash
flyctl secrets set USE_POLLING_ROLES=true
```

Sur Vercel :
```bash
vercel env add USE_POLLING_ROLES
# Valeur : true
```

#### 2. Redéployer le bot

```bash
flyctl deploy --remote-only
```

#### 3. Vérifier les logs

Vous devriez voir :
```
[Bot] Using PollingRolesService (polling-based)
[PollingRoles] Initializing Polling Roles Service...
[PollingRoles] Populating initial team cache...
[PollingRoles] Cache populated with X teams
[PollingRoles] Starting polling with 5000ms interval
```

### Tester le Webhook

Pour tester si le webhook fonctionne correctement :

```bash
# Simuler un webhook depuis Supabase
curl -X POST https://ton-bot.fly.dev/api/webhook/team-update \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "teams",
    "record": {
      "id": "test-id",
      "name": "Test Team",
      "is_checked_in": true,
      "captain_discord_id": "123456789",
      "tournament_id": "test-tournament-id"
    }
  }'
```

Réponse attendue :
```json
{
  "received": true
}
```

### Logs Webhook (succès)

```
[WebhookRoles] Received team update webhook: { type: 'INSERT', table: 'teams', record: {...} }
[WebhookRoles] INSERT - Team: Test Team, CheckedIn: true, Captain: 123456789
[WebhookRoles] applyPresence - Team: Test Team, Captain: 123456789, Tournament: test-tournament-id
[WebhookRoles] Tournament found: 123456789, Captain Role: 987654321
[WebhookRoles] Guild fetched successfully: Mon Serveur
[WebhookRoles] Member fetched successfully: User#1234, Manageable: true
[WebhookRoles] Nickname set successfully: Test Team
[WebhookRoles] Role added successfully: Capitaine de Tournoi
[WebhookRoles] applyPresence completed for team: Test Team
```

### Logs Webhook (échec)

```
[WebhookRoles] Received team update webhook: { type: 'INSERT', table: 'teams', record: {...} }
[WebhookRoles] INSERT - Team: Test Team, CheckedIn: true, Captain: 123456789
[WebhookRoles] applyPresence - Team: Test Team, Captain: 123456789, Tournament: test-tournament-id
[WebhookRoles] Tournament not found or missing guild_id: test-tournament-id
```

### Différences entre Webhook, Realtime et Polling

| Caractéristique | Realtime | Polling | Webhook ✅ |
|----------------|----------|---------|------------|
| Latence | ~100ms | ~5s | ~100ms |
| Charge réseau | Faible | Moyenne | Faible |
| Fiabilité | Dépend de Supabase | Élevée | **100% fiable** |
| Complexité | Simple | Simple | Simple |
| Consommation RAM | Oui | Oui | **Non** |

### Quand utiliser Webhook (par défaut)

- Quand vous voulez la fiabilité maximale
- Quand vous voulez minimiser la consommation RAM
- Quand vous voulez éviter la perte d'événements
- Quand vous avez un serveur Express (ce qui est le cas)

### Quand utiliser Polling

- Quand vous ne pouvez pas configurer les webhooks Supabase
- Quand vous voulez une solution simple sans configuration supplémentaire
- Quand la latence de 5 secondes est acceptable

### Quand utiliser Realtime (déconseillé)

- Quand vous avez besoin d'une latence minimale
- Quand Realtime fonctionne correctement
- Quand vous voulez minimiser la charge réseau
- **Note : Realtime a des problèmes de fiabilité avec Node.js**

### Diagnostic

Pour diagnostiquer les problèmes de Realtime :

```bash
# Tester l'endpoint de diagnostic
curl http://localhost:8080/health/presence-roles/diagnose

# Réponse attendue (succès) :
{
  "success": true,
  "initialized": true,
  "channelExists": true,
  "channelState": "SUBSCRIBED",
  "reconnectAttempts": 0,
  "supabaseUrl": "configured",
  "supabaseKey": "configured",
  "supabaseConnection": "success"
}

# Réponse attendue (échec) :
{
  "success": false,
  "initialized": true,
  "channelExists": true,
  "channelState": "TIMED_OUT",
  "reconnectAttempts": 1,
  "supabaseUrl": "configured",
  "supabaseKey": "configured",
  "supabaseConnection": "success"
}
```

### Vérifier la Configuration Supabase

1. **Activer Realtime** :
   - Allez dans Settings → API → Realtime
   - Activez Realtime

2. **Activer Realtime pour la table teams** :
   - Allez dans Database → Replication
   - Trouvez la table `teams`
   - Activez-la pour Realtime

3. **Vérifier les permissions** :
   - Allez dans Database → Tables → teams
   - Vérifiez que le bot a les permissions nécessaires
   - Vérifiez que RLS est configuré correctement

### Logs Utiles

#### Realtime (succès)
```
[PresenceRoles] Setting up realtime channel...
[PresenceRoles] Realtime channel status: JOINING
[PresenceRoles] Realtime channel status: SUBSCRIBED
[PresenceRoles] Successfully subscribed to teams table changes
[Bot] PresenceRolesService health check passed
```

#### Realtime (échec)
```
[PresenceRoles] Setting up realtime channel...
[PresenceRoles] Realtime channel status: JOINING
[PresenceRoles] Realtime channel status: TIMED_OUT
[PresenceRoles] Channel timed out, attempting to reconnect...
[Bot] PresenceRolesService health check failed
```

#### Polling (succès)
```
[Bot] Using PollingRolesService (polling-based)
[PollingRoles] Initializing Polling Roles Service...
[PollingRoles] Populating initial team cache...
[PollingRoles] Cache populated with X teams
[PollingRoles] Starting polling with 5000ms interval
[PollingRoles] Found Y updated teams
```

### Support

Si vous avez toujours des problèmes :

1. Vérifiez les logs du bot
2. Vérifiez que le webhook Supabase est correctement configuré
3. Testez le webhook avec curl
4. Essayez le service de polling (USE_POLLING_ROLES=true)
5. Vérifiez la configuration Supabase
6. Contactez le support Supabase si nécessaire

### Configuration Supabase pour Webhook

1. **Créer le webhook** :
   - Allez dans Database → Webhooks
   - Cliquez sur "New Webhook"
   - Configurez comme expliqué ci-dessus

2. **Vérifier les permissions** :
   - Allez dans Database → Tables → teams
   - Vérifiez que le webhook a les permissions nécessaires
   - Vérifiez que RLS est configuré correctement

3. **Tester le webhook** :
   - Utilisez l'endpoint de test dans Supabase
   - Vérifiez les logs du bot
   - Vérifiez que les rôles sont appliqués correctement
