// Content script avançado com interface de edição
// Adaptação expandida do bookmarklet original

class AdvancedAIChatPDFExporter {
  constructor() {
    this.elements = [];
    this.csp = false;
    this.selectedElements = new Set();
    this.images = [];
    this.setupMessageListener();
    this.setupSelectionInterface();
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      try {
        console.log('Content script recebeu mensagem:', message);
        
        if (message.action === 'exportToPDF' || message.action === 'quickCapture') {
          console.log('Iniciando captura de conteúdo...');
          const result = await this.exportToPDF(message.hostname || window.location.hostname, message.mode || 'smart');
          sendResponse({ success: true, message: 'Conteúdo capturado com sucesso', data: result });
        } else if (message.action === 'advancedCapture') {
          console.log('Iniciando captura avançada...');
          await this.showSelectionInterface();
          sendResponse({ success: true, message: 'Interface de seleção ativada' });
        } else if (message.action === 'toggleSidebar') {
          this.toggleSelectionSidebar();
          sendResponse({ success: true });
        } else if (message.action === 'getPageInfo') {
          const info = await this.getPageInfo();
          sendResponse({ success: true, data: info });
        } else {
          console.log('Ação não reconhecida:', message.action);
          sendResponse({ success: false, error: 'Ação não reconhecida: ' + message.action });
        }
      } catch (error) {
        console.error('Erro no content script:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Erro desconhecido ao processar conteúdo'
        });
      }
      
