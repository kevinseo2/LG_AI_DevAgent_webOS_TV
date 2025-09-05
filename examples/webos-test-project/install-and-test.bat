@echo off
echo ========================================
echo webOS TV API Assistant Test Setup
echo ========================================

echo.
echo 🚀 Setting up test environment...
echo.

REM Change to extension directory
cd /d "%~dp0..\..\vscode-extension"

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building extension...
call npm run compile

echo 📋 Linting code...
call npm run lint

echo 📦 Packaging extension...
call npm run package

echo.
echo ✅ Extension built successfully!
echo.

REM Copy the VSIX file to examples directory for easy access
copy "webos-tv-api-assistant-1.0.0.vsix" "..\examples\webos-test-project\"

echo 📁 Extension package copied to test directory
echo.

echo 🔧 Installing extension in VS Code...
echo.

REM Uninstall existing extension first
code --uninstall-extension webos-tv-developer.webos-tv-api-assistant

REM Install new extension
code --install-extension "%~dp0webos-tv-api-assistant-1.0.0.vsix"

echo.
echo 🎯 Opening test project...
code "%~dp0"

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
echo.
echo 📋 Next steps:
echo 1. VS Code should open with the test project
echo 2. Open TEST-GUIDE.md for detailed instructions
echo 3. Start testing with test-all-improvements.js
echo.
echo 🧪 Test files available:
echo - test-all-improvements.js      (comprehensive test)
echo - test-uri-normalization.js     (URI normalization)
echo - test-smart-completion.js      (smart completion)
echo - test-fallback-system.js       (fallback system)
echo - test-real-world-scenarios.js  (real scenarios)
echo.
echo 📖 Read TEST-GUIDE.md for detailed testing instructions
echo.
pause
