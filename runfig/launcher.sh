#!/usr/bin/env bash

SELF="$(readlink -f -- "${0}")"
ROOT="$(dirname -- "${SELF}")"

BUN="${ROOT}/node_modules/.bin/bun"

exec ${BUN} "${ROOT}/runfig.ts" "${@}"
