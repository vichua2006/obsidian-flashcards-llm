#!/bin/bash

# Deployment script for Obsidian Flashcards LLM Plugin
# This script builds the plugin and copies the necessary files to the test vault

# Exit on error
set -e

# Load environment variables from .env file if it exists
# Strip carriage returns to handle Windows line endings
if [ -f .env ]; then
    export $(cat .env | tr -d '\r' | xargs)
fi

# Check if OBSIDIAN_PLUGIN_PATH is set
if [ -z "$OBSIDIAN_PLUGIN_PATH" ]; then
    echo "Error: OBSIDIAN_PLUGIN_PATH is not set."
    echo "Please create a .env file with OBSIDIAN_PLUGIN_PATH=/path/to/your/plugin"
    exit 1
fi

# Use the path directly as the plugin directory
PLUGIN_DIR="${OBSIDIAN_PLUGIN_PATH}"

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
