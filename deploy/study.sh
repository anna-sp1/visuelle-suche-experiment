#!/usr/bin/env bash
# Packs the experiment as a JATOS study archive (.jzip) and, with "upload", imports it into JATOS.
#
#   deploy/study.sh            builds deploy/dist/visuelle-suche.jzip
#   deploy/study.sh upload     builds it and imports it through JATOS's API
#
# The first import creates the study; later ones update it (fixed UUIDs below): new files,
# study properties set in the JATOS GUI kept (keepProperties), results untouched.
#
# upload reads JATOS_TOKEN (JATOS: user menu > API tokens) and JATOS_URL from the environment
# or from deploy/.env. JATOS_URL defaults to http://localhost:9000: JATOS itself when run on
# the server, or an SSH tunnel to it (deploy/README.md).
#
# Needs bash and curl, plus zip; without zip it uses the system's python3 (standard library only).
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")
dir_name=visuelle_suche
archive="$here/dist/visuelle-suche.jzip"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# What the page loads at runtime (index.html, its scripts, style.css, the preview image and
# table, the prepared trial plans and stimuli). Source archives, docs and tests stay out.
FILES=(index.html style.css ai-trial.js common-start.js conditions.js config.js
       customization.js daisy-ui.js experiment.js functions.js standard.js storage.js)
DIRECTORIES=(bilder tabellen data/generated)

# The study's properties, as JATOS 3.x writes them into an archive (serial version 3).
study_json() {
    cat <<EOF
{
  "version": "3",
  "data": {
    "uuid": "d6170cad-1259-4972-957c-b8aec8e1caa7",
    "title": "Visuelle Suche Experiment",
    "description": "Visual search with an AI assistant: four versions, balanced by the batch session.",
    "groupStudy": false,
    "linearStudy": false,
    "allowPreview": false,
    "dirName": "$dir_name",
    "comments": "Built by deploy/study.sh; see docs/JATOS.md.",
    "componentList": [{
      "uuid": "e312390f-424c-4c1b-9b17-aa42420456f4",
      "title": "Experiment",
      "htmlFilePath": "index.html",
      "reloadable": false,
      "active": true
    }],
    "batchList": [{
      "uuid": "a624d4b2-6bea-4abb-a250-0301b6ceaee7",
      "title": "Default",
      "active": true,
      "allowedWorkerTypes": ["Jatos", "PersonalSingle", "PersonalMultiple", "GeneralSingle", "GeneralMultiple"]
    }]
  }
}
EOF
}

build() {
    local stage="$work/stage"
    mkdir -p "$stage/$dir_name"
    for file in "${FILES[@]}"; do
        [[ -f "$root/$file" ]] || { echo "Missing $file" >&2; exit 1; }
        cp "$root/$file" "$stage/$dir_name/$file"
    done
    for dir in "${DIRECTORIES[@]}"; do
        [[ -d "$root/$dir" ]] || { echo "Missing directory $dir" >&2; exit 1; }
        mkdir -p "$stage/$dir_name/$(dirname "$dir")"
        cp -R "$root/$dir" "$stage/$dir_name/$dir"
    done
    study_json > "$stage/visuelle-suche.jas"

    mkdir -p "$(dirname "$archive")"
    rm -f "$archive"
    if command -v zip >/dev/null; then
        (cd "$stage" && zip -q -r -X "$archive" visuelle-suche.jas "$dir_name")
    elif command -v python3 >/dev/null; then
        python3 -I - "$stage" "$archive" <<'EOF'
import os, sys, zipfile
stage, archive = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for folder, dirs, files in os.walk(stage):
        dirs.sort()
        for name in sorted(files):
            path = os.path.join(folder, name)
            z.write(path, os.path.relpath(path, stage).replace(os.sep, '/'))
EOF
    else
        echo "Needs zip (e.g. sudo apt install zip) or python3 to pack the archive." >&2
        exit 1
    fi
    echo "Built $archive ($(du -k "$archive" | cut -f1) KiB)"
}

# A value from the environment, else from deploy/.env (read, never executed), else a default.
setting() {
    local name=$1 default=${2:-} value=${!1:-}
    if [[ -z "$value" && -f "$here/.env" ]]; then
        value=$(grep -E "^$name=" "$here/.env" | tail -n 1 | cut -d= -f2- || true)
    fi
    value=${value%\"}; value=${value#\"}; value=${value%\'}; value=${value#\'}
    echo "${value:-$default}"
}

upload() {
    local url token response status
    url=$(setting JATOS_URL http://localhost:9000)
    token=$(setting JATOS_TOKEN)
    [[ -n "$token" ]] || { echo "Set JATOS_TOKEN (JATOS: user menu > API tokens), in the environment or deploy/.env." >&2; exit 1; }
    response="$work/response"
    echo "Importing into ${url%/} ..."
    status=$(curl -sS -o "$response" -w '%{http_code}' \
        -H "Authorization: Bearer $token" \
        -F "study=@$archive;type=application/zip" \
        "${url%/}/jatos/api/v1/studies?keepProperties=true") || { echo "Could not reach ${url%/}" >&2; exit 1; }
    case $status in
        201) echo "Imported as a new study." ;;
        200) echo "Updated the existing study." ;;
        *) echo "JATOS answered HTTP $status:" >&2; cat "$response" >&2; echo >&2; exit 1 ;;
    esac
}

case ${1:-build} in
    build) build ;;
    upload) build; upload ;;
    *) echo "Usage: deploy/study.sh [build|upload]" >&2; exit 2 ;;
esac
