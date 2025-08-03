#!/bin/bash

# AI Exporter - Script de Teste Rápido Firefox
echo "🦊 Testando AI Exporter no Firefox..."

# Verificar se o Firefox está instalado
if ! command -v firefox &> /dev/null; then
    echo "❌ Firefox não encontrado. Instale o Firefox primeiro."
    exit 1
fi

# Verificar arquivos essenciais
echo "📋 Verificando arquivos essenciais..."

ESSENTIAL_FILES=(
    "manifest.json"
    "browser-polyfill.js"
    "dist/popup/index.html"
    "dist/popup/popup.js"
    "dist/background/firefox-background.js"
    "dist/contentScripts/ai-exporter-content.js"
    "dist/contentScripts/style.css"
)

MISSING=0
for file in "${ESSENTIAL_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Arquivo faltando: $file"
        MISSING=$((MISSING + 1))
    else
        echo "✅ $file"
    fi
done

if [[ $MISSING -gt 0 ]]; then
    echo "⚠️  $MISSING arquivo(s) essencial(is) faltando!"
    exit 1
fi

# Validar manifest.json
echo ""
echo "🔍 Validando manifest.json..."
if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))" 2>/dev/null; then
    echo "✅ Manifest.json válido"
else
    echo "❌ Manifest.json inválido"
    exit 1
fi

# Verificar versão
VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).version)")
echo "📦 Versão: $VERSION"

# Calcular tamanho
SIZE=$(du -sh . | cut -f1)
echo "💾 Tamanho: $SIZE"

# Contar sites suportados
SITES=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).host_permissions.length)")
echo "🌐 Sites suportados: $SITES"

echo ""
echo "🎉 Extensão pronta para teste!"
echo ""
echo "📋 Para testar no Firefox:"
echo "   1. Abra Firefox"
echo "   2. Vá para about:debugging"
echo "   3. Clique em 'Este Firefox'"
echo "   4. Clique em 'Carregar extensão temporária'"
echo "   5. Selecione manifest.json"
echo ""
echo "🔗 Sites para testar:"
echo "   • https://chatgpt.com"
echo "   • https://claude.ai"
echo "   • https://gemini.google.com"
echo "   • https://poe.com"
echo ""

# Opcional: abrir Firefox automaticamente
read -p "🦊 Deseja abrir Firefox automaticamente? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Abrindo Firefox..."
    firefox --new-tab "about:debugging" &
    sleep 2
    firefox --new-tab "https://chatgpt.com" &
fi
