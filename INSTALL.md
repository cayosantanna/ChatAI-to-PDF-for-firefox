# 🚀 AI Content Processor - Instalação Rápida

## 📋 Pré-requisitos
- Firefox 89+ (recomendado)
- Sistema Linux (testado e otimizado)

## ⚡ Instalação Rápida

### Método 1: Extensão Temporária (Desenvolvimento)
```bash
1. Abra o Firefox
2. Digite: about:debugging
3. Clique em "Este Firefox"
4. Clique em "Carregar extensão temporária"
5. Selecione o arquivo manifest.json
```

### Método 2: Build e Instalação Permanente
```bash
# Clone o repositório
git clone https://github.com/cayosantanna/ChatAI-to-PDF-for-firefox.git
cd ChatAI-to-PDF-for-firefox

# Execute o build
./build.sh

# Instale no Firefox:
# 1. Vá para about:addons
# 2. Clique na engrenagem (⚙️)
# 3. Selecione "Instalar add-on de arquivo"
# 4. Escolha o arquivo ai-content-processor-firefox.xpi
```

## ✅ Teste Rápido
```bash
# Execute os testes de validação
./test.sh
```

## 🎯 Como Usar

1. **Visite uma página de IA** (Claude, ChatGPT, Gemini, Grok, Notion)
2. **Clique no ícone** da extensão na barra de ferramentas
3. **Selecione o conteúdo** desejado
4. **Escolha o formato** de exportação (PDF, HTML, etc.)
5. **Baixe o arquivo** processado

## 🌟 Principais Funcionalidades

- ✅ **Captura Inteligente** - Detecta automaticamente conversas de IA
- ✅ **Editor Word-style** - Interface completa de edição
- ✅ **Processamento de Imagens** - Extração e compressão automática
- ✅ **Múltiplos Formatos** - PDF, HTML, Markdown, DOCX
- ✅ **Configurações Avançadas** - 200+ opções personalizáveis
- ✅ **Compatibilidade Total** - Todos os sites de IA + Notion

## 🛠️ Desenvolvimento

```bash
# Executar testes
./test.sh

# Build da extensão
./build.sh

# Estrutura do projeto
firefox-extension/
├── manifest.json     # Configuração WebExtensions
├── popup.html/css/js # Interface popup
├── editor.html/css/js # Editor Word-style
├── options.html/css/js # Configurações
├── content.js        # Script de conteúdo
├── background.js     # Script de background
└── icons/           # Ícones da extensão
```

## 📞 Suporte

- **GitHub Issues**: Para bugs e feature requests
- **Documentação**: Ver README.md completo
- **Testes**: Execute ./test.sh para validação

---

**Desenvolvido especificamente para Firefox/Linux** 🐧🔥
