#!/bin/bash

# Deployment script for Obsidian Flashcards LLM Plugin
# This script builds the plugin and copies the necessary files to the test vault

# Exit on error
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Check if OBSIDIAN_VAULT_PATH is set
if [ -z "$OBSIDIAN_VAULT_PATH" ]; then
    echo "Error: OBSIDIAN_VAULT_PATH is not set."
    echo "Please create a .env file with OBSIDIAN_VAULT_PATH=/path/to/your/vault"
    exit 1
fi

# Construct plugin directory path
PLUGIN_DIR="${OBSIDIAN_VAULT_PATH}/.obsidian/plugins/flashcards-llm"

echo "Building plugin..."
npm run build

echo "Creating plugin directory if it doesn't exist..."
mkdir -p "${PLUGIN_DIR}"

echo "Copying plugin files to ${PLUGIN_DIR}..."
cp main.js "${PLUGIN_DIR}/"
cp manifest.json "${PLUGIN_DIR}/"
cp styles.css "${PLUGIN_DIR}/"

echo "✓ Plugin deployed successfully to test vault!"
echo "  Location: ${PLUGIN_DIR}"
echo "  Remember to reload Obsidian to see the changes."
