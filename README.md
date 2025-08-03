# AI Content Processor - Extensão Firefox

Uma extensão poderosa para o Firefox que transforma conversas de IA e conteúdo web em documentos PDF profissionais, com interface estilo Word e funcionalidades avançadas de processamento.

## 🌟 Principais Funcionalidades

### 📑 Captura Inteligente de Conteúdo
- **Detecção Automática**: Reconhece automaticamente conversas de IA (Claude, ChatGPT, Gemini, Grok)
- **Seleção Visual**: Interface intuitiva para escolher exatamente o que incluir
- **Captura de Área**: Selecione regiões específicas da página
- **Compatibilidade Universal**: Funciona em qualquer site, incluindo Notion

### 🖼️ Processamento de Imagens
- **Extração Automática**: Captura todas as imagens do conteúdo selecionado
- **Conversão para Base64**: Embute imagens diretamente no PDF
- **Otimização**: Compressão inteligente para reduzir tamanho do arquivo
- **Múltiplos Formatos**: Suporte para PNG, JPG, SVG, WebP

### ✏️ Editor Estilo Word
- **Interface Profissional**: Editor WYSIWYG completo
- **Barra de Ferramentas**: Formatação rica (negrito, itálico, listas, etc.)
- **Navegação por Seções**: Sidebar com estrutura do documento
- **Edição em Tempo Real**: Modifique o conteúdo sem perder formatação

### 🧹 Limpeza Automática
- **Remoção de Elementos Indesejados**: Anúncios, navegação, rodapés
- **Normalização de Texto**: Corrige espaçamentos e codificação
- **Formatação Consistente**: Padroniza estilos e hierarquia

### � Exportação Avançada
- **PDF Profissional**: Geração com metadados e marcadores
- **Múltiplos Formatos**: PDF, HTML, Markdown, DOCX
- **Templates**: Modelos pré-definidos para diferentes tipos de conteúdo
- **Nomenclatura Inteligente**: Nomes de arquivo automáticos baseados no conteúdo

## 🚀 Instalação

### Método 1: Instalação Manual (Recomendado)

1. **Clone ou baixe** este repositório
2. **Abra o Firefox** e digite `about:debugging` na barra de endereços
3. **Clique em "Este Firefox"** no menu lateral
4. **Clique em "Carregar extensão temporária"**
5. **Navegue até a pasta** `firefox-extension` e selecione o arquivo `manifest.json`

### Método 2: Arquivo XPI (Para desenvolvimento)

```bash
# Gerar pacote XPI
cd firefox-extension
zip -r ai-content-processor.xpi . -x "*.git*" "node_modules/*" "*.log"
```

## 🎯 Como Usar

### Captura Rápida
1. **Navegue** até uma conversa de IA ou página web
2. **Clique no ícone** da extensão na barra de ferramentas
3. **Escolha o modo** de captura (Inteligente, Visual, Área)
4. **Selecione o conteúdo** desejado
5. **Clique em "Processar"** para abrir o editor

### Editor Avançado
1. **Edite o conteúdo** usando as ferramentas da barra superior
2. **Organize seções** através da navegação lateral
3. **Adicione ou remova** elementos conforme necessário
4. **Visualize em tempo real** as mudanças

### Exportação
1. **Clique em "Exportar"** na barra de ferramentas
2. **Escolha o formato** desejado (PDF, HTML, etc.)
3. **Configure opções** como tamanho de página e margens
4. **Baixe o arquivo** processado

### ✏️ Editor Estilo Microsoft Word
- ✅ Interface completa de formatação de texto
- ✅ Toolbar com todas as opções (negrito, itálico, cores, etc.)
- ✅ Inserção de imagens, tabelas e links
- ✅ Sistema de outline/estrutura do documento
- ✅ Contadores de palavras e caracteres
- ✅ Zoom e controles de visualização

### 📄 Exportação Avançada
- ✅ **Exportar PDF** - Com formatação avançada e imagens
- ✅ **Exportar Word** - Formato .doc compatível
- ✅ **Múltiplas margens** - Estreita, normal, larga
- ✅ **Metadados opcionais** - Título, data, contagem
- ✅ **Auto-save** - Salvamento automático a cada 30s

## 🔧 Como Instalar

### 1. Instalação Manual (Temporária)
```bash
1. Abra o Firefox
2. Digite: about:debugging#/runtime/this-firefox
3. Clique em "Carregar extensão temporária..."
4. Selecione o arquivo manifest.json
```

### 2. Para Desenvolvimento
```bash
git clone [repositório]
cd firefox-extension/
# Siga os passos de instalação manual
```

## 🎮 Como Usar

