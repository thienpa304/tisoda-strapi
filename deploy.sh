#!/bin/bash

# Deploy script for Strapi app with PM2
# Usage: ./deploy.sh

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_NAME="tisoda-strapi"
APP_DIR="/root/app/tisoda-strapi"
PORT="${PORT:-1337}"  # Default Strapi port
NODE_ENV="${NODE_ENV:-production}"

echo -e "${BLUE}Starting deployment for ${APP_NAME}...${NC}"

# Navigate to app directory
cd $APP_DIR

# Pull latest code (uncomment if using git)
# echo -e "${BLUE}Pulling latest code...${NC}"
# git pull origin main

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
if [ -f "yarn.lock" ]; then
    yarn install --production=false
elif [ -f "package-lock.json" ]; then
    npm install
else
    npm install
fi

# Build the application to temporary directory
echo -e "${BLUE}Building application to dist-new...${NC}"

# Remove old dist-new if exists
rm -rf dist-new

# Build to new directory
if [ -f "yarn.lock" ]; then
    yarn build
else
    npm run build
fi

# Rename the built dist to dist-new for safety
if [ -d "dist" ]; then
    mv dist dist-new
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}✗ Build failed - dist directory not created${NC}"
    exit 1
fi

# Swap old and new builds (zero-downtime swap)
echo -e "${BLUE}Swapping builds...${NC}"
if [ -d "dist-old" ]; then
    rm -rf dist-old
fi

# Move current dist to dist-old (if exists)
if [ -d "dist" ]; then
    mv dist dist-old
    echo -e "${GREEN}✓ Backed up current build to dist-old${NC}"
fi

# Move new build to dist
mv dist-new dist
echo -e "${GREEN}✓ New build activated${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing PM2...${NC}"
    npm install -g pm2
fi

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${BLUE}Creating PM2 ecosystem config...${NC}"
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: '${APP_NAME}',
      script: './node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      cwd: '${APP_DIR}',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: '${NODE_ENV}',
        PORT: ${PORT}
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
EOF
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Generate API documentation
echo -e "${BLUE}Generating API documentation...${NC}"
# Stop PM2 if running to free the port
if pm2 list | grep -q "$APP_NAME"; then
    pm2 stop $APP_NAME > /dev/null 2>&1 || true
fi

# Run in development mode briefly to generate docs
NODE_ENV=development yarn start > /tmp/doc-gen.log 2>&1 &
DOC_PID=$!
sleep 20  # Wait for Strapi to start and generate docs
kill $DOC_PID 2>/dev/null || true
wait $DOC_PID 2>/dev/null || true

# Check if documentation was generated
if [ -f "src/extensions/documentation/documentation/1.0.0/full_documentation.json" ]; then
    echo -e "${GREEN}✓ Documentation generated successfully${NC}"
else
    echo -e "${RED}⚠ Warning: Documentation generation may have failed${NC}"
fi

# Stop the app if it's running
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${BLUE}Stopping existing app...${NC}"
    pm2 delete $APP_NAME
fi

# Start the app with PM2
echo -e "${BLUE}Starting app with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Cleanup old build after successful deployment
if [ -d "dist-old" ]; then
    echo -e "${BLUE}Cleaning up old build...${NC}"
    rm -rf dist-old
    echo -e "${GREEN}✓ Old build removed${NC}"
fi

# Setup PM2 to start on system boot (run once)
# pm2 startup

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}App is running on port ${PORT}${NC}"
echo ""
echo -e "${BLUE}Useful PM2 commands:${NC}"
echo "  pm2 list              - List all running apps"
echo "  pm2 logs ${APP_NAME}   - View app logs"
echo "  pm2 restart ${APP_NAME} - Restart app"
echo "  pm2 stop ${APP_NAME}    - Stop app"
echo "  pm2 delete ${APP_NAME}  - Delete app from PM2"
echo "  pm2 monit             - Monitor all apps"

