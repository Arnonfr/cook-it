#!/bin/bash
# Setup Firebase configuration from environment secrets

set -e

FIREBASE_JSON="$1"
OUTPUT_PATH="frontend/android/app/google-services.json"

if [ -z "$FIREBASE_JSON" ]; then
    echo "⚠️  No FIREBASE_SERVICE_ACCOUNT provided. Firebase features will be disabled."
    exit 0
fi

echo "🔥 Setting up Firebase configuration..."

# Decode and write the JSON
echo "$FIREBASE_JSON" > "$OUTPUT_PATH"

echo "✅ Firebase configuration saved to $OUTPUT_PATH"
