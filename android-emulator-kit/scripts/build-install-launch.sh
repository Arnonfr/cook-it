#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

setup_android_env
require_tool adb
require_tool sdkmanager
require_tool avdmanager
require_tool emulator

AVD_NAME="${AVD_NAME:-shared_api35}"
API_LEVEL="${API_LEVEL:-35}"
ABI="${ABI:-arm64-v8a}"
SYSTEM_IMAGE="${SYSTEM_IMAGE:-google_apis}"
AUTO_CREATE_AVD="${AUTO_CREATE_AVD:-true}"
IMG_PACKAGE="system-images;android-${API_LEVEL};${SYSTEM_IMAGE};${ABI}"

PROJECT_DIR="${PROJECT_DIR:-}"
APK_RELATIVE_PATH="${APK_RELATIVE_PATH:-app/build/outputs/apk/debug/app-debug.apk}"
GRADLE_TASK="${GRADLE_TASK:-assembleDebug}"
APPLICATION_ID="${APPLICATION_ID:-}"
MAIN_ACTIVITY="${MAIN_ACTIVITY:-.MainActivity}"

if [[ -z "$PROJECT_DIR" || -z "$APPLICATION_ID" ]]; then
  echo "ERROR: PROJECT_DIR and APPLICATION_ID must be set in .env"
  exit 1
fi

echo "Ensuring SDK packages..."
sdk_install_basics "$API_LEVEL" "$IMG_PACKAGE"
ensure_avd_exists "$AVD_NAME" "$IMG_PACKAGE" "$AUTO_CREATE_AVD"

if ! adb devices | grep -q "emulator-"; then
  echo "Booting emulator: ${AVD_NAME}"
  nohup emulator -avd "$AVD_NAME" -netdelay none -netspeed full >/tmp/android-emulator-kit.log 2>&1 &
fi

wait_for_boot

cd "$PROJECT_DIR"
if [[ ! -x "./gradlew" ]]; then
  echo "ERROR: gradlew not found in PROJECT_DIR=$PROJECT_DIR"
  exit 1
fi

./gradlew "$GRADLE_TASK"

APK_PATH="$PROJECT_DIR/$APK_RELATIVE_PATH"
if [[ ! -f "$APK_PATH" ]]; then
  echo "ERROR: APK not found at $APK_PATH"
  exit 1
fi

adb install -r "$APK_PATH"
adb shell am start -n "${APPLICATION_ID}/${MAIN_ACTIVITY}"

echo "Done: app installed and launched on emulator."
