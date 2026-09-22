# Android development

The Android app bundles the same production Svelte UI, engine, and character
JSON as the website. It runs offline through Capacitor; no development server
or hosted website is needed on the device. The native Gradle project lives in
`apps/web/android/`.

## Build and run

Prerequisites:

- Bun (the version in the root `package.json`) and Node.js 22 or newer.
- A **JDK 21**, including `javac`, selected with `JAVA_HOME`.
- Android SDK Platform 36 and Build Tools 35.0.0 (the Gradle plugin's default). Set `ANDROID_HOME` to your
  SDK directory, or set `sdk.dir` in the ignored
  `apps/web/android/local.properties`.
- For device testing: an Android 7.0/API 24 or newer device with USB debugging,
  or an emulator. API 36 is the initial test target.

Android Studio can install the SDK and manage emulators. Its bundled Java
version varies; check `java -version` and `javac -version` under `JAVA_HOME`
when using the command line. The pinned Gradle wrapper downloads its own Gradle.

```bash
bun install --frozen-lockfile
./scripts/check-all.sh
bun run android:build         # builds web assets, syncs plugins, assembles debug APK
bun run android:run           # same build/sync, then chooses a device and installs
bun run android:open          # same build/sync, then opens Android Studio
bun run android:sync          # refresh assets/plugin links only
```

The APK is `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`.
It is debug-signed and suitable for local testing, not a store release.
To install manually with the SDK's `platform-tools` on your `PATH`:

```bash
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```

Run `android:sync` before building directly in Android Studio or with Gradle,
especially after dependency changes. The scripts invoke the locally installed
Capacitor CLI, never an unpinned downloaded CLI. Generated web assets, plugin
links, build outputs, machine SDK paths, and keystores are ignored. Commit the
native source, Gradle wrapper, Capacitor config, manifests, and `bun.lock`.

## Identity and persistence

The provisional application ID is `io.github.anyangchemistry`; choose the
permanent ID before the first public release. Android's `versionCode` and
`versionName` are explicit in `apps/web/android/app/build.gradle`, initially
`1` and `0.1.0`. Every public update will need a higher `versionCode`.

On Android, `@capacitor/preferences` stores discoveries and the selected
繁/簡 script in native SharedPreferences. The website continues using its
existing localStorage keys. Both use save schema 1 and the same legacy-save
fallback: pre-script saves seed the simplified game only. Operations are
serialized so a delayed save cannot finish after a newer save or reset.
Read failures are surfaced; failed discovery writes offer a retry.

Browser and Android installations have separate storage. Installing the APK
does not import progress from a browser. App updates preserve native saves
when installed over the same application ID with a compatible signature;
uninstalling or clearing app data can remove them. Save import/export or
cross-device synchronization is not implemented.

Android Back closes the trophies dialog first, then sends the app to the
background. The native keyboard consumes Back while it is open. The activity
uses `adjustResize`; Capacitor's SystemBars handling and CSS safe-area padding
keep content clear of system bars and display cutouts.

## Parity checklist

Use the production APK, not a live-reload build. Run these checks after native
or input/persistence changes, alongside `./scripts/check-all.sh` and the browser
checks in [development.md](development.md):

1. Fresh launch defaults to 繁. In airplane mode, relaunch and verify character
   data, palette, hints, and combination rules load without network access.
2. Tap 一 then the center, then the bottom zone to discover 二. Clear, then
   long-press and drag 一 into the center and bottom zones. A quick palette
   swipe should scroll instead of dragging.
3. Switch to 簡, verify progress is separate, make a discovery, and switch back.
4. Force-stop/reopen with each script selected. Verify the preference and both
   sets of discoveries survive.
5. Install an APK with a higher `versionCode` over the existing installation
   (`adb install -r`, same debug signing key). Verify both saves and the selected
   script survive. Do not uninstall as part of this test.
6. Focus search, enter text, dismiss the keyboard with Back, and check that the
   controls remain usable. Check portrait, landscape, and system-bar spacing.
7. Open trophies and press Back: the dialog should close while the game stays
   open. Press Back again: the app should go to the background.
8. Reset one script from trophies and verify the other script survives restart.

Storage tests in `apps/web/tests/` run through the normal workspace test command.
The checklist also needs physical-device coverage before a public release;
emulator verification cannot establish compatibility with every vendor WebView.

## Initial verification

Verified on 2026-09-21 with an API 36 AOSP x86_64 emulator and Android
System WebView 133.0.6943.137:

- Production APK builds with JDK 21; Android `:app:lintDebug` passes.
- Native tap-to-place and long-press touch dragging create discoveries in
  both scripts. Saves and the selected script survive force-stop/relaunch.
- An in-place update from `versionCode` 1 to a temporary test build numbered 2
  preserves both saves and the selected script. The checked-in version remains
  1 (`0.1.0`); the normal build artifact is also version 1.
- Offline cold launch and character hints work in airplane mode.
- The visible soft keyboard resizes the WebView; long hints scroll within
  their panel. Portrait and landscape controls fit inside system insets.
- Back dismisses the keyboard and trophies dialog, then backgrounds the app.
- The repository check suite passes, including 11 web storage/persistence tests.
  Production browser checks cover mouse dragging, touch placement, both scripts,
  reloads, hints, trophies, and compact/landscape layouts.

Physical-device validation remains pending: the offered USB phone was not
visible to ADB during this verification. Bundled fonts are still a later
milestone, so glyph appearance depends on the device's installed fonts.

## Later milestones

This first Android slice stops at local APK creation and parity verification.
The launcher/splash assets are still Capacitor placeholders. Bundled Taiwan
fonts, artwork, automated CI APK artifacts, release signing, store listings,
Play upload, and F-Droid submission are follow-up work.

Keep the runtime free of proprietary SDKs for F-Droid. Before public releases,
choose a signing strategy across Play, direct APKs, and F-Droid, and prove the
full Bun/Vite/Gradle build in F-Droid's environment. A lockfile alone does not
prove reproducible APKs. See [deployment.md](deployment.md).
