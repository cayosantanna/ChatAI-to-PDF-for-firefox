// AI Exporter Editor - Enhanced Content Editor with WYSIWYG-like features
class AIExporterEditor {
  constructor() {
    this.content = '';
    this.metadata = {};
    this.currentFormat = 'markdown';
    this.previewVisible = false;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
    this.autoSaveInterval = null;
    this.isModified = false;

    this.init();
  }

  async init() {
    console.log('🦊 AI Exporter Editor iniciado no Firefox');
    
    // Otimização para Firefox - carregamento progressivo
    requestIdleCallback(() => {
      this.loadContent();
      this.setupEventListeners();
      this.setupAutoSave();
    });
    
    requestIdleCallback(() => {
      this.setupFormatting();
      this.updateUI();
      this.startWordCount();
    });
  }

  async loadContent() {
    try {
      const result = await browser.storage.local.get(['tempEditorData']);
      
      if (result.tempEditorData) {
        this.content = result.tempEditorData.content || '';
        this.metadata = result.tempEditorData.metadata || {};
        
        // Limpar dados temporários após carregar
        await browser.storage.local.remove(['tempEditorData']);
        
        // Colocar conteúdo no editor
        const textarea = document.getElementById('editorTextarea');
        textarea.value = this.content;
        
        this.updateDocumentInfo();
        this.addToUndoStack();
      } else {
        // Carregar exemplo se não há conteúdo
        this.loadExampleContent();
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      this.loadExampleContent();
    }
  }

  loadExampleContent() {
    const exampleContent = `# Conversa com IA Exportada

**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Site:** ${this.metadata.siteName || 'Site de IA'}

## Resumo da Conversa

Esta é uma conversa exportada de um assistente de IA. Você pode editar este conteúdo antes de salvar.

### Principais Tópicos:
- Tópico 1
- Tópico 2  
- Tópico 3

## Conversa

**Usuário:** Olá! Como posso exportar conversas de IA?

**Assistente:** Para exportar conversas de IA, você pode usar o AI Exporter! É muito simples:

1. Clique no ícone da extensão
2. Escolha o formato desejado
3. Para editar antes de salvar, use a opção "Exportar com Editor"

### Código de Exemplo

\`\`\`javascript
// Exemplo de uso da extensão
browser.runtime.sendMessage({
  action: 'exportContent',
  format: 'pdf'
});
\`\`\`

> **Dica:** Use Ctrl+Shift+E para exportação rápida!

---

*Documento gerado pelo AI Exporter v2.0.0 🦊*`;

    const textarea = document.getElementById('editorTextarea');
    textarea.value = exampleContent;
    this.content = exampleContent;
    this.addToUndoStack();
  }

  setupEventListeners() {
    const textarea = document.getElementById('editorTextarea');
    const togglePreviewBtn = document.getElementById('togglePreview');
    const saveAsBtn = document.getElementById('saveAsFormat');
    const downloadBtn = document.getElementById('saveAndDownload');

    // Editor events
    textarea.addEventListener('input', (e) => this.handleContentChange(e));
    textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
    textarea.addEventListener('scroll', () => this.syncScroll());

    // Toolbar events
    togglePreviewBtn.addEventListener('click', () => this.togglePreview());
    saveAsBtn.addEventListener('click', () => this.showSaveDialog());
    downloadBtn.addEventListener('click', () => this.downloadCurrent());

    // Format selection
    document.querySelectorAll('.format-option').forEach(option => {
      option.addEventListener('click', (e) => this.selectFormat(e));
    });

    // Formatting toolbar
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.applyFormatting(e));
    });

    // Undo/Redo
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());

    // Options checkboxes
    document.getElementById('includeTimestamp').addEventListener('change', () => this.updateOptions());
    document.getElementById('preserveFormatting').addEventListener('change', () => this.updateOptions());
    document.getElementById('includeMetadata').addEventListener('change', () => this.updateOptions());

    // Prevent accidental close
    window.addEventListener('beforeunload', (e) => {
      if (this.isModified) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    });
  }

  handleContentChange(e) {
    this.content = e.target.value;
    this.isModified = true;
    
    this.updateWordCount();
    this.updatePreview();
    this.updateLastModified();
    
    // Debounced undo stack update
    clearTimeout(this.undoTimeout);
    this.undoTimeout = setTimeout(() => {
      this.addToUndoStack();
    }, 1000);
  }

  handleKeyDown(e) {
    // Ctrl+Z - Undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      return;
    }
    
    // Ctrl+Shift+Z or Ctrl+Y - Redo
    if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      this.redo();
      return;
    }

    // Ctrl+S - Save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      this.downloadCurrent();
      return;
    }

    // Tab key - Insert tab
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertText('  '); // 2 spaces
      return;
    }

    // Auto-formatting
    this.handleAutoFormatting(e);
  }

  handleAutoFormatting(e) {
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const currentLine = textBefore.split('\n').pop();

    // Auto list continuation
    if (e.key === 'Enter') {
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const marker = listMatch[2];
        
        if (currentLine.trim() === marker) {
          // Empty list item, remove it
          this.replaceCurrentLine('');
        } else {
          // Continue list
          const nextMarker = marker.match(/\d+/) ? 
            (parseInt(marker) + 1) + '.' : marker;
          this.insertText('\n' + indent + nextMarker + ' ');
        }
      }
    }
  }

  applyFormatting(e) {
    const action = e.target.closest('.format-btn').dataset.action;
    const textarea = document.getElementById('editorTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (action) {
      case 'bold':
        replacement = `**${selectedText}**`;
        cursorOffset = selectedText ? 0 : -2;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        cursorOffset = selectedText ? 0 : -1;
        break;
      case 'heading':
        replacement = `## ${selectedText}`;
        cursorOffset = selectedText ? 0 : 0;
        break;
      case 'link':
        replacement = `[${selectedText || 'texto do link'}](url)`;
        cursorOffset = selectedText ? -5 : -4;
        break;
      case 'code':
        replacement = selectedText.includes('\n') ? 
          `\`\`\`\n${selectedText}\n\`\`\`` : 
          `\`${selectedText}\``;
        cursorOffset = selectedText ? 0 : (selectedText.includes('\n') ? -4 : -1);
        break;
      case 'quote':
        replacement = `> ${selectedText}`;
        cursorOffset = selectedText ? 0 : 0;
        break;
      case 'list':
        replacement = `- ${selectedText}`;
        cursorOffset = selectedText ? 0 : 0;
        break;
    }

    this.replaceSelection(replacement, cursorOffset);
  }

  replaceSelection(replacement, cursorOffset = 0) {
    const textarea = document.getElementById('editorTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    textarea.value = textarea.value.substring(0, start) + 
                    replacement + 
                    textarea.value.substring(end);
    
    const newCursorPos = start + replacement.length + cursorOffset;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
    
    this.handleContentChange({ target: textarea });
  }

  insertText(text) {
    const textarea = document.getElementById('editorTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    textarea.value = textarea.value.substring(0, start) + 
                    text + 
                    textarea.value.substring(end);
    
    const newCursorPos = start + text.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
    
    this.handleContentChange({ target: textarea });
  }

  replaceCurrentLine(newText) {
    const textarea = document.getElementById('editorTextarea');
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = text.indexOf('\n', cursorPos);
    const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
    
    textarea.value = text.substring(0, lineStart) + 
                    newText + 
                    text.substring(actualLineEnd);
    
    const newCursorPos = lineStart + newText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
    
    this.handleContentChange({ target: textarea });
  }

  togglePreview() {
    this.previewVisible = !this.previewVisible;
    const previewPane = document.getElementById('previewPane');
    const toggleBtn = document.getElementById('togglePreview');
    
    if (this.previewVisible) {
      previewPane.classList.add('active');
      toggleBtn.textContent = '✏️ Editor';
      this.updatePreview();
    } else {
      previewPane.classList.remove('active');
      toggleBtn.textContent = '👁️ Preview';
    }
  }

  updatePreview() {
    if (!this.previewVisible) return;
    
    const previewContent = document.getElementById('previewContent');
    const markdown = this.content;
    
    // Simple markdown to HTML converter
    let html = this.markdownToHtml(markdown);
    previewContent.innerHTML = html;
  }

  markdownToHtml(markdown) {
    return markdown
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      
      // Lists
      .replace(/^\s*[-*+]\s+(.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1')
      .replace(/<p>(<pre>)/g, '$1')
      .replace(/(<\/pre>)<\/p>/g, '$1')
      .replace(/<p>(<blockquote>)/g, '$1')
      .replace(/(<\/blockquote>)<\/p>/g, '$1');
  }

  selectFormat(e) {
    const formatOption = e.target.closest('.format-option');
    const format = formatOption.dataset.format;
    
    // Update UI
    document.querySelectorAll('.format-option').forEach(opt => {
      opt.classList.remove('active');
    });
    formatOption.classList.add('active');
    
    // Update radio button
    const radio = formatOption.querySelector('input[type="radio"]');
    radio.checked = true;
    
    this.currentFormat = format;
    this.updateFilename();
  }

  updateFilename() {
    const filename = document.getElementById('filename');
    const extensions = {
      markdown: '.md',
      pdf: '.pdf',
      txt: '.txt',
      html: '.html'
    };
    
    const baseName = this.metadata.title || 'documento';
    const cleanName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    filename.textContent = cleanName + extensions[this.currentFormat];
  }

  updateWordCount() {
    const text = this.content;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text.split('\n').length;
    
    document.getElementById('wordCount').textContent = words;
    document.getElementById('charCount').textContent = chars;
    document.getElementById('lineCount').textContent = lines;
  }

  updateLastModified() {
    const now = new Date().toLocaleTimeString('pt-BR');
    document.getElementById('lastModified').textContent = `Modificado às ${now}`;
  }

  updateDocumentInfo() {
    const info = document.getElementById('documentInfo');
    const siteName = this.metadata.siteName || 'Site desconhecido';
    const url = this.metadata.url || 'URL não disponível';
    const timestamp = this.metadata.timestamp ? 
      new Date(this.metadata.timestamp).toLocaleString('pt-BR') : 
      'Timestamp não disponível';
    
    info.innerHTML = `
      <p><strong>Site:</strong> ${siteName}</p>
      <p><strong>Capturado:</strong> ${timestamp}</p>
      <p><strong>URL:</strong> <small>${url}</small></p>
    `;
  }

  addToUndoStack() {
    this.undoStack.push(this.content);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      const prevContent = this.undoStack[this.undoStack.length - 1];
      
      const textarea = document.getElementById('editorTextarea');
      textarea.value = prevContent;
      this.content = prevContent;
      this.updateWordCount();
      this.updatePreview();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const nextContent = this.redoStack.pop();
      this.undoStack.push(nextContent);
      
      const textarea = document.getElementById('editorTextarea');
      textarea.value = nextContent;
      this.content = nextContent;
      this.updateWordCount();
      this.updatePreview();
    }
  }

  showSaveDialog() {
    const formats = [
      { value: 'markdown', label: '📝 Markdown (.md)' },
      { value: 'pdf', label: '📄 PDF (.pdf)' },
      { value: 'txt', label: '📋 Texto (.txt)' },
      { value: 'html', label: '🌐 HTML (.html)' }
    ];
    
    let options = formats.map(fmt => 
      `<option value="${fmt.value}" ${fmt.value === this.currentFormat ? 'selected' : ''}>${fmt.label}</option>`
    ).join('');
    
    const dialog = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
          <h3>💾 Salvar Como</h3>
          <p>Escolha o formato para download:</p>
          
          <select id="formatSelect" style="width: 100%; padding: 10px; margin: 15px 0; border: 1px solid #ddd; border-radius: 6px;">
            ${options}
          </select>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button id="cancelSave" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancelar</button>
            <button id="confirmSave" style="padding: 10px 20px; border: none; background: #667eea; color: white; border-radius: 6px; cursor: pointer;">Baixar</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialog);
    
    document.getElementById('cancelSave').addEventListener('click', () => {
      document.body.removeChild(document.body.lastElementChild);
    });
    
    document.getElementById('confirmSave').addEventListener('click', () => {
      const selectedFormat = document.getElementById('formatSelect').value;
      this.currentFormat = selectedFormat;
      this.downloadCurrent();
      document.body.removeChild(document.body.lastElementChild);
    });
  }

  async downloadCurrent() {
    this.showLoading(true, 'Preparando download...');
    
    try {
      const options = this.getExportOptions();
      const processed = await this.processContent(this.content, options);
      await this.triggerDownload(processed, this.currentFormat);
      
      this.isModified = false;
      this.showStatus('Download concluído!', 'success');
    } catch (error) {
      console.error('Erro no download:', error);
      this.showStatus('Erro no download: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  getExportOptions() {
    return {
      includeTimestamp: document.getElementById('includeTimestamp').checked,
      preserveFormatting: document.getElementById('preserveFormatting').checked,
      includeMetadata: document.getElementById('includeMetadata').checked
    };
  }

  async processContent(content, options) {
    let processed = content;
    
    if (options.includeTimestamp) {
      const timestamp = `\n\n---\n*Exportado em ${new Date().toLocaleString('pt-BR')} pelo AI Exporter 🦊*\n`;
      processed += timestamp;
    }
    
    if (options.includeMetadata && this.metadata.url) {
      const metadata = `\n\n**Fonte:** ${this.metadata.url}\n`;
      processed += metadata;
    }
    
    return processed;
  }

  async triggerDownload(content, format) {
    const filename = this.generateFilename();
    
    let blob;
    let mimeType;
    
    switch (format) {
      case 'markdown':
        blob = new Blob([content], { type: 'text/markdown' });
        mimeType = 'text/markdown';
        break;
      case 'txt':
        // Convert markdown to plain text
        const plainText = this.markdownToText(content);
        blob = new Blob([plainText], { type: 'text/plain' });
        mimeType = 'text/plain';
        break;
      case 'html':
        const html = this.generateHtmlDocument(content);
        blob = new Blob([html], { type: 'text/html' });
        mimeType = 'text/html';
        break;
      case 'pdf':
        // For PDF, we'll use the browser's print-to-PDF functionality
        await this.downloadAsPdf(content);
        return;
      default:
        throw new Error('Formato não suportado');
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateFilename() {
    const baseName = this.metadata.title || 'conversa-ai';
    const cleanName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    
    const extensions = {
      markdown: '.md',
      pdf: '.pdf',
      txt: '.txt',
      html: '.html'
    };
    
    return `${cleanName}-${timestamp}${extensions[this.currentFormat]}`;
  }

  markdownToText(markdown) {
    return markdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/^\s*[-*+]\s+/gm, '• ') // Convert lists
      .replace(/^>\s/gm, '') // Remove blockquotes
      .trim();
  }

  generateHtmlDocument(markdown) {
    const html = this.markdownToHtml(markdown);
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.metadata.title || 'Conversa AI'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #2c3e50; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #3498db; padding-left: 20px; margin: 20px 0; color: #666; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  async downloadAsPdf(content) {
    // Create a temporary window with the content
    const html = this.generateHtmlDocument(content);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.isModified) {
        // Auto-save to local storage as backup
        browser.storage.local.set({
          autoSavedContent: {
            content: this.content,
            timestamp: Date.now(),
            format: this.currentFormat
          }
        });
      }
    }, 30000); // Every 30 seconds
  }

  setupFormatting() {
    // Setup format-specific features
    this.updateFilename();
  }

  updateUI() {
    this.updateWordCount();
    this.updateDocumentInfo();
    this.updateFilename();
  }

  startWordCount() {
    // Initial word count
    this.updateWordCount();
  }

  showLoading(show, message = 'Processando...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    
    if (show) {
      messageEl.textContent = message;
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.style.color = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#666';
    
    setTimeout(() => {
      statusEl.textContent = 'Pronto';
      statusEl.style.color = '#666';
    }, 3000);
  }

  updateOptions() {
    // Options updated, mark as modified
    this.isModified = true;
  }

  syncScroll() {
    // Sync scroll between editor and preview
    if (this.previewVisible) {
      const textarea = document.getElementById('editorTextarea');
      const preview = document.getElementById('previewPane');
      
      const scrollPercent = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop = scrollPercent * (preview.scrollHeight - preview.clientHeight);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AIExporterEditor();
});

// Log initialization
console.log('🦊 AI Exporter Editor carregado para Firefox');
