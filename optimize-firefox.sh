#!/bin/bash

# AI Exporter - Script de Limpeza e Otimização para Firefox
# Remove arquivos desnecessários e otimiza para produção

echo "🦊 Otimizando AI Exporter para Firefox..."

# Diretório da extensão
EXTENSION_DIR="/mnt/hdd/cayo/Downloads/extensão-firefox/VersãoNova"
cd "$EXTENSION_DIR" || exit 1

echo "📁 Removendo arquivos desnecessários..."

# Remove arquivos de desenvolvimento
rm -f .gitignore 2>/dev/null
rm -f package.json 2>/dev/null
rm -f package-lock.json 2>/dev/null
rm -f webpack.config.js 2>/dev/null
rm -f tsconfig.json 2>/dev/null

# Remove diretórios de desenvolvimento
rm -rf node_modules 2>/dev/null
rm -rf src 2>/dev/null
rm -rf build 2>/dev/null

# Remove arquivos temporários
find . -name "*.tmp" -delete 2>/dev/null
find . -name "*.log" -delete 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null

# Remove arquivos de IDE
rm -rf .vscode 2>/dev/null
rm -rf .idea 2>/dev/null

# Otimiza permissões para Firefox
echo "🔧 Otimizando permissões..."
chmod 644 manifest.json
chmod 644 browser-polyfill.js
find dist -type f -name "*.js" -exec chmod 644 {} \;
find dist -type f -name "*.html" -exec chmod 644 {} \;
find dist -type f -name "*.css" -exec chmod 644 {} \;

# Verifica integridade dos arquivos essenciais
echo "✅ Verificando integridade..."

ESSENTIAL_FILES=(
    "manifest.json"
    "browser-polyfill.js"
    "dist/popup/index.html"
    "dist/popup/popup.js"
    "dist/background/firefox-background.js"
    "dist/contentScripts/ai-exporter-content.js"
    "dist/contentScripts/style.css"
    "dist/editor/index.html"
    "dist/editor/editor.js"
    "dist/sidebar/firefox-sidebar.html"
    "dist/sidebar/firefox-sidebar.js"
)

MISSING_FILES=0
for file in "${ESSENTIAL_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Arquivo essencial faltando: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [[ $MISSING_FILES -eq 0 ]]; then
    echo "✅ Todos os arquivos essenciais estão presentes"
else
    echo "⚠️  $MISSING_FILES arquivo(s) essencial(is) faltando"
fi

# Calcula estatísticas finais
TOTAL_SIZE=$(du -sh . | cut -f1)
JS_FILES=$(find . -name "*.js" | wc -l)
HTML_FILES=$(find . -name "*.html" | wc -l)
CSS_FILES=$(find . -name "*.css" | wc -l)

echo ""
echo "📊 Estatísticas da Extensão:"
echo "   📦 Tamanho total: $TOTAL_SIZE"
echo "   📄 Arquivos JS: $JS_FILES"
echo "   🌐 Arquivos HTML: $HTML_FILES"
echo "   🎨 Arquivos CSS: $CSS_FILES"

# Verifica se está pronto para produção
echo ""
echo "🦊 Status da Extensão Firefox:"
if [[ $MISSING_FILES -eq 0 ]]; then
    echo "   ✅ Pronto para instalação no Firefox"
    echo "   ✅ Otimizado para produção"
    echo "   ✅ Arquivos desnecessários removidos"
else
    echo "   ⚠️  Arquivos faltando - verificar antes da instalação"
fi

echo ""
echo "📋 Para instalar no Firefox:"
echo "   1. Abra Firefox"
echo "   2. Digite: about:debugging"
echo "   3. Clique em 'Este Firefox'"
echo "   4. Clique em 'Carregar extensão temporária'"
echo "   5. Selecione o arquivo manifest.json"

echo ""
echo "🎉 Otimização concluída!"
