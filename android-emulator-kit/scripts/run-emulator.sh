#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

setup_android_env
require_tool adb
require_tool emulator
require_tool sdkmanager
require_tool avdmanager

AVD_NAME="${AVD_NAME:-shared_api35}"
API_LEVEL="${API_LEVEL:-35}"
ABI="${ABI:-arm64-v8a}"
SYSTEM_IMAGE="${SYSTEM_IMAGE:-google_apis}"
AUTO_CREATE_AVD="${AUTO_CREATE_AVD:-true}"
IMG_PACKAGE="system-images;android-${API_LEVEL};${SYSTEM_IMAGE};${ABI}"

echo "Ensuring SDK packages..."
sdk_install_basics "$API_LEVEL" "$IMG_PACKAGE"

ensure_avd_exists "$AVD_NAME" "$IMG_PACKAGE" "$AUTO_CREATE_AVD"

if adb devices | grep -q "emulator-"; then
  echo "An emulator is already running."
  exit 0
fi

echo "Starting emulator: ${AVD_NAME}"
emulator -avd "$AVD_NAME" -netdelay none -netspeed full
