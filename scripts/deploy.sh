#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Starting MediCore Production Deployment script ==="

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set."
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET is not set."
    exit 1
fi

echo "Step 1: Pulling latest changes..."
git pull origin main || echo "Proceeding without git pull..."

echo "Step 2: Updating Backend..."
cd backend
npm install
npx prisma generate

echo "Step 3: Running database migrations/schema sync..."
npx prisma db push --accept-data-loss

# Check if seed argument is provided
if [ "$1" == "--seed" ]; then
    echo "Seeding the database with demo template..."
    npm run db:seed-demo
fi

echo "Step 4: Compiling Backend source code..."
npm run build

echo "Step 5: Updating and building Frontend..."
cd ../frontend
npm install
npm run build

echo "Step 6: Restarting application processes..."
# If using pm2
if command -v pm2 &> /dev/null; then
    echo "pm2 detected. Reloading applications..."
    pm2 restart all || pm2 start ../backend/dist/app.js --name "medicore-backend"
else
    echo "pm2 not found. Manual startup required for backend dist/app.js."
fi

echo "=== MediCore Deployment completed successfully! ==="