      return true; // Mantém o canal aberto para resposta assíncrona
    });
  }

  setupSelectionInterface() {
    // Adiciona estilos para seleção de elementos
    const style = document.createElement('style');
    style.id = 'pdf-exporter-styles';
    style.textContent = `
      .pdf-exporter-selectable {
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .pdf-exporter-selectable:hover {
        box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
        background-color: rgba(59, 130, 246, 0.05);
      }
      .pdf-exporter-selected {
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6) !important;
        background-color: rgba(16, 185, 129, 0.1) !important;
      }
      .pdf-exporter-checkbox {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 20px;
        height: 20px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 4px;
        z-index: 10000;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pdf-exporter-checkbox.selected {
        background: #3b82f6;
        color: white;
      }
      .pdf-exporter-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: white;
        border-left: 2px solid #e5e7eb;
        z-index: 10001;
        padding: 20px;
        overflow-y: auto;
        box-shadow: -5px 0 15px rgba(0,0,0,0.1);
      }
    `;
    
    if (!document.getElementById('pdf-exporter-styles')) {
      document.head.appendChild(style);
    }
  }

  async exportToPDF(hostname, mode = 'smart') {
    try {
      console.log('Exportando PDF para:', hostname, 'modo:', mode);
      
      // Detecta plataforma
      const platform = this.detectPlatform(hostname);
      console.log('Plataforma detectada:', platform);
      
      // Encontra elementos baseado na plataforma
      this.findElements(platform);
      console.log('Elementos encontrados:', this.elements.length);
      
      if (this.elements.length === 0) {
        throw new Error('Nenhum conteúdo de conversa encontrado nesta página');
      }
      
      // Extrai imagens
      await this.extractImages();
      console.log('Imagens extraídas:', this.images.length);
      
      // Verifica CSP
      this.checkCSP();
      
      // Gera PDF baseado no modo
      if (mode === 'smart' || this.csp) {
        await this.generatePDFNative();
      } else {
        await this.generatePDFAdvanced();
      }
      
      return {
        elementsFound: this.elements.length,
        imagesFound: this.images.length,
        platform: platform,
        cspRestricted: this.csp
      };
      
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw error;
    }
  }

  detectPlatform(hostname) {
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('chatgpt.com')) return 'chatgpt';
    if (hostname.includes('grok.com')) return 'grok';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('notion.so')) return 'notion';
    return 'generic';
  }

  findElements(platform) {
    this.elements = [];
    
    const selectors = {
      claude: [
        '[data-testid="conversation"] [data-testid="message"]',
        '.conversation-content .message',
        '[role="main"] .prose'
      ],
      chatgpt: [
        '[data-testid="conversation-turn"]',
        '.conversation-content > div',
        '[role="presentation"] .group'
      ],
      grok: [
        '.message-container',
        '.conversation .message',
        '[data-testid="message"]'
      ],
      gemini: [
        '.conversation-container .message',
        '[data-testid="conversation"] > div',
        '.model-response'
      ],
      notion: [
        '[data-block-id]',
        '.notion-page-content',
        '.notion-selectable'
      ],
      generic: [
        'article',
        '.content',
        'main',
        '[role="main"]',
        '.post',
        '.entry-content'
      ]
    };

    const platformSelectors = selectors[platform] || selectors.generic;
    
    for (const selector of platformSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        this.elements = Array.from(found);
        console.log(`Encontrados ${found.length} elementos com seletor: ${selector}`);
        break;
      }
    }
  }

  async extractImages() {
    this.images = [];
    const imgs = document.querySelectorAll('img[src]');
    
    for (const img of imgs) {
      try {
        if (img.src && img.src.startsWith('http')) {
          const base64 = await this.imageToBase64(img.src);
          this.images.push({
            src: img.src,
            base64: base64,
            alt: img.alt || ''
          });
        }
      } catch (error) {
        console.warn('Erro ao converter imagem:', error);
      }
    }
  }

  async imageToBase64(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  checkCSP() {
    try {
      eval('1+1');
      this.csp = false;
    } catch (e) {
      this.csp = true;
      console.log('CSP detectado, usando modo nativo');
    }
  }

  async generatePDFNative() {
    // Cria versão limpa do conteúdo
    const content = this.createCleanContent();
    
    // Abre janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Chat Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
          .user-message { background: #f0f9ff; border-left: 4px solid #0ea5e9; }
          .ai-message { background: #f9fafb; border-left: 4px solid #6b7280; }
          .timestamp { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .content { line-height: 1.6; }
          img { max-width: 100%; height: auto; margin: 10px 0; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 2px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }, 500);
  }

  async generatePDFAdvanced() {
    // Implementação avançada com html2pdf
    console.log('Gerando PDF avançado...');
    // Esta função seria implementada se html2pdf estivesse disponível
    this.generatePDFNative(); // Fallback
  }

  createCleanContent() {
    let html = `<h1>Exportação de Conversa - ${new Date().toLocaleDateString()}</h1>`;
    
    this.elements.forEach((element, index) => {
      const content = this.cleanElementContent(element);
      if (content.trim()) {
        html += `
          <div class="message ${index % 2 === 0 ? 'user-message' : 'ai-message'}">
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
            <div class="content">${content}</div>
          </div>
        `;
      }
    });
    
    return html;
  }

  cleanElementContent(element) {
    const clone = element.cloneNode(true);
    
    // Remove elementos desnecessários
    const unwanted = clone.querySelectorAll('script, style, .pdf-exporter-checkbox, button, [aria-hidden="true"]');
    unwanted.forEach(el => el.remove());
    
    // Converte imagens para base64 se disponível
    const images = clone.querySelectorAll('img[src]');
    images.forEach(img => {
      const base64Image = this.images.find(i => i.src === img.src);
      if (base64Image) {
        img.src = base64Image.base64;
      }
    });
    
    return clone.innerHTML;
  }

  async showSelectionInterface() {
    // Remove interface anterior se existir
    const existing = document.querySelector('.pdf-exporter-sidebar');
    if (existing) existing.remove();
    
    // Torna elementos selecionáveis
    this.elements.forEach(element => {
      element.classList.add('pdf-exporter-selectable');
      const checkbox = document.createElement('div');
      checkbox.className = 'pdf-exporter-checkbox';
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleElementSelection(element);
      });
      element.appendChild(checkbox);
    });
    
    // Cria sidebar
    this.createSelectionSidebar();
  }

  createSelectionSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'pdf-exporter-sidebar';
    sidebar.innerHTML = `
      <h3>Seleção de Conteúdo</h3>
      <p>Clique nos elementos para incluir/excluir da exportação</p>
      <div>
        <button onclick="aiExporter.selectAll()">Selecionar Todos</button>
        <button onclick="aiExporter.deselectAll()">Deselecionar Todos</button>
      </div>
      <div>
        <p>Selecionados: <span id="selected-count">0</span></p>
        <button onclick="aiExporter.exportSelected()">Exportar Selecionados</button>
      </div>
      <div>
        <button onclick="aiExporter.hideInterface()">Fechar</button>
      </div>
    `;
    
    document.body.appendChild(sidebar);
  }

  toggleElementSelection(element) {
    const checkbox = element.querySelector('.pdf-exporter-checkbox');
    
    if (this.selectedElements.has(element)) {
      this.selectedElements.delete(element);
      element.classList.remove('pdf-exporter-selected');
      checkbox.classList.remove('selected');
      checkbox.innerHTML = '';
    } else {
      this.selectedElements.add(element);
      element.classList.add('pdf-exporter-selected');
      checkbox.classList.add('selected');
      checkbox.innerHTML = '✓';
    }
    
    this.updateSelectionCount();
  }

  updateSelectionCount() {
    const counter = document.getElementById('selected-count');
    if (counter) {
      counter.textContent = this.selectedElements.size;
    }
  }

  selectAll() {
    this.elements.forEach(element => {
      if (!this.selectedElements.has(element)) {
        this.toggleElementSelection(element);
      }
    });
  }

  deselectAll() {
    [...this.selectedElements].forEach(element => {
      this.toggleElementSelection(element);
    });
  }

  async exportSelected() {
    if (this.selectedElements.size === 0) {
      alert('Nenhum elemento selecionado');
      return;
    }
    
    const originalElements = this.elements;
    this.elements = [...this.selectedElements];
    
    try {
      await this.generatePDFNative();
    } finally {
      this.elements = originalElements;
    }
  }

  hideInterface() {
    const sidebar = document.querySelector('.pdf-exporter-sidebar');
    if (sidebar) sidebar.remove();
    
    this.elements.forEach(element => {
      element.classList.remove('pdf-exporter-selectable', 'pdf-exporter-selected');
      const checkbox = element.querySelector('.pdf-exporter-checkbox');
      if (checkbox) checkbox.remove();
    });
    
    this.selectedElements.clear();
  }

  toggleSelectionSidebar() {
    const sidebar = document.querySelector('.pdf-exporter-sidebar');
    if (sidebar) {
      this.hideInterface();
    } else {
      this.showSelectionInterface();
    }
  }

  async getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      hostname: window.location.hostname,
      elementsFound: this.elements.length,
      imagesFound: this.images.length,
      platform: this.detectPlatform(window.location.hostname),
      hasContent: this.elements.length > 0
    };
  }
}

// Inicializa o exportador
const aiExporter = new AdvancedAIChatPDFExporter();

// Adiciona função global para acesso do sidebar
window.aiExporter = aiExporter;

console.log('AI Content Processor carregado com sucesso');
