#!/usr/bin/env bash
# Builds the study archive and imports it into JATOS through JATOS's API.
# The first import creates the study; later ones update it (same UUID): new files,
# study properties set in the JATOS GUI kept (keepProperties), results untouched.
#
# Usage: JATOS_URL=https://studie.example.de JATOS_TOKEN=jap_... deploy/upload-study.sh
# The token is made in JATOS: user menu (top right) > API tokens.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
: "${JATOS_URL:?set JATOS_URL, e.g. https://studie.example.de}"
: "${JATOS_TOKEN:?set JATOS_TOKEN to a JATOS API token}"

archive="$here/dist/visuelle-suche.jzip"
python3 "$here/build-study.py" "$archive"
curl --fail-with-body -sS \
  -H "Authorization: Bearer $JATOS_TOKEN" \
  -F "study=@$archive;type=application/zip" \
  "${JATOS_URL%/}/jatos/api/v1/studies?keepProperties=true"
echo
