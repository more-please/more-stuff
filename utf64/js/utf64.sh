#!/bin/sh

# Simple launcher for utf64.tool.js (as TSC doesn't make it executable)

exec node $(dirname $0)/dist/utf64.tool.js "$@"
