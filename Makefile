.PHONY: install dev dev-bot dev-web dev-stop dev-build dev-logs supabase-start supabase-stop db-init env-init init lint build help

help:
	@echo "Commandes disponibles :"
	@echo "  make init           - Initialise l'environnement complet (install + start + config env + db)"
	@echo "  make install        - Installe les dépendances locales (nécessaire pour l'autocomplétion / IDE)"
	@echo "  make supabase-start - Démarre la stack Supabase locale (Docker)"
	@echo "  make supabase-stop  - Éteint la stack Supabase locale (Docker)"
	@echo "  make env-init       - Récupère les clés locales Supabase et met à jour les fichiers .env"
	@echo "  make db-init        - Applique le schéma SQL schema.sql sur la base de données locale"
	@echo "  make dev            - Lance le Bot et Next.js en arrière-plan (Docker Compose -d)"
	@echo "  make dev-logs       - Affiche les logs en temps réel des conteneurs de dev"
	@echo "  make dev-bot        - Lance uniquement le bot Discord de Dev dans Docker Compose"
	@echo "  make dev-web        - Lance uniquement le site Next.js dans Docker Compose"
	@echo "  make dev-build      - Reconstruit les images de développement (après ajout de paquets npm)"
	@echo "  make dev-stop       - Arrête les conteneurs du Bot et de Next.js"
	@echo "  make lint           - Valide les types du bot et lint le code du web"
	@echo "  make build          - Compile le bot et le projet web"

init: install supabase-start env-init db-init
	@echo "🎉 Environnement de développement initialisé avec succès !"
	@echo "👉 Utilisez 'make dev' pour lancer l'application et le bot."

install:
	@echo "📦 Installation des dépendances dans /bot..."
	cd bot && npm install
	@echo "📦 Installation des dépendances dans /web..."
	cd web && npm install

supabase-start:
	@echo "⚡ Démarrage de Supabase en local..."
	npx supabase start

supabase-stop:
	@echo "🛑 Arrêt de Supabase en local..."
	npx supabase stop

env-init:
	@echo "🔑 Configuration des clés d'environnement locales..."
	node scripts/setup-dev-env.js

db-init:
	@echo "🗄️ Application du schéma SQL local..."
	docker exec -i supabase_db_SplatoonTournamentHub psql -U postgres -d postgres < supabase/schema.sql

dev:
	@echo "🚀 Démarrage du Bot et de Next.js en arrière-plan..."
	docker compose up -d
	@echo "👉 Les conteneurs tournent en arrière-plan. Utilisez 'make dev-logs' pour voir les logs."

dev-logs:
	docker compose logs -f

dev-bot:
	@echo "🤖 Démarrage du bot Discord local dans Docker en arrière-plan..."
	docker compose up -d bot-dev
	@echo "👉 Le bot tourne en arrière-plan. Utilisez 'make dev-logs' pour voir les logs."

dev-web:
	@echo "🖥️ Démarrage de Next.js local dans Docker en arrière-plan..."
	docker compose up -d web-dev
	@echo "👉 Next.js tourne en arrière-plan. Utilisez 'make dev-logs' pour voir les logs."

dev-stop:
	@echo "🛑 Arrêt des conteneurs de développement..."
	docker compose down

dev-build:
	@echo "🛠️ Reconstruction des images de développement..."
	docker compose build

lint:
	@echo "🔍 Vérification du typage dans /bot..."
	cd bot && npx tsc --noEmit
	@echo "🔍 Linting dans /web..."
	cd web && npm run lint

test:
	@echo "🧪 Exécution des tests unitaires dans /bot..."
	cd bot && npm run test

build:
	@echo "🛠️ Compilation de /bot..."
	cd bot && npm run build
	@echo "🛠️ Compilation de /web..."
	cd web && npm run build
