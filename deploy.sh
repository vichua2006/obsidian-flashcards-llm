#!/bin/bash

# Deployment script for Obsidian Flashcards LLM Plugin
# This script builds the plugin and copies the necessary files to the test vault

# Exit on error
set -e

# Convert Windows path to WSL path
VAULT_PATH="/mnt/d/User/vichu/Desktop/Personal/test-vault"
PLUGIN_DIR="${VAULT_PATH}/.obsidian/plugins/flashcards-llm"

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
