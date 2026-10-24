#!/bin/sh
# Clones every repository of a lock file at its pinned commit: ./fetch.sh refs.lock refs | ./fetch.sh testroms.lock ../testroms
# The clones are third-party material and stay out of git (see ../.gitignore).
set -eu
LOCK=$1; DEST=$2
mkdir -p "$DEST"
grep -v '^#' "$LOCK" | while read -r name url commit _; do
  [ -n "$name" ] || continue
  if [ ! -d "$DEST/$name/.git" ]; then git init -q "$DEST/$name" && git -C "$DEST/$name" remote add origin "$url"; fi
  git -C "$DEST/$name" fetch -q --depth 1 origin "$commit"
  git -C "$DEST/$name" -c advice.detachedHead=false checkout -q "$commit"
  echo "$name $(git -C "$DEST/$name" rev-parse HEAD)"
done
