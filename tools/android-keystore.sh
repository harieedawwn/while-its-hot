#!/usr/bin/env bash
# One-time: make the signing keystore and store it as GitHub secrets. Needs `gh auth login` first.
set -euo pipefail
cd "$(dirname "$0")/.."
KS=android/wih.keystore
[ -f "$KS" ] && { echo "$KS exists - refusing to overwrite"; exit 1; }
PASS=$(openssl rand -hex 16)
keytool -genkeypair -v -keystore "$KS" -alias wih -keyalg RSA -keysize 2048 -validity 36500 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=While It's Hot, O=WIH, C=VN"
base64 -w0 "$KS" | gh secret set ANDROID_KEYSTORE_B64
printf %s "$PASS" | gh secret set ANDROID_KEYSTORE_PASSWORD
printf %s "$PASS" | gh secret set ANDROID_KEY_PASSWORD
printf %s wih | gh secret set ANDROID_KEY_ALIAS
echo "Done. Keep $KS safe (git-ignored)."
