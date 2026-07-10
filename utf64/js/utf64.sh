#!/bin/sh

# Simple launcher for utf64.tool.mjs (as tsdown doesn't make it executable)

exec node $(dirname $0)/build/utf64.tool.mjs "$@"
