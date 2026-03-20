#!/usr/bin/env bash
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${KIT_DIR}/.env"

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
}

detect_sdk_dir() {
  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "${ANDROID_SDK_ROOT}" ]]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi
  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}" ]]; then
    echo "$ANDROID_HOME"
    return
  fi
  if [[ -d "$HOME/.local/android-sdk" ]]; then
    echo "$HOME/.local/android-sdk"
    return
  fi
  if [[ -d "$HOME/Library/Android/sdk" ]]; then
    echo "$HOME/Library/Android/sdk"
    return
  fi
  echo ""
}

setup_android_env() {
  load_env

  local sdk_dir
  sdk_dir="$(detect_sdk_dir)"
  if [[ -z "$sdk_dir" ]]; then
    echo "ERROR: ANDROID_SDK_ROOT not found. Set it in .env or shell."
    exit 1
  fi

  export ANDROID_SDK_ROOT="$sdk_dir"
  export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH"

  if [[ -n "${JAVA_HOME:-}" ]]; then
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
}

require_tool() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "ERROR: Missing tool: $name"
    exit 1
  fi
}

sdk_install_basics() {
  local api_level="$1"
  local image_pkg="$2"

  yes | sdkmanager --licenses >/dev/null || true
  sdkmanager "platform-tools" "emulator" "platforms;android-${api_level}" "$image_pkg" >/dev/null
}

ensure_avd_exists() {
  local avd_name="$1"
  local image_pkg="$2"
  local auto_create="$3"

  if avdmanager list avd | grep -q "Name: ${avd_name}"; then
    return
  fi

  if [[ "$auto_create" != "true" ]]; then
    echo "ERROR: AVD '${avd_name}' does not exist and AUTO_CREATE_AVD=false"
    exit 1
  fi

  echo "Creating AVD: ${avd_name}"
  echo "no" | avdmanager create avd -n "$avd_name" -k "$image_pkg" >/dev/null
}

wait_for_boot() {
  adb wait-for-device >/dev/null
  until adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'; do
    sleep 2
  done
}
