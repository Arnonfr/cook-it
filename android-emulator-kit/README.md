# Android Emulator Kit

A reusable CLI toolkit to run a shared Android emulator and test any Android app without opening Android Studio.

## What this gives you

- Shared emulator profile for multiple projects
- One command to build, install, and launch app
- Works across projects by changing `.env`

## Repository structure

```
android-emulator-kit/
  .env.example
  .gitignore
  scripts/
    common.sh
    run-emulator.sh
    build-install-launch.sh
    install-apk.sh
```

## Prerequisites

- Android SDK installed (`platform-tools`, `cmdline-tools`, `emulator`)
- Java 17+ (or 21)
- macOS/Linux shell

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Edit `.env` with your local paths and project values:

- `ANDROID_SDK_ROOT`
- `JAVA_HOME` (optional but recommended)
- `PROJECT_DIR`
- `APPLICATION_ID`
- `MAIN_ACTIVITY` (default: `.MainActivity`)

## Usage

### 1) Start emulator only

```bash
./scripts/run-emulator.sh
```

### 2) Build + install + launch from a project

```bash
./scripts/build-install-launch.sh
```

This will:

1. Ensure SDK packages exist
2. Ensure AVD exists (and create if needed)
3. Boot emulator if not running
4. Build APK using Gradle task
5. Install and launch app

### 3) Install existing APK directly

```bash
./scripts/install-apk.sh /absolute/path/app-debug.apk com.example.app .MainActivity
```

## Reuse with another project

Change only these values in `.env`:

- `PROJECT_DIR`
- `APK_RELATIVE_PATH`
- `GRADLE_TASK`
- `APPLICATION_ID`
- `MAIN_ACTIVITY`

The emulator profile can stay the same.

## What to commit

Commit:

- `scripts/*.sh`
- `.env.example`
- `.gitignore`
- `README.md`

Do NOT commit:

- `.env`
- local SDK folders
- AVD folders (`~/.android/avd`)
- machine-specific IDE files

## Notes

- First run may take longer due to system image download.
- If adb is stuck, run:

```bash
adb kill-server && adb start-server
```
