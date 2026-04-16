#!/usr/bin/env bash
# Generate the Xcode project and patch it so it opens in Xcode 15.x.
#
# Why the patch: XcodeGen 2.45+ stamps objectVersion = 77, which only Xcode 16+
# can read. 15.x caps at 60. Drop this helper once we move to Xcode 16.

set -euo pipefail
cd "$(dirname "$0")"

xcodegen generate

PBXPROJ="ESR.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
    # Force objectVersion 60 (Xcode 15-compatible).
    /usr/bin/sed -i '' 's/objectVersion = [0-9]*;/objectVersion = 60;/' "$PBXPROJ"
    echo "Patched $PBXPROJ → objectVersion = 60 (Xcode 15.x compatible)"
fi

echo "Done. Open ESR.xcodeproj in Xcode."
