#!/bin/bash

# Deploy script for Strapi app with PM2
# Usage: ./deploy.sh [--help]
# Author: Tisoda Team
# Version: 2.0.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Help function
show_help() {
    cat << EOF
Deploy script for Tisoda Strapi application

USAGE:
    ./deploy.sh [OPTIONS]

OPTIONS:
    --help, -h          Show this help message

DESCRIPTION:
    This script deploys the Tisoda Strapi application using PM2.
    It will:
    - Clean old build artifacts
    - Install dependencies (npm or yarn)
    - Build the Strapi application with admin panel at /dashboard
    - Start/restart the application with PM2
    - Configure PM2 for system startup

ENVIRONMENT VARIABLES:
    PORT                Port number (default: 1337)
    NODE_ENV            Node environment (default: production)

EXAMPLES:
    ./deploy.sh
    PORT=3000 ./deploy.sh
    NODE_ENV=development ./deploy.sh
EOF
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    "")
        # No arguments, continue with deployment
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac

# Colors for output
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

# Configuration
readonly APP_NAME="tisoda-strapi-dev"
readonly APP_DIR="/root/app/tisoda-strapi"
readonly PORT="${PORT:-1338}"  # Default Strapi dev port
readonly NODE_ENV="${NODE_ENV:-production}"

log_info "🚀 Starting deployment for ${APP_NAME}..."

# Navigate to app directory
cd "$APP_DIR"

# Pull latest code (uncomment if using git)
# log_info "Pulling latest code..."
# git pull origin main

# Clean old build artifacts
log_info "Cleaning old build artifacts..."
rm -rf .cache dist

# Install dependencies
log_info "Installing dependencies..."
if [ -f "yarn.lock" ]; then
    yarn install --production=false
elif [ -f "package-lock.json" ]; then
    npm install
else
    npm install
fi

# Build the application
log_info "Building Strapi application with admin panel at /dashboard..."

# Set environment variables for build
export ADMIN_PATH=/dashboard
export STRAPI_ADMIN_BACKEND_URL=https://dev-admin.tisoda.com
export STRAPI_TELEMETRY_DISABLED=true

# Build to dist directory
if [ -f "yarn.lock" ]; then
    yarn build
else
    npm run build
fi

# Check if build was successful
if [ ! -d "dist/build" ]; then
    log_error "✗ Build failed - dist/build directory not created"
    exit 1
fi

log_success "✓ Build completed successfully"

# Prepare for deployment
log_info "Preparing for deployment..."

# Remove old backup if exists
if [ -d "dist-old" ]; then
    rm -rf dist-old
    log_success "✓ Cleaned up old backup"
fi

# Ensure logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2 globally..."
    npm install -g pm2
fi

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    log_info "Creating PM2 ecosystem config..."
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
        PORT: ${PORT},
        ADMIN_PATH: '/dashboard',
        STRAPI_ADMIN_BACKEND_URL: 'https://dev-admin.tisoda.com',
        STRAPI_TELEMETRY_DISABLED: 'true'
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

# Start or reload app with PM2
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log_info "Reloading ${APP_NAME} with PM2 (zero-downtime)..."
    pm2 reload "$APP_NAME"
    log_success "✓ App reloaded successfully"
else
    log_info "Starting ${APP_NAME} with PM2..."
    pm2 start ecosystem.config.js
    log_success "✓ App started successfully"
fi

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot (run once)
# pm2 startup systemd -u root --hp /root

log_success "✅ Deployment completed successfully!"
log_success "App is running on port ${PORT}"
log_success "Admin panel available at: https://admin.tisoda.com/dashboard"
echo ""
log_info "Useful PM2 commands:"
echo "  pm2 list              - List all running apps"
echo "  pm2 logs ${APP_NAME}   - View app logs"
echo "  pm2 restart ${APP_NAME} - Restart app"
echo "  pm2 stop ${APP_NAME}    - Stop app"
echo "  pm2 delete ${APP_NAME}  - Delete app from PM2"
echo "  pm2 monit             - Monitor all apps"

