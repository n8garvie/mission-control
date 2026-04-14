#!/bin/bash
# iOS Build Script for Mission Control
# Usage: build-ios.sh <project-name> <build-directory>

PROJECT_NAME=$1
BUILD_DIR=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$BUILD_DIR" ]; then
    echo "Usage: build-ios.sh <project-name> <build-directory>"
    exit 1
fi

cd "$BUILD_DIR" || exit 1

echo "🍎 Building iOS app: $PROJECT_NAME"

# Copy EAS config and API key
cp ~/.openclaw/workspace/mission-control/templates/eas.json ./eas.json
cp ~/.openclaw/workspace/mission-control/templates/AuthKey.p8 ./AuthKey.p8

# Set up app.json if not exists
if [ ! -f "app.json" ]; then
    cat > app.json << EOF
{
  "expo": {
    "name": "$PROJECT_NAME",
    "slug": "$(echo $PROJECT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.n8garvie.$(echo $PROJECT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')",
      "buildNumber": "1"
    }
  }
}
EOF
fi

echo "📦 Installing EAS CLI..."
npm install --save-dev eas-cli

echo "🔐 Logging into EAS..."
npx eas-cli login

echo "🔧 Configuring project..."
npx eas-cli build:configure -p ios

echo "🚀 Starting iOS build..."
npx eas-cli build --platform ios --profile production --auto-submit

echo "✓ Build submitted! Check email for TestFlight invite."
echo "  Monitor build: https://expo.dev/builds"
