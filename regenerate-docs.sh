#!/bin/bash

# Script to regenerate API documentation
# Usage: ./regenerate-docs.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_NAME="tisoda-strapi"
APP_DIR="/root/app/tisoda-strapi"

echo -e "${BLUE}Regenerating API documentation...${NC}"

cd $APP_DIR

# Check if PM2 app is running
IS_PM2_RUNNING=$(pm2 list | grep -q "$APP_NAME" && echo "yes" || echo "no")

# Stop PM2 temporarily to free the port
if [ "$IS_PM2_RUNNING" = "yes" ]; then
    echo -e "${BLUE}Stopping PM2 app temporarily...${NC}"
    pm2 stop $APP_NAME > /dev/null 2>&1 || true
fi

# Run in development mode briefly to generate docs
echo -e "${BLUE}Starting Strapi in development mode to generate docs...${NC}"
NODE_ENV=development yarn start > /tmp/doc-gen.log 2>&1 &
DOC_PID=$!

# Wait for Strapi to start and generate docs
sleep 20

# Kill the development process
kill $DOC_PID 2>/dev/null || true
wait $DOC_PID 2>/dev/null || true

# Check if documentation was generated
if [ -f "src/extensions/documentation/documentation/1.0.0/full_documentation.json" ]; then
    echo -e "${GREEN}✓ Documentation generated successfully${NC}"
    DOC_SIZE=$(du -h "src/extensions/documentation/documentation/1.0.0/full_documentation.json" | cut -f1)
    echo -e "${GREEN}  Documentation size: ${DOC_SIZE}${NC}"
else
    echo -e "${RED}✗ Documentation generation failed${NC}"
    echo -e "${RED}  Check /tmp/doc-gen.log for details${NC}"
    exit 1
fi

# Restart PM2 app if it was running
if [ "$IS_PM2_RUNNING" = "yes" ]; then
    echo -e "${BLUE}Restarting PM2 app...${NC}"
    pm2 start $APP_NAME
    echo -e "${GREEN}✓ PM2 app restarted${NC}"
fi

echo ""
echo -e "${GREEN}Documentation available at:${NC}"
echo -e "  - Production: https://admin.tisoda.com/documentation"
echo -e "  - Local: http://localhost:1337/documentation"
echo ""

