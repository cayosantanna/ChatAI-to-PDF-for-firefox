// AI Exporter - Content Script Melhorado para Firefox
// Funcionalidade de seleção de área para PDF

class AIExporterContentScript {
  constructor() {
    this.isSelectionMode = false;
    this.selectionOverlay = null;
    this.startPoint = null;
    this.endPoint = null;
    this.currentSelection = null;
    this.init();
  }

  init() {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Escutar mensagens do background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });

    // Detectar site atual
    this.detectCurrentSite();
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'startAreaSelection':
          this.startAreaSelection();
          return { success: true };

        case 'exportFullText':
          return await this.exportFullText();

        case 'exportSelectedArea':
          if (this.currentSelection) {
            return await this.exportSelectedArea();
          }
          return { success: false, error: 'Nenhuma área selecionada' };

        case 'captureAllToImage':
          return await this.captureFullPage();

        case 'captureSelectedToImage':
          if (this.currentSelection) {
            return await this.captureSelectedArea();
          }
          return { success: false, error: 'Nenhuma área selecionada' };

        case 'extractContent':
          return await this.handleExtractContent(message);

        case 'getPageInfo':
          return this.getPageInfo();

        case 'theme-changed':
          this.handleThemeChange(message.theme);
          return { success: true };

        default:
          return { success: false, error: 'Ação não reconhecida' };
      }
    } catch (error) {
      console.error('Erro no content script:', error);
      return { success: false, error: error.message };
    }
  }

  // === SELEÇÃO DE ÁREA ===
  startAreaSelection() {
    if (this.isSelectionMode) {
      this.stopAreaSelection();
      return;
    }

    this.isSelectionMode = true;
    this.createSelectionOverlay();
    this.addSelectionEventListeners();

    // Mostrar instruções
    this.showInstructions('Clique e arraste para selecionar a área que deseja exportar');
  }

  createSelectionOverlay() {
    // Remover overlay existente
    if (this.selectionOverlay) {
      this.selectionOverlay.remove();
    }

    // Criar overlay de seleção
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'ai-exporter-selection-overlay';
    this.selectionOverlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 123, 255, 0.1) !important;
      border: 2px dashed #007bff !important;
      cursor: crosshair !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
      display: none !important;
    `;

    document.body.appendChild(this.selectionOverlay);
  }

  addSelectionEventListeners() {
    this.onMouseDown = (e) => this.handleMouseDown(e);
    this.onMouseMove = (e) => this.handleMouseMove(e);
    this.onMouseUp = (e) => this.handleMouseUp(e);
    this.onKeyDown = (e) => this.handleKeyDown(e);

    document.addEventListener('mousedown', this.onMouseDown, true);
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('mouseup', this.onMouseUp, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  handleMouseDown(e) {
    if (!this.isSelectionMode) return;

    e.preventDefault();
    e.stopPropagation();

    this.startPoint = { x: e.clientX, y: e.clientY };
    this.selectionOverlay.style.display = 'block';
    this.updateSelectionBox(e.clientX, e.clientY, e.clientX, e.clientY);
  }

  handleMouseMove(e) {
    if (!this.isSelectionMode || !this.startPoint) return;

    e.preventDefault();
    this.updateSelectionBox(this.startPoint.x, this.startPoint.y, e.clientX, e.clientY);
  }

  handleMouseUp(e) {
    if (!this.isSelectionMode || !this.startPoint) return;

    e.preventDefault();
    e.stopPropagation();

    this.endPoint = { x: e.clientX, y: e.clientY };
    this.finalizeSelection();
  }

  handleKeyDown(e) {
    if (!this.isSelectionMode) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.stopAreaSelection();
    }
  }

  updateSelectionBox(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    this.selectionOverlay.style.left = left + 'px';
    this.selectionOverlay.style.top = top + 'px';
    this.selectionOverlay.style.width = width + 'px';
    this.selectionOverlay.style.height = height + 'px';
  }

  finalizeSelection() {
    const rect = this.selectionOverlay.getBoundingClientRect();

    this.currentSelection = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      timestamp: Date.now()
    };

    this.stopAreaSelection();
    this.showSelectionConfirmation();
  }

  stopAreaSelection() {
    this.isSelectionMode = false;
    this.startPoint = null;
    this.endPoint = null;

    // Remover event listeners
    if (this.onMouseDown) {
      document.removeEventListener('mousedown', this.onMouseDown, true);
      document.removeEventListener('mousemove', this.onMouseMove, true);
      document.removeEventListener('mouseup', this.onMouseUp, true);
      document.removeEventListener('keydown', this.onKeyDown, true);
    }

    // Esconder overlay
    if (this.selectionOverlay) {
      this.selectionOverlay.style.display = 'none';
    }

    this.hideInstructions();
  }

  // === EXPORTAÇÃO ===
  async exportFullText() {
    const content = this.extractPageContent();

    // Criar blob e download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const filename = this.generateFilename('txt');
    this.downloadFile(url, filename);

    return {
      success: true,
      message: `Texto exportado: ${filename}`,
      type: 'text',
      size: content.length
    };
  }

  async exportSelectedArea() {
    if (!this.currentSelection) {
      throw new Error('Nenhuma área selecionada');
    }

    // Capturar elementos na área selecionada
    const elements = this.getElementsInArea(this.currentSelection);
    const content = this.extractContentFromElements(elements);

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const filename = this.generateFilename('selected-area.txt');
    this.downloadFile(url, filename);

    return {
      success: true,
      message: `Área selecionada exportada: ${filename}`,
      type: 'text',
      area: this.currentSelection
    };
  }

  async captureFullPage() {
    try {
      // Solicitar captura via background script
      const response = await browser.runtime.sendMessage({
        action: 'captureVisibleTab',
        options: { format: 'png' }
      });

      if (response.success) {
        const filename = this.generateFilename('png');
        this.downloadFile(response.dataUrl, filename);

        return {
          success: true,
          message: `Imagem capturada: ${filename}`,
          type: 'image'
        };
      }

      throw new Error(response.error || 'Erro na captura');
    } catch (error) {
      throw new Error(`Erro ao capturar página: ${error.message}`);
    }
  }

  async captureSelectedArea() {
    if (!this.currentSelection) {
      throw new Error('Nenhuma área selecionada');
    }

    // Usar html2canvas para capturar área específica
    try {
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');

      const canvas = await html2canvas(document.body, {
        x: this.currentSelection.x,
        y: this.currentSelection.y,
        width: this.currentSelection.width,
        height: this.currentSelection.height,
        useCORS: true,
        allowTaint: true
      });

      const dataUrl = canvas.toDataURL('image/png');
      const filename = this.generateFilename('selected-area.png');
      this.downloadFile(dataUrl, filename);

      return {
        success: true,
        message: `Área capturada: ${filename}`,
        type: 'image',
        area: this.currentSelection
      };
    } catch (error) {
      throw new Error(`Erro ao capturar área: ${error.message}`);
    }
  }

  // === UTILIDADES ===
  extractPageContent() {
    const site = this.detectCurrentSite();

    switch (site) {
      case 'chatgpt':
        return this.extractChatGPTContent();
      case 'claude':
        return this.extractClaudeContent();
      case 'gemini':
        return this.extractGeminiContent();
      default:
        return this.extractGenericContent();
    }
  }

  extractChatGPTContent() {
    const messages = document.querySelectorAll('[data-message-author-role]');
    let content = `Conversa ChatGPT - ${new Date().toLocaleString('pt-BR')}\n\n`;

    messages.forEach(msg => {
      const role = msg.getAttribute('data-message-author-role');
      const text = msg.innerText.trim();

      if (text) {
        content += `${role === 'user' ? 'Usuário' : 'ChatGPT'}: ${text}\n\n`;
      }
    });

    return content;
  }

  extractClaudeContent() {
    const messages = document.querySelectorAll('[data-testid*="message"]');
    let content = `Conversa Claude - ${new Date().toLocaleString('pt-BR')}\n\n`;

    messages.forEach(msg => {
      const text = msg.innerText.trim();
      if (text) {
        content += `${text}\n\n`;
      }
    });

    return content;
  }

  extractGeminiContent() {
    const messages = document.querySelectorAll('message-content, .conversation-turn');
    let content = `Conversa Gemini - ${new Date().toLocaleString('pt-BR')}\n\n`;

    messages.forEach(msg => {
      const text = msg.innerText.trim();
      if (text) {
        content += `${text}\n\n`;
      }
    });

    return content;
  }

  extractGenericContent() {
    const title = document.title;
    const body = document.body.innerText;

    return `${title}\n${'='.repeat(title.length)}\n\n${body}`;
  }

  getElementsInArea(selection) {
    const elements = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elX = rect.left + window.scrollX;
      const elY = rect.top + window.scrollY;

      // Verificar se elemento está dentro da área selecionada
      if (elX >= selection.x && elY >= selection.y &&
          elX + rect.width <= selection.x + selection.width &&
          elY + rect.height <= selection.y + selection.height) {
        elements.push(el);
      }
    });

    return elements;
  }

  extractContentFromElements(elements) {
    let content = `Área Selecionada - ${new Date().toLocaleString('pt-BR')}\n\n`;

    elements.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 10) { // Evitar textos muito pequenos
        content += `${text}\n\n`;
      }
    });

    return content;
  }

  detectCurrentSite() {
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('chatgpt.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('deepseek.com')) return 'deepseek';
    if (hostname.includes('grok.x.ai')) return 'grok';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    if (hostname.includes('aistudio.google.com')) return 'aistudio';

    return 'generic';
  }

  getPageInfo() {
    const site = this.detectCurrentSite();

    return {
      site,
      title: document.title,
      url: window.location.href,
      hostname: window.location.hostname,
      hasSelection: !!this.currentSelection,
      selection: this.currentSelection
    };
  }

  generateFilename(extension) {
    const site = this.detectCurrentSite();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    return `ai-export-${site}-${timestamp}.${extension}`;
  }

  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  // === UI FEEDBACK ===
  showInstructions(message) {
    const instructions = document.createElement('div');
    instructions.className = 'ai-exporter-instructions';
    instructions.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #007bff !important;
      color: white !important;
      padding: 15px 25px !important;
      border-radius: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
      font-size: 14px !important;
      z-index: 1000000 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      animation: slideDown 0.3s ease-out !important;
    `;
    instructions.textContent = message;

    // Adicionar animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(instructions);
    this.instructionsElement = instructions;
  }

  hideInstructions() {
    if (this.instructionsElement) {
      this.instructionsElement.remove();
      this.instructionsElement = null;
    }
  }

  showSelectionConfirmation() {
    const confirmation = document.createElement('div');
    confirmation.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #28a745 !important;
      color: white !important;
      padding: 15px !important;
      border-radius: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
      font-size: 14px !important;
      z-index: 1000000 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    `;
    confirmation.innerHTML = `
      ✅ Área selecionada!<br>
      <small>Use o popup para exportar</small>
    `;

    document.body.appendChild(confirmation);

    setTimeout(() => {
      confirmation.remove();
    }, 3000);
  }

  handleThemeChange(theme) {
    // Adaptar ao tema do Firefox
    if (theme.colors) {
      document.documentElement.style.setProperty('--ai-exporter-primary', theme.colors.toolbar || '#007bff');
    }
  }

  // === EXTRAÇÃO PARA EDITOR ===
  async handleExtractContent(message) {
    const { includeFormatting } = message;

    try {
      const content = this.extractAIContent();
      const metadata = this.extractMetadata();

      if (!content || content.trim().length === 0) {
        throw new Error('Nenhum conteúdo encontrado para extrair');
      }

      const processedContent = includeFormatting ?
        this.processWithFormatting(content) :
        content;

      return {
        success: true,
        content: processedContent,
        metadata: {
          ...metadata,
          siteName: this.getSiteName(),
          url: window.location.href,
          timestamp: Date.now(),
          title: this.generateTitle(content)
        }
      };
    } catch (error) {
      console.error('Erro na extração:', error);
      return { success: false, error: error.message };
    }
  }

  processWithFormatting(content) {
    // Converter HTML para Markdown preservando formatação
    let formatted = content;

    // Preservar estrutura de conversas
    formatted = formatted.replace(/<div[^>]*class="[^"]*message[^"]*"[^>]*>/gi, '\n\n**Mensagem:**\n');
    formatted = formatted.replace(/<div[^>]*class="[^"]*user[^"]*"[^>]*>/gi, '\n\n**Usuário:**\n');
    formatted = formatted.replace(/<div[^>]*class="[^"]*assistant[^"]*"[^>]*>/gi, '\n\n**Assistente:**\n');

    // Preservar código
    formatted = formatted.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n\n```\n$1\n```\n\n');
    formatted = formatted.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Preservar formatação de texto
    formatted = formatted.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    formatted = formatted.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    formatted = formatted.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    formatted = formatted.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Preservar links
    formatted = formatted.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Preservar listas
    formatted = formatted.replace(/<ul[^>]*>/gi, '\n');
    formatted = formatted.replace(/<\/ul>/gi, '\n');
    formatted = formatted.replace(/<li[^>]*>/gi, '\n- ');
    formatted = formatted.replace(/<\/li>/gi, '');

    // Preservar cabeçalhos
    formatted = formatted.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
    formatted = formatted.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
    formatted = formatted.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');

    // Preservar quebras de linha
    formatted = formatted.replace(/<br[^>]*>/gi, '\n');
    formatted = formatted.replace(/<\/p>/gi, '\n\n');
    formatted = formatted.replace(/<p[^>]*>/gi, '');

    // Remover tags HTML restantes
    formatted = formatted.replace(/<[^>]*>/g, '');

    // Limpar espaços extras
    formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
    formatted = formatted.trim();

    // Adicionar cabeçalho
    const header = `# Conversa Exportada - ${this.getSiteName()}\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}\n**Hora:** ${new Date().toLocaleTimeString('pt-BR')}\n**URL:** ${window.location.href}\n\n---\n\n`;

    return header + formatted;
  }

  extractMetadata() {
    return {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      domain: window.location.hostname,
      path: window.location.pathname
    };
  }

  generateTitle(content) {
    // Extrair título da primeira linha ou primeiras palavras
    const firstLine = content.split('\n')[0];
    const words = firstLine.replace(/[^\w\s]/g, '').split(/\s+/).slice(0, 8);
    return words.join(' ') || 'Conversa AI';
  }

  getSiteName() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Gemini';
    if (hostname.includes('chat.deepseek.com')) return 'DeepSeek';
    if (hostname.includes('grok.x.ai')) return 'Grok';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    if (hostname.includes('aistudio.google.com')) return 'AI Studio';
    if (hostname.includes('poe.com')) return 'Poe';
    if (hostname.includes('you.com')) return 'You.com';
    if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
    return 'Site de IA';
  }
}

// Inicializar content script
const aiExporter = new AIExporterContentScript();

// Exportar para uso global
window.aiExporter = aiExporter;
