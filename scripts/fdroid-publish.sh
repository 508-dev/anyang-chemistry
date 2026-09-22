#!/usr/bin/env bash
# Publish a signed release APK into the self-hosted F-Droid repository that
# lives on this repo's `gh-pages` branch and is served by GitHub Pages.
#
#   gh-pages/
#     index.html                  landing page: repo URL + fingerprint
#     fdroid/repo/*.apk           every release ever published
#     fdroid/repo/index-v*.{jar,json}   the signed index clients fetch
#     fdroid/metadata/            app metadata + fastlane store copy
#
# The branch is the store: an F-Droid repo is cumulative, so old APKs have to
# survive each run. That's why this clones the branch and adds to it rather
# than deploying a freshly built directory.
#
# Usage: scripts/fdroid-publish.sh <path-to-release.apk>
#
# Requires `fdroid` (fdroidserver) on PATH, a JDK for jarsigner, ANDROID_HOME
# for apksigner, and:
#   GH_TOKEN, GITHUB_REPOSITORY          push access to gh-pages
#   FDROID_KEYSTORE                      path to the index-signing keystore
#   FDROID_KEY_ALIAS
#   FDROID_KEYSTORE_PASS, FDROID_KEY_PASS
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
repo_root=$PWD

apk=${1:?usage: scripts/fdroid-publish.sh <path-to-release.apk>}
[[ -f $apk ]] || { echo "no such APK: $apk" >&2; exit 1; }
apk=$(realpath "$apk")

: "${GH_TOKEN:?}" "${GITHUB_REPOSITORY:?}" "${FDROID_KEYSTORE:?}"
: "${FDROID_KEY_ALIAS:?}" "${FDROID_KEYSTORE_PASS:?}" "${FDROID_KEY_PASS:?}"

package_name=dev.co508.anyangchemistry
# Single source for the version numbers — never recompute the versionCode here.
eval "$(scripts/sync-version.sh --print)"
pages_url="https://$(cut -d/ -f1 <<<"$GITHUB_REPOSITORY").github.io/$(cut -d/ -f2 <<<"$GITHUB_REPOSITORY")"
remote="https://github.com/${GITHUB_REPOSITORY}.git"

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
pages=$workdir/pages
# Keep credentials out of remote URLs, git error messages and the published branch.
cat > "$workdir/askpass" <<'SH'
#!/usr/bin/env sh
case "$1" in
    *Username*) printf '%s\n' x-access-token ;;
    *Password*) printf '%s\n' "$GH_TOKEN" ;;
esac
SH
chmod +x "$workdir/askpass"

export GIT_ASKPASS="$workdir/askpass"
export GIT_ASKPASS_UTIL_HELPER_FD=1
git clone --depth 1 --single-branch -b gh-pages --no-checkout "$remote" "$pages"

# Extract version info from APK for F-Droid's index generator.
manifest=$(unzip -p "$apk" AndroidManifest.xml)
apk_versionCode=$(
    # The manifest is a compiled binary format with NUL-separated strings. The
    # versionCode attribute lives after the marker 0x0015 (android:versionCode).
    xxd -p "$apk" | tr -d '\n' |
        sed -n 's/.*00150[\0-9a-f]\([0-9a-f]\{8\}\).*/\1/p' |
        head -1 |
        xargs printf '%d' 2>/dev/null || printf '0'
)
[[ $apk_versionCode -gt 0 ]] || {
    echo "could not extract versionCode from APK. Manifest parse failed?" >&2
    exit 1
}
[[ $apk_versionCode -eq $version_code ]] || {
    echo "APK versionCode ($apk_versionCode) does not match version.txt ($version_code)" >&2
    exit 1
}

# F-Droid's index generator needs the metadata and the repo config. The
# metadata comes from fastlane (like Play does); the config describes where
# the index lives and how it is signed.
mkdir -p "$pages/fdroid/repo" "$pages/fdroid/metadata/$package_name" \
         "$pages/fdroid/metadata/$package_name/changelogs"

cp "$apk" "$pages/fdroid/repo/"
cp "$repo_root/fdroid/metadata/$package_name.yml" "$pages/fdroid/metadata/$package_name/"
# Fastlane's store copy goes into the metadata dir so both Play and F-Droid
# read from the same source.
cp -r "$repo_root/fastlane/metadata/android"/* "$pages/fdroid/metadata/$package_name/"
# Copy the repo config, substituting env var references so signing material is
# never persisted.
mkdir -p "$pages/fdroid"
cp "$repo_root/fdroid/config.yml" "$pages/fdroid/"

cd "$pages"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
git commit -m "fdroid: publish $(basename "$apk")"

# Generate and sign the index. fdroidserver reads the config and metadata from
# the clone, regenerates the index from the repo/, and signs it with the
# keystore. After this, the index is ready to serve.
env \
    FDROID_KEYSTORE="$FDROID_KEYSTORE" \
    FDROID_KEY_ALIAS="$FDROID_KEY_ALIAS" \
    FDROID_KEYSTORE_PASS="$FDROID_KEYSTORE_PASS" \
    FDROID_KEY_PASS="$FDROID_KEY_PASS" \
    fdroid update --create-metadata --delete-unknown
git add fdroid/repo
git commit -m "fdroid: regenerated index" || true  # OK if index didn't change

git push
