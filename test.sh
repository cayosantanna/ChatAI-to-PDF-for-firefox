#!/bin/bash

# Script de teste rápido para validar a extensão

EXTENSION_DIR="$(pwd)"

echo "🧪 Executando testes de validação da extensão..."

cd "$EXTENSION_DIR"

# Teste 1: Validar manifest.json
echo "📋 Testando manifest.json..."
if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))" 2>/dev/null; then
    echo "  ✅ manifest.json é válido"
else
    echo "  ❌ manifest.json tem erros de sintaxe"
fi

# Teste 2: Verificar arquivos obrigatórios
echo "📁 Verificando arquivos obrigatórios..."
required_files=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content.js"
    "background.js"
    "options.html"
    "editor.html"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file encontrado"
    else
        echo "  ❌ $file não encontrado"
    fi
done

# Teste 3: Verificar ícones
echo "🎨 Verificando ícones..."
icon_sizes=(16 32 48 128)
for size in "${icon_sizes[@]}"; do
    if [ -f "icons/icon-$size.png" ] || [ -f "icons/icon_$size.png" ]; then
        echo "  ✅ Ícone ${size}x${size} encontrado"
    else
        echo "  ⚠️  Ícone ${size}x${size} não encontrado"
    fi
done

# Teste 4: Verificar sintaxe dos arquivos HTML
echo "🌐 Verificando sintaxe HTML..."
html_files=("popup.html" "options.html" "editor.html")
for file in "${html_files[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "<!DOCTYPE html>" "$file" && grep -q "</html>" "$file"; then
            echo "  ✅ $file parece ser um HTML válido"
        else
            echo "  ⚠️  $file pode ter problemas de estrutura"
        fi
    fi
done

# Teste 5: Verificar tamanho dos arquivos
echo "📊 Verificando tamanhos dos arquivos..."
total_size=$(du -sh . | cut -f1)
echo "  📁 Tamanho total da extensão: $total_size"

# Teste 6: Contar linhas de código
echo "📝 Estatísticas de código..."
js_lines=$(find . -name "*.js" -not -path "./libs/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
css_lines=$(find . -name "*.css" -not -path "./libs/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
html_lines=$(find . -name "*.html" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")

echo "  📄 Linhas JavaScript: ${js_lines}"
echo "  🎨 Linhas CSS: ${css_lines}"
echo "  🌐 Linhas HTML: ${html_lines}"

echo ""
echo "🎉 Testes concluídos!"
echo ""
echo "💡 Para testar a extensão:"
echo "   1. Execute ./build.sh para gerar o pacote"
echo "   2. Abra Firefox e vá para about:debugging"
echo "   3. Carregue a extensão temporária"
echo "   4. Visite uma página de IA e teste a funcionalidade"
