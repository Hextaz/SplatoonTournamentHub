# Tournament Hub

Discord Bot + Web App for managing E-sport Tournaments (Multi-game).

---

## 🚀 Project Structure

- **`apps/bot`**: Node.js & Express + Discord.js hybrid backend targeted for Fly.io. Contains the bot runner and API endpoints interacting with Discord.
- **`apps/web`**: Next.js App Router for frontend UI and admin dashboard (TO Back-office) targeted for Vercel. 
- **`packages/shared`**: Shared TypeScript types, schemas, and utilities used across both bot and web applications.
- **`supabase`**: Contains the PostgreSQL configuration, migrations, and schema for local and remote deployment.

---

## 🛠️ Local Development Setup

To test and develop features safely without affecting the production database or live Discord bot, run everything locally using **Docker** and a **Dev Bot** application.

### 1. Prerequisites
- **Docker** must be installed and running on your machine.
- Node.js (v20 recommended).

### 2. Fast Setup (via Makefile)
We use a `Makefile` to simplify local development commands.

1. **Initialize the entire project**:
   ```bash
   make init
   ```
   *This single command will install all npm dependencies, start your local Supabase stack in Docker, automatically configure your local `apps/bot/.env` and `apps/web/.env.local` files with the local database keys, and apply the SQL database schema.*

2. **Launch Dev Instances**:
   Start both the Next.js frontend and the Discord Bot concurrently in the background:
   ```bash
   make dev
   ```
   *To follow the live logs of both containers, run:*
   ```bash
   make dev-logs
   ```

3. **Stop Dev Instances**:
   To stop the running application and bot containers:
   ```bash
   make dev-stop
   ```

4. **Rebuild Dev Containers**:
   If you install a new npm package, rebuild the dev containers with:
   ```bash
   make dev-build
   ```

---

## 🔑 Environment Configuration

Do **NOT** use the production Discord bot token locally. Create a separate Discord application (e.g., *Tournament Hub Dev*) in the [Discord Developer Portal](https://discord.com/developers/applications) and invite it to a dedicated testing server.

### A. Discord Bot Backend (`apps/bot/.env`)
Create `apps/bot/.env` (from `apps/bot/.env.example`):
```env
# Local Supabase credentials
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your_local_anon_key # printed by 'supabase start'

# Discord Dev Bot credentials
DISCORD_TOKEN=your_dev_bot_token
DISCORD_CLIENT_ID=your_dev_bot_client_id

# Local server config
PORT=8080
BOT_API_SECRET=your_local_shared_secret
```

### B. Next.js Web App (`apps/web/.env.local`)
Create `apps/web/.env.local` (from `apps/web/.env.example`):
```env
# Local Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# Local bot API credentials
NEXT_PUBLIC_BOT_API_URL=http://localhost:8080
BOT_API_SECRET=your_local_shared_secret

# NextAuth Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_random_string_for_testing
DISCORD_CLIENT_ID=your_dev_bot_client_id
DISCORD_CLIENT_SECRET=your_dev_bot_client_secret
```
*Note: Make sure to add `http://localhost:3000/api/auth/callback/discord` as a Redirect URI in your Discord Dev Application.*

---

## 🐙 Contributing

### Workflow
1. Develop features on a dedicated branch: `git checkout -b feature/your-feature-name`.
2. Push your branch and open a **Pull Request** on GitHub.
3. Use **Squash and Merge** when merging PRs to `main` to maintain a clean history (1 commit per PR/feature).

### CI/CD
A GitHub Actions workflow is active in `.github/workflows/ci.yml`. It triggers on every push and Pull Request to `main`, validating:
- TypeScript compilation on `apps/bot` (can be run locally via `make lint`)
- Linting and production Next.js build on `apps/web` (can be run locally via `make build`)
