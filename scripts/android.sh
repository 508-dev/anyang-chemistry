#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

mode="${1:-build}"
if [ "$#" -gt 0 ]; then shift; fi
case "$mode" in
  sync|build|run|open) ;;
  *) echo "Usage: $0 {sync|build|run|open} [tool arguments]" >&2; exit 2 ;;
esac

case "$mode" in
  build|run)
    android_javac="${JAVA_HOME:+$JAVA_HOME/bin/}javac"
    android_java_version=$("$android_javac" -version 2>&1) || {
      echo "Android builds require JDK 21 (including javac). Set JAVA_HOME to its directory." >&2
      exit 1
    }
    case "$android_java_version" in
      "javac 21."*) ;;
      *) echo "Set JAVA_HOME to JDK 21 for the pinned Android toolchain (found: $android_java_version)." >&2; exit 1 ;;
    esac
    ;;
esac

# Always package the current production UI and character data, even when opening
# Android Studio. No development server is needed on the device.
bun run build
bun run --cwd apps/web cap sync android

case "$mode" in
  sync) ;;
  build)
    cd apps/web/android
    ./gradlew assembleDebug "$@"
    ;;
  run) bun run --cwd apps/web cap run android --no-sync "$@" ;;
  open) bun run --cwd apps/web cap open android "$@" ;;
esac
