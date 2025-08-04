# Instalação da Extensão AI Content Processor

## Instalação Temporária (Desenvolvimento)

1. Abra o Firefox
2. Digite `about:debugging` na barra de endereços
3. Clique em "Este Firefox" 
4. Clique em "Carregar extensão temporária..."
5. Navegue até a pasta `build/` e selecione o arquivo `manifest.json`

## Instalação via XPI

1. Abra o Firefox
2. Digite `about:debugging` na barra de endereços  
3. Clique em "Este Firefox"
4. Clique em "Carregar extensão temporária..."
5. Selecione o arquivo `ai-content-processor-firefox.xpi`

## Funcionalidades

- ✅ Captura rápida de conteúdo
- ✅ Interface de seleção avançada  
- ✅ Exportação para PDF nativo
- ✅ Suporte a múltiplas plataformas de IA
- ✅ Editor integrado
- ✅ Histórico de capturas
- ✅ Configurações personalizáveis

## Como Usar

### Captura Rápida
1. Clique no ícone da extensão
2. Selecione o modo de captura (Inteligente, Visual, Área, ou Página)
3. Clique em "Captura Rápida"

### Captura Avançada
1. Clique em "Captura Avançada"
2. Selecione elementos específicos na página
3. Clique em "Exportar Selecionados"

### Exportação
- PDF: Geração nativa pelo navegador
- Word: Conversão para formato DOCX
- HTML: Download como página web
- Markdown: Texto estruturado

## Problemas Conhecidos

- A extensão precisa ser recarregada após mudanças no código
- Algumas páginas podem exigir recarga para carregar o content script
- A captura pode falhar em páginas com CSP muito restritivo

## Desenvolvimento

Para modificar a extensão:

1. Edite os arquivos na pasta raiz
2. Execute `./build-complete.sh` para recompilar
3. Recarregue a extensão em `about:debugging`

## Estrutura do Projeto

```
ai-content-processor/
├── manifest.json        # Configuração da extensão
├── background.js        # Script de background
├── content.js          # Script de conteúdo
├── popup.html/css/js   # Interface do popup
├── options.html/css/js # Página de configurações
├── editor.html/css/js  # Editor integrado
├── ai-service.js       # Serviços de IA
└── icons/              # Ícones da extensão
```
