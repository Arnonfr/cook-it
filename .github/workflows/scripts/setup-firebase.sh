#!/bin/bash
# Setup Firebase configuration from environment secrets

set -e

FIREBASE_JSON="$1"
GOOGLE_SERVICES_PATH="frontend/android/app/google-services.json"

if [ -z "$FIREBASE_JSON" ]; then
    echo "⚠️  No FIREBASE_SERVICE_ACCOUNT provided. Firebase features will be disabled."
    # Create a minimal placeholder to prevent build errors
    mkdir -p "frontend/android/app"
    cat > "$GOOGLE_SERVICES_PATH" << 'EOF'
{
  "project_info": {
    "project_number": "",
    "project_id": "",
    "storage_bucket": ""
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "",
        "android_client_info": {
          "package_name": "com.cookit.app"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": ""
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
EOF
    echo "✅ Created placeholder google-services.json"
    exit 0
fi

echo "🔥 Setting up Firebase configuration..."

# For actual Firebase setup, we need to download the real google-services.json
# This requires Firebase CLI or manual download
# For now, create a minimal config that will work for building

mkdir -p "frontend/android/app"
cat > "$GOOGLE_SERVICES_PATH" << EOF
{
  "project_info": {
    "project_number": "629153402724",
    "project_id": "subty-ca344",
    "storage_bucket": "subty-ca344.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:629153402724:android:fb933cd078c975a42c3471",
        "android_client_info": {
          "package_name": "com.cookit.app"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyCT4mJIkoZnkFgzfGXFYC_-6i6hIVVez08"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
EOF

echo "✅ Firebase configuration saved to $GOOGLE_SERVICES_PATH"
