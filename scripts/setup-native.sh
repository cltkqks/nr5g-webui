#!/bin/bash

# Setup script for NR5G Native Addon
# This script helps set up the development environment for the C++ native addon

set -e

echo "🚀 NR5G Native Addon Setup"
echo "=========================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Node.js: $NODE_VERSION"

# Check for build tools
echo ""
echo "🔧 Checking build tools..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   Platform: macOS"
    if ! command -v xcode-select &> /dev/null; then
        echo "   ❌ Xcode Command Line Tools not found"
        echo "   Installing..."
        xcode-select --install
    else
        echo "   ✅ Xcode Command Line Tools installed"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   Platform: Linux"
    if ! command -v g++ &> /dev/null; then
        echo "   ❌ Build tools not found"
        echo "   Please run: sudo apt-get install build-essential python3"
        exit 1
    else
        echo "   ✅ Build tools installed"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "   Platform: Windows"
    echo "   Please ensure Visual Studio Build Tools are installed"
fi

# Install dependencies
echo ""
echo "📥 Installing npm dependencies..."
npm install

# Build native addon
echo ""
echo "🔨 Building native addon..."
npm run build:native

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  - Run 'npm run dev' to start development server"
echo "  - Run 'npm test' to run tests"
echo "  - See NATIVE_ADDON.md for detailed documentation"
echo ""
