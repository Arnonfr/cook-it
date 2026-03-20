#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <absolute-apk-path> <application-id> [main-activity]"
  exit 1
fi

APK_PATH="$1"
APPLICATION_ID="$2"
MAIN_ACTIVITY="${3:-.MainActivity}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

setup_android_env
require_tool adb

if [[ ! -f "$APK_PATH" ]]; then
  echo "ERROR: APK not found: $APK_PATH"
  exit 1
fi

adb install -r "$APK_PATH"
adb shell am start -n "${APPLICATION_ID}/${MAIN_ACTIVITY}"

echo "Done: installed and launched ${APPLICATION_ID}"
