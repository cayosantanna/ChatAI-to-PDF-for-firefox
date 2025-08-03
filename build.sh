#!/bin/bash

# Script para construir a extensão Firefox
# Gera um arquivo XPI pronto para instalação

set -e

EXTENSION_DIR="$(pwd)"
BUILD_DIR="$EXTENSION_DIR/build"
XPI_NAME="ai-content-processor-firefox.xpi"
VERSION=$(grep '"version"' "$EXTENSION_DIR/manifest.json" | sed 's/.*"version": "\([^"]*\)".*/\1/')

echo "🔧 Construindo AI Content Processor v$VERSION para Firefox"

# Limpar diretório de build anterior
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"

echo "📁 Preparando arquivos..."

# Lista de arquivos/diretórios a incluir
FILES_TO_INCLUDE=(
    "manifest.json"
    "popup.html"
    "popup.css" 
    "popup.js"
    "options.html"
    "options.css"
    "options.js"
    "content.js"
    "background.js"
    "editor.html"
    "editor.css"
    "editor.js"
    "icons/"
    "libs/"
    "LICENSE"
)

# Copiar arquivos para build
for item in "${FILES_TO_INCLUDE[@]}"; do
    if [ -e "$item" ]; then
        if [ -d "$item" ]; then
            cp -r "$item" "$BUILD_DIR/"
            echo "  ✓ Copiado diretório: $item"
        else
            cp "$item" "$BUILD_DIR/"
            echo "  ✓ Copiado arquivo: $item"
        fi
    else
        echo "  ⚠️  Arquivo não encontrado: $item"
    fi
done

# Criar diretório libs se não existir
if [ ! -d "$BUILD_DIR/libs" ]; then
    mkdir -p "$BUILD_DIR/libs"
fi

echo "📦 Baixando dependências externas..."

# Baixar html2pdf.js se não existir
if [ ! -f "$BUILD_DIR/libs/html2pdf.bundle.min.js" ]; then
    echo "  📥 Baixando html2pdf.js..."
    curl -s -L "https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js" \
        -o "$BUILD_DIR/libs/html2pdf.bundle.min.js" || echo "  ⚠️  Falha ao baixar html2pdf.js"
fi

# Baixar Font Awesome CSS se não existir
if [ ! -f "$BUILD_DIR/libs/fontawesome.min.css" ]; then
    echo "  📥 Baixando Font Awesome..."
    curl -s -L "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" \
        -o "$BUILD_DIR/libs/fontawesome.min.css" || echo "  ⚠️  Falha ao baixar Font Awesome"
fi

echo "🗜️  Criando arquivo XPI..."

# Criar arquivo XPI
cd "$BUILD_DIR"
zip -r "../$XPI_NAME" . -x "*.git*" "node_modules/*" "*.log" "*.tmp" "*.DS_Store"

if [ $? -eq 0 ]; then
    echo "✅ Extensão construída com sucesso!"
    echo "📁 Arquivo criado: $EXTENSION_DIR/$XPI_NAME"
    echo "📊 Tamanho: $(du -h "$EXTENSION_DIR/$XPI_NAME" | cut -f1)"
else
    echo "❌ Erro ao criar arquivo XPI"
    exit 1
fi

echo "🎉 Construção concluída!"