### Passo 1: Seleção de Conteúdo
1. **Navegue** para uma das plataformas suportadas
2. **Clique** no ícone da extensão na barra de ferramentas
3. **Selecione** os elementos que deseja incluir no PDF
4. **Configure** opções de imagens e limpeza

### Passo 2: Escolha o Método
- **Abrir Editor**: Abre interface completa de edição
- **Exportar Direto**: Gera PDF imediatamente

### Passo 3: Edição (se escolheu o editor)
1. **Edite** o conteúdo usando ferramentas estilo Word
2. **Formate** texto, adicione imagens, crie tabelas
3. **Organize** estrutura usando o outline lateral
4. **Exporte** para PDF ou Word quando finalizar

## 🛠️ Funcionalidades do Editor

### Formatação de Texto
- **Fontes**: Arial, Times New Roman, Helvetica, Georgia, Verdana
- **Tamanhos**: 12pt a 24pt
- **Estilos**: Negrito, itálico, sublinhado, riscado
- **Alinhamento**: Esquerda, centro, direita, justificado
- **Cores**: Texto e fundo personalizáveis

### Inserção de Elementos
- **Imagens**: Upload ou seleção das extraídas
- **Tabelas**: Configuráveis (linhas x colunas)
- **Links**: Com texto e URL customizáveis
- **Listas**: Numeradas e com marcadores

### Controles Avançados
- **Undo/Redo**: Desfazer e refazer ações
- **Zoom**: 50% a 200%
- **Auto-save**: Salvamento automático
- **Contadores**: Palavras e caracteres em tempo real

## 📁 Estrutura de Arquivos

```
firefox-extension/
├── manifest.json           # Configuração da extensão
├── background.js           # Gerencia cliques no ícone
├── content.js             # Script principal (seleção inteligente)
├── editor.html            # Interface do editor
├── editor.css             # Estilos do editor
├── editor.js              # Funcionalidade do editor
├── icons/                 # Ícones da extensão
│   ├── icon_16.png
│   ├── icon_32.png
│   ├── icon_48.png
│   └── icon_128.png
├── libs/                  # Bibliotecas auxiliares
└── README.md              # Esta documentação
```

## 🔐 Permissões Necessárias

- **activeTab**: Acesso à aba atual
- **storage**: Salvamento de documentos
- **notifications**: Avisos ao usuário
- **Domínios específicos**: Claude.ai, ChatGPT.com, Grok.com, Gemini.google.com, Notion.so

## 🎨 Temas e Personalização

### Configurações Disponíveis
- ✅ **Auto-save**: Ativação/desativação
- ✅ **Metadados**: Inclusão no PDF
- ✅ **Margens**: Estreita, normal, larga
- ✅ **Zoom**: Controle de visualização

## 🚀 Recursos Avançados

### Detecção Inteligente por Plataforma
- **Claude.ai**: Mensagens individuais + artifacts
- **ChatGPT.com**: Artigos + canvas (CSP seguro)
- **Grok.com**: Mensagens + thoughts
- **Gemini.google.com**: Histórico + painéis estendidos (CSP seguro)
- **Notion.so**: Blocos de conteúdo + página principal

### Exportação Otimizada
- **Sites com CSP restrito**: Usa impressão nativa automaticamente
- **Sites compatíveis**: html2pdf.js para máxima qualidade
- **Imagens**: Conversão automática para base64
- **Formatação**: Preservação de estilos originais

## 📚 Casos de Uso

1. **Documentação de Pesquisa**: Salvar conversas importantes com IAs
2. **Relatórios**: Combinar múltiplas conversas em um documento
3. **Apresentações**: Extrair e formatar conteúdo para apresentações  
4. **Arquivo**: Manter histórico organizado de interações
5. **Compartilhamento**: Enviar conversas formatadas para colegas

## 🔄 Changelog

### v2.0 - Versão Avançada
- ✅ Editor completo estilo Microsoft Word
- ✅ Seleção granular de elementos
- ✅ Extração automática de imagens
- ✅ Suporte ao Notion.so
- ✅ Limpeza avançada de conteúdo
- ✅ Exportação para Word
- ✅ Interface de usuário aprimorada

### v1.0 - Versão Básica
- ✅ Exportação básica para PDF
- ✅ Suporte a Claude, ChatGPT, Grok, Gemini
- ✅ Duas opções de exportação
- ✅ Compatibilidade com CSP

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça fork do repositório
2. Crie uma branch para sua feature
3. Implemente e teste suas mudanças  
4. Faça pull request com descrição detalhada

## 📄 Licença

Baseado no bookmarklet v0.8 do github.com/give-me/bookmarklets
Extensão desenvolvida para uso educacional e pessoal.
