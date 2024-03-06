#!/usr/bin/env bash

SELF="$(readlink -f -- "${0}")"
ROOT="$(dirname -- "${SELF}")"

TSX="${ROOT}/node_modules/.bin/tsx"

exec ${TSX} "${ROOT}/runfig.ts" "${@}"
