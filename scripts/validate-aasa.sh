#!/bin/bash
# OrbitKit AASA Validation — Add as Xcode Run Script Build Phase
#
# Validates that your AASA configuration on OrbitKit matches your
# app's Associated Domains entitlements at build time.
#
# Required environment variables (set in Xcode build settings or env):
#   ORBITKIT_API_KEY   — Your OrbitKit API key (ok_...)
#   ORBITKIT_APP_ID    — Your OrbitKit app ID
#
# Optional:
#   ORBITKIT_API_ENDPOINT — API base URL (default: https://api.orbitkit.io)
#
# Usage in Xcode:
#   1. Select your target → Build Phases → + → New Run Script Phase
#   2. Set the script to: bash path/to/validate-aasa.sh
#   3. Add ORBITKIT_API_KEY and ORBITKIT_APP_ID to build settings or scheme env

set -euo pipefail

# Skip in non-debug builds or CI (optional — remove to always run)
if [ "${CONFIGURATION:-}" = "Release" ]; then
  exit 0
fi

# Verify required environment
if [ -z "${ORBITKIT_API_KEY:-}" ] || [ -z "${ORBITKIT_APP_ID:-}" ]; then
  echo "note: ORBITKIT_API_KEY or ORBITKIT_APP_ID not set. Skipping AASA validation."
  exit 0
fi

API_ENDPOINT="${ORBITKIT_API_ENDPOINT:-https://api.orbitkit.io}"

# Find entitlements file — use CODE_SIGN_ENTITLEMENTS build setting first
ENTITLEMENTS_FILE=""
if [ -n "${CODE_SIGN_ENTITLEMENTS:-}" ] && [ -n "${SRCROOT:-}" ]; then
  CANDIDATE="${SRCROOT}/${CODE_SIGN_ENTITLEMENTS}"
  if [ -f "$CANDIDATE" ]; then
    ENTITLEMENTS_FILE="$CANDIDATE"
  fi
fi

# Fallback: search for .entitlements file
if [ -z "$ENTITLEMENTS_FILE" ]; then
  SEARCH_ROOT="${SRCROOT:-.}"
  ENTITLEMENTS_FILE=$(find "$SEARCH_ROOT" -name "*.entitlements" -maxdepth 3 -print -quit 2>/dev/null || true)
fi

if [ -z "$ENTITLEMENTS_FILE" ] || [ ! -f "$ENTITLEMENTS_FILE" ]; then
  echo "note: No .entitlements file found. Skipping AASA validation."
  exit 0
fi

# Extract associated domains using PlistBuddy (macOS built-in)
DOMAINS=$(/usr/libexec/PlistBuddy -c "Print :com.apple.developer.associated-domains" "$ENTITLEMENTS_FILE" 2>/dev/null || true)
if [ -z "$DOMAINS" ]; then
  exit 0  # No associated domains — nothing to validate
fi

# Fetch AASA config from OrbitKit API
AASA_RESPONSE=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ORBITKIT_API_KEY" \
  "${API_ENDPOINT}/api/apps/${ORBITKIT_APP_ID}/aasa" 2>/dev/null || true)

if [ -z "$AASA_RESPONSE" ]; then
  echo "warning: Could not reach OrbitKit API. Skipping AASA validation."
  exit 0
fi

# Check for API error
API_ERROR=$(echo "$AASA_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    err = data.get('error', {})
    if isinstance(err, dict) and err.get('code'):
        print(err['code'])
except: pass
" 2>/dev/null || true)

if [ "$API_ERROR" = "NOT_FOUND" ]; then
  echo "warning: No AASA configured on OrbitKit for this app. Set up at https://orbitkit.io/dashboard"
  exit 0
elif [ -n "$API_ERROR" ]; then
  echo "warning: OrbitKit API error: $API_ERROR. Skipping AASA validation."
  exit 0
fi

# Build expected App ID from Xcode build settings
EXPECTED_APP_ID="${DEVELOPMENT_TEAM:-TEAMID}.${PRODUCT_BUNDLE_IDENTIFIER:-com.example.app}"

# Extract app IDs from each AASA section
extract_app_ids() {
  local section="$1"
  echo "$AASA_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    section = data.get('$section') or {}
    for aid in section.get('appIDs', []):
        print(aid)
except: pass
" 2>/dev/null || true
}

UL_APP_IDS=$(extract_app_ids "universalLinks")
WC_APP_IDS=$(extract_app_ids "webCredentials")
AC_APP_IDS=$(extract_app_ids "appClips")
HC_APP_IDS=$(extract_app_ids "activityContinuation")

WARNINGS=0

# Check Universal Links (applinks:)
if echo "$DOMAINS" | grep -q "applinks:"; then
  if [ -z "$UL_APP_IDS" ]; then
    echo "warning: Entitlements has applinks: but no Universal Links configured in OrbitKit AASA"
    WARNINGS=$((WARNINGS + 1))
  elif ! echo "$UL_APP_IDS" | grep -qF "$EXPECTED_APP_ID"; then
    echo "warning: Entitlements has applinks: but OrbitKit AASA Universal Links doesn't include $EXPECTED_APP_ID"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check Web Credentials (webcredentials:)
if echo "$DOMAINS" | grep -q "webcredentials:"; then
  if [ -z "$WC_APP_IDS" ]; then
    echo "warning: Entitlements has webcredentials: but no Web Credentials configured in OrbitKit AASA"
    WARNINGS=$((WARNINGS + 1))
  elif ! echo "$WC_APP_IDS" | grep -qF "$EXPECTED_APP_ID"; then
    echo "warning: Entitlements has webcredentials: but OrbitKit AASA Web Credentials doesn't include $EXPECTED_APP_ID"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check App Clips (appclips:)
if echo "$DOMAINS" | grep -q "appclips:"; then
  if [ -z "$AC_APP_IDS" ]; then
    echo "warning: Entitlements has appclips: but no App Clip IDs configured in OrbitKit AASA"
    WARNINGS=$((WARNINGS + 1))
  elif ! echo "$AC_APP_IDS" | grep -qF "$EXPECTED_APP_ID"; then
    echo "warning: Entitlements has appclips: but OrbitKit AASA App Clips doesn't include $EXPECTED_APP_ID"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check Handoff / Activity Continuation (activitycontinuation:)
if echo "$DOMAINS" | grep -q "activitycontinuation:"; then
  if [ -z "$HC_APP_IDS" ]; then
    echo "warning: Entitlements has activitycontinuation: but no Handoff IDs configured in OrbitKit AASA"
    WARNINGS=$((WARNINGS + 1))
  elif ! echo "$HC_APP_IDS" | grep -qF "$EXPECTED_APP_ID"; then
    echo "warning: Entitlements has activitycontinuation: but OrbitKit AASA Handoff doesn't include $EXPECTED_APP_ID"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

if [ "$WARNINGS" -eq 0 ]; then
  echo "note: OrbitKit AASA validation passed for $EXPECTED_APP_ID"
else
  echo "note: OrbitKit AASA validation found $WARNINGS warning(s) for $EXPECTED_APP_ID"
fi
