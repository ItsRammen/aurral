#!/bin/bash

set -e

echo "=========================================="
echo "  Aurral - Setup Script"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js (v16 or higher) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Error: Node.js version 16 or higher is required.${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

echo "=========================================="
echo "  Backend Setup"
echo "=========================================="
echo ""

cd backend

if [ -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file already exists in backend directory${NC}"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env creation..."
    else
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from template${NC}"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
fi

echo ""
echo "Please configure your Lidarr settings:"
echo ""

read -p "Enter your Lidarr URL (default: http://localhost:8686): " LIDARR_URL
LIDARR_URL=${LIDARR_URL:-http://localhost:8686}

read -p "Enter your Lidarr API Key: " LIDARR_API_KEY

read -p "Enter your contact email for MusicBrainz API: " CONTACT_EMAIL

if [[ "$OSTYPE" == "darwin"* ]]; then

    sed -i '' "s|LIDARR_URL=.*|LIDARR_URL=$LIDARR_URL|g" .env
    sed -i '' "s|LIDARR_API_KEY=.*|LIDARR_API_KEY=$LIDARR_API_KEY|g" .env
    sed -i '' "s|CONTACT_EMAIL=.*|CONTACT_EMAIL=$CONTACT_EMAIL|g" .env
else

    sed -i "s|LIDARR_URL=.*|LIDARR_URL=$LIDARR_URL|g" .env
    sed -i "s|LIDARR_API_KEY=.*|LIDARR_API_KEY=$LIDARR_API_KEY|g" .env
    sed -i "s|CONTACT_EMAIL=.*|CONTACT_EMAIL=$CONTACT_EMAIL|g" .env
fi

echo ""
echo -e "${GREEN}✓ Configuration saved${NC}"
echo ""

echo "Installing backend dependencies..."
npm install

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

cd ../frontend

echo "=========================================="
echo "  Frontend Setup"
echo "=========================================="
echo ""

echo "Installing frontend dependencies..."
npm install

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application in development mode:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "Then open your browser to: http://localhost:3000"
echo ""
echo "=========================================="
echo ""
echo "Configuration Summary:"
echo "  Lidarr URL: $LIDARR_URL"
echo "  API Key: ${LIDARR_API_KEY:0:8}..."
echo "  Contact Email: $CONTACT_EMAIL"
echo ""
echo "To modify these settings, edit: backend/.env"
echo ""
echo -e "${GREEN}Happy music organizing!${NC}"
echo ""
