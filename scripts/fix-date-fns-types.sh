#!/bin/sh
# date-fns v4 ships only .d.cts type files, which TypeScript's node10
# moduleResolution cannot resolve. Copy them to .d.ts so the type
# checker finds them when module is set to commonjs.
find node_modules/date-fns -name '*.d.cts' -exec sh -c 'for f; do cp "$f" "${f%.d.cts}.d.ts"; done' _ {} +
echo "date-fns: copied .d.cts -> .d.ts for node10 compatibility"
