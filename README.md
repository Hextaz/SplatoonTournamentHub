# Splatoon Tournament Hub
Discord Bot + Web App for managing Splatoon Tournaments.

## Project Structure
- **/bot**: Node.js & Express + Discord.js hybrid backend targeted for Fly.io. Contains the bot runner and API endpoints interacting with Discord.
- **/web**: Next.js App Router for frontend UI and admin dashboard (TO Back-office) targeted for Vercel. 
- **/supabase**: Contains the PostgreSQL `schema.sql` database schema for initial setup.

## Setup Instructions

### Database Setup
1. Setup a Supabase project locally or remotely.
2. Run the `supabase/schema.sql` script to create the DB architecture.

### Discord Bot
1. Navigate to `/bot` (`cd bot`)
2. Make sure you match the `.env` variables (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `PORT`).
3. Run `npm install`
4. Run `npm run build` & `npm start` (or `npm run dev` to develop locally)

### Next.js Client
1. Navigate to `/web` (`cd web`)
2. Configure `.env.local` to point to Supabase and Discord OAuth.
3. Run `npm install`
4. Run `npm run dev`
