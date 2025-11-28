#!/bin/bash

# Deployment script for Obsidian Flashcards LLM Plugin
# This script builds the plugin and copies the necessary files to the vault
# Usage:
#   ./deploy.sh       - Deploy to staging (default)
#   ./deploy.sh -p    - Deploy to production

# Exit on error
set -e

# Parse command line arguments
DEPLOY_TO_PRODUCTION=false
while getopts "p" opt; do
    case $opt in
        p)
            DEPLOY_TO_PRODUCTION=true
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            echo "Usage: $0 [-p]"
            echo "  -p: Deploy to production (default: staging)"
            exit 1
            ;;
    esac
done

# Load environment variables from .env file if it exists
# Strip carriage returns to handle Windows line endings
if [ -f .env ]; then
    export $(cat .env | tr -d '\r' | xargs)
fi

# Determine which path to use
if [ "$DEPLOY_TO_PRODUCTION" = true ]; then
    # Check if OBSIDIAN_PRODUCTION_PATH is set
    if [ -z "$OBSIDIAN_PRODUCTION_PATH" ]; then
        echo "Error: OBSIDIAN_PRODUCTION_PATH is not set."
        echo "Please add OBSIDIAN_PRODUCTION_PATH=/path/to/your/production/plugin to your .env file"
        exit 1
    fi
    PLUGIN_DIR="${OBSIDIAN_PRODUCTION_PATH}"
    ENVIRONMENT="production"
else
    # Check if OBSIDIAN_STAGING_PATH is set
    if [ -z "$OBSIDIAN_STAGING_PATH" ]; then
        echo "Error: OBSIDIAN_STAGING_PATH is not set."
        echo "Please add OBSIDIAN_STAGING_PATH=/path/to/your/staging/plugin to your .env file"
        exit 1
    fi
    PLUGIN_DIR="${OBSIDIAN_STAGING_PATH}"
    ENVIRONMENT="staging"
fi

echo "Building plugin..."
npm run build

echo "Creating plugin directory if it doesn't exist..."
mkdir -p "${PLUGIN_DIR}"

echo "Copying plugin files to ${ENVIRONMENT} (${PLUGIN_DIR})..."
cp main.js "${PLUGIN_DIR}/"
cp manifest.json "${PLUGIN_DIR}/"
cp styles.css "${PLUGIN_DIR}/"

echo "✓ Plugin deployed successfully to ${ENVIRONMENT}!"
echo "  Location: ${PLUGIN_DIR}"
echo "  Remember to reload Obsidian to see the changes."
