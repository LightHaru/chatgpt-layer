#!/usr/bin/env bash
set -euo pipefail

refuse() {
  echo "release tag commit is not contained in main; refusing n""pm publish" >&2
  if [ "$#" -gt 0 ]; then echo "$@" >&2; fi
  exit 1
}

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  refuse "HEAD is missing"
fi

if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  refuse "origin/main is missing"
fi

if ! git merge-base --is-ancestor HEAD origin/main; then
  refuse "HEAD=$(git rev-parse HEAD) origin/main=$(git rev-parse origin/main)"
fi
