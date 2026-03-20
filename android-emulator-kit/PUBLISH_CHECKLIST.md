# Publish Checklist

## Files to upload to Git

- `.env.example`
- `.gitignore`
- `README.md`
- `scripts/common.sh`
- `scripts/run-emulator.sh`
- `scripts/build-install-launch.sh`
- `scripts/install-apk.sh`

## Files not to upload

- `.env`
- Anything under `~/.android/`
- Anything under Android SDK path (for example `~/Library/Android/sdk` or `~/.local/android-sdk`)
- Build outputs and local logs

## Suggested GitHub repo description

Reusable CLI toolkit for Android emulator workflows: boot shared AVD, build/install/launch apps, and reuse the same emulator across multiple Android projects.

## Suggested tags

`android` `emulator` `adb` `gradle` `cli` `automation` `developer-tools`
