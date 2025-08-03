# Changelog - AI Content Processor Firefox Extension

## [1.0.1] - 2025-08-03 (Correção de Bugs)

### 🐛 Corrigido
- **Erro "Erro ao capturar conteúdo"**: Corrigida comunicação entre popup e content script
- **Message listeners**: Content script agora aceita tanto 'exportToPDF' quanto 'quickCapture'
- **Background script**: Atualizado para funcionar corretamente com popup
- **Tratamento de erros**: Mensagens de erro mais específicas e informativas

### ✅ Melhorias
- Adicionados logs de debug para troubleshooting
- Melhor detecção de plataformas de IA
- Fallback para quando content script não está carregado
- Mensagens de erro mais user-friendly

### 🔧 Funcionalidades Funcionando
- ✅ Botão de captura rápida
- ✅ Detecção automática de sites de IA
- ✅ Exportação para PDF nativa
- ✅ Interface de seleção avançada
- ✅ Configurações avançadas

---

## [1.0.0] - 2025-08-03 (Lançamento Inicial)

### 🎉 Funcionalidades Principais
- **Interface popup profissional** com 4 abas organizadas
- **Editor estilo Microsoft Word** completo
- **Página de configurações avançada** (6 seções, 200+ opções)
- **Captura inteligente** de conversas de IA
- **Processamento de imagens** com conversão base64
- **Múltiplos formatos** de exportação (PDF, HTML, Markdown, DOCX)

### 🌐 Compatibilidade
- ✅ Claude.ai (incluindo artifacts)
- ✅ ChatGPT.com (incluindo canvas)
- ✅ Google Gemini
- ✅ Grok (X.com)
- ✅ Notion.so (páginas e comentários)
- ✅ Sites genéricos (modo universal)

### 🛠️ Arquitetura
- **2.490+ linhas** de JavaScript
- **1.926+ linhas** de CSS
- **1.055+ linhas** de HTML
- **WebExtensions API** nativa do Firefox
- **Otimizada para Linux**

### 📦 Build & Deploy
- Script de build automatizado (`build.sh`)
- Script de testes (`test.sh`)
- Arquivo XPI pronto para instalação
- Documentação completa

---

## Roadmap Futuro

### 🚀 Próximas Versões
- [ ] Integração com APIs de IA para resumos automáticos
- [ ] Templates personalizáveis
- [ ] Sincronização em nuvem
- [ ] Modo colaborativo
- [ ] Exportação para mais formatos (EPUB, LaTeX)
- [ ] Plugin para editores de texto

### 🔧 Melhorias Planejadas
- [ ] Performance otimizada para páginas grandes
- [ ] Interface redesenhada com Material Design
- [ ] Suporte a mais plataformas de IA
- [ ] Modo offline completo
- [ ] Criptografia de documentos

---

## Instalação e Uso

### 📥 Instalação Rápida
```bash
git clone https://github.com/cayosantanna/ChatAI-to-PDF-for-firefox.git
cd ChatAI-to-PDF-for-firefox
./build.sh
# Instalar XPI no Firefox
```

### 🎯 Como Usar
1. Visite uma página de IA (Claude, ChatGPT, etc.)
2. Clique no ícone da extensão
3. Selecione o modo de captura
4. Escolha o formato de exportação
5. Baixe o arquivo processado

### 🛠️ Desenvolvimento
```bash
./test.sh    # Executar testes
./build.sh   # Gerar pacote XPI
```
