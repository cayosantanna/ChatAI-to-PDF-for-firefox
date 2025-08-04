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
        'div[data-testid="conversation"] > div',
        'div[data-test-render-count]',
        '.conversation-content .message',
        '[role="main"] .prose',
        'article'
      ],
      chatgpt: [
        'div[data-testid="conversation-turn"]',
        'article[data-testid*="conversation"]',
        '.conversation-content > div',
        '[role="presentation"] .group',
        'main article'
      ],
      grok: [
        'div[class*="message"]',
        '.message-container',
        '.conversation .message',
        '[data-testid="message"]'
      ],
      gemini: [
        'message-content',
        '.conversation-container .message',
        '[data-testid="conversation"] > div',
        '.model-response'
      ],
      notion: [
        '[data-block-id]',
        '.notion-page-content',
        '.notion-selectable',
        '[contenteditable="true"]'
      ],
      generic: [
        'article',
        '.content',
        'main',
        '[role="main"]',
        '.post',
        '.entry-content',
        'p'
      ]
    };

    const platformSelectors = selectors[platform] || selectors.generic;
    
    for (const selector of platformSelectors) {
      try {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          this.elements = Array.from(found).filter(el => {
            // Filtra elementos muito pequenos ou vazios
            const text = el.textContent?.trim() || '';
            return text.length > 10 && el.offsetHeight > 20;
          });
          
          console.log(`Encontrados ${this.elements.length} elementos válidos com seletor: ${selector}`);
          
          if (this.elements.length > 0) {
            break;
          }
        }
      } catch (error) {
        console.warn(`Erro ao usar seletor ${selector}:`, error);
      }
    }

    // Se não encontrou nada, tenta uma busca mais genérica
    if (this.elements.length === 0) {
      console.log('Tentando busca genérica por elementos com texto...');
      const allElements = document.querySelectorAll('div, p, article, section');
      this.elements = Array.from(allElements).filter(el => {
        const text = el.textContent?.trim() || '';
        const hasText = text.length > 50;
        const isVisible = el.offsetHeight > 50 && el.offsetWidth > 100;
        const notScript = !el.querySelector('script, style, noscript');
        return hasText && isVisible && notScript;
      }).slice(0, 20); // Limita a 20 elementos
      
      console.log(`Busca genérica encontrou ${this.elements.length} elementos`);
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
      
      // Escolhe método baseado no modo e capacidades
      if (mode === 'smart') {
        // Tenta método avançado primeiro, depois nativo
        try {
          await this.generatePDFAdvanced();
        } catch (error) {
          console.log('Método avançado falhou, usando nativo');
          await this.generatePDFNative();
        }
      } else if (mode === 'native' || this.csp) {
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
    
    // Cria um elemento temporário para impressão
    const printElement = document.createElement('div');
    printElement.id = 'ai-pdf-export-content';
    printElement.innerHTML = `
      <style>
        #ai-pdf-export-content {
          font-family: 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.6;
          color: #000;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        #ai-pdf-export-content .message {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        #ai-pdf-export-content .user-message {
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
        }
        #ai-pdf-export-content .ai-message {
          background: #f9fafb;
          border-left: 4px solid #6b7280;
        }
        #ai-pdf-export-content .timestamp {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        #ai-pdf-export-content .content {
          line-height: 1.6;
        }
        #ai-pdf-export-content img {
          max-width: 100%;
          height: auto;
          margin: 10px 0;
        }
        #ai-pdf-export-content pre {
          background: #f4f4f4;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          white-space: pre-wrap;
        }
        #ai-pdf-export-content code {
          background: #f4f4f4;
          padding: 2px 4px;
          border-radius: 2px;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #ai-pdf-export-content,
          #ai-pdf-export-content * {
            visibility: visible;
          }
          #ai-pdf-export-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          @page {
            margin: 2cm;
            size: A4;
          }
        }
      </style>
      ${content}
    `;
    
    // Remove elemento anterior se existir
    const existingElement = document.getElementById('ai-pdf-export-content');
    if (existingElement) {
      existingElement.remove();
    }
    
    // Adiciona o elemento ao body
    document.body.appendChild(printElement);
    
    // Aguarda um momento para o conteúdo carregar
    setTimeout(() => {
      try {
        // Tenta usar a API de impressão do browser primeiro
        if (window.print) {
          window.print();
        } else {
          // Fallback para download como HTML
          this.downloadAsHTML(content);
        }
        
        // Remove o elemento após impressão
        setTimeout(() => {
          if (document.body.contains(printElement)) {
            document.body.removeChild(printElement);
          }
        }, 1000);
        
      } catch (error) {
        console.error('Erro na impressão:', error);
        // Fallback para download
        this.downloadAsHTML(content);
      }
    }, 500);
  }

  downloadAsHTML(content) {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conversa AI - ${new Date().toLocaleDateString()}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
            page-break-inside: avoid;
          }
          .user-message {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
          }
          .ai-message {
            background: #f9fafb;
            border-left: 4px solid #6b7280;
          }
          .timestamp {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .content {
            line-height: 1.6;
          }
          img {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
          }
          pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
          }
          code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 2px;
          }
          @media print {
            @page {
              margin: 2cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          // Auto-print quando a página carrega
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Cria link de download
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversa-ai-${new Date().toISOString().slice(0, 10)}.html`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpa a URL do blob
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('Arquivo HTML baixado com sucesso');
  }

  async generatePDFAdvanced() {
    console.log('Tentando gerar PDF avançado...');
    
    try {
      // Carrega html2pdf se não estiver disponível
      if (!window.html2pdf) {
        await this.loadHtml2Pdf();
      }
      
      const content = this.createCleanContent();
      
      // Cria container para o PDF
      const container = document.createElement('div');
      container.style.cssText = `
        font-family: 'Times New Roman', serif;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: white;
      `;
      container.innerHTML = content;
      
      const options = {
        margin: [15, 15, 15, 15],
        filename: `conversa-ai-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      };
      
      await html2pdf().set(options).from(container).save();
      console.log('PDF gerado com sucesso usando html2pdf');
      
    } catch (error) {
      console.error('Erro no PDF avançado:', error);
      // Fallback para método nativo
      this.generatePDFNative();
    }
  }

  async loadHtml2Pdf() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.3/html2pdf.bundle.min.js';
      script.onload = () => {
        console.log('html2pdf carregado com sucesso');
        resolve();
      };
      script.onerror = () => {
        console.error('Falha ao carregar html2pdf');
        reject(new Error('Falha ao carregar html2pdf'));
      };
      document.head.appendChild(script);
    });
  }

  createCleanContent() {
    const hostname = window.location.hostname;
    const platform = this.detectPlatform(hostname);
    
    let html = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">Conversa Exportada</h1>
        <p style="color: #6b7280; margin: 0;">
          <strong>Site:</strong> ${hostname} | 
          <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} | 
          <strong>Hora:</strong> ${new Date().toLocaleTimeString('pt-BR')}
        </p>
        <p style="color: #6b7280; margin: 5px 0 0 0;">
          <strong>Elementos capturados:</strong> ${this.elements.length} | 
          <strong>Plataforma:</strong> ${platform}
        </p>
      </div>
    `;
    
    this.elements.forEach((element, index) => {
      const content = this.cleanElementContent(element);
      if (content.trim()) {
        // Determina o tipo de mensagem baseado na posição e conteúdo
        const isUserMessage = this.isUserMessage(element, index);
        const messageType = isUserMessage ? 'user-message' : 'ai-message';
        const messageLabel = isUserMessage ? 'Usuário' : 'IA';
        
        html += `
          <div class="message ${messageType}" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; ${
            isUserMessage 
              ? 'background: #f0f9ff; border-left: 4px solid #0ea5e9;' 
              : 'background: #f9fafb; border-left: 4px solid #6b7280;'
          }">
            <div class="timestamp" style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 500;">
              ${messageLabel}
            </div>
            <div class="content" style="line-height: 1.6;">
              ${content}
            </div>
          </div>
        `;
      }
    });
    
    // Adiciona rodapé
    html += `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Exportado com AI Content Processor em ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    `;
    
    return html;
  }

  cleanElementContent(element) {
    const clone = element.cloneNode(true);
    
    // Remove scripts, styles, etc.
    clone.querySelectorAll('script, style, noscript, link, meta, button, input, textarea, select, [role="button"], .pdf-exporter-checkbox').forEach(el => el.remove());

    // Limpa atributos
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
        const attrsToRemove = [];
        for (const attr of el.attributes) {
            if (attr.name.startsWith('on') || attr.name.startsWith('data-') || attr.name === 'class' || attr.name === 'id' || attr.name === 'style') {
                attrsToRemove.push(attr.name);
            }
        }
        attrsToRemove.forEach(attr => el.removeAttribute(attr));
    });

    // Converte imagens para base64 se necessário
    clone.querySelectorAll('img').forEach(async img => {
        if (img.src && img.src.startsWith('http')) {
            const base64Src = await this.imageToBase64(img.src).catch(() => img.src);
            img.src = base64Src;
        }
    });

    return clone.innerHTML;
  }

  isUserMessage(element, index) {
    const text = element.textContent.toLowerCase();
    
    // Indicadores comuns de mensagens do usuário
    const userIndicators = [
      'você', 'me ajude', 'preciso', 'quero', 'como fazer',
      'explique', 'pode', 'consegue', 'me diga'
    ];
    
    // Indicadores de mensagens da IA
    const aiIndicators = [
      'posso ajudar', 'vou explicar', 'aqui está', 'certamente',
      'claro', 'entendo', 'baseado', 'considere', 'recomendo'
    ];
    
    const hasUserIndicators = userIndicators.some(indicator => text.includes(indicator));
    const hasAiIndicators = aiIndicators.some(indicator => text.includes(indicator));
    
    if (hasUserIndicators && !hasAiIndicators) return true;
    if (hasAiIndicators && !hasUserIndicators) return false;
    
    // Fallback: alterna baseado na posição (considerando que o usuário geralmente começa)
    return index % 2 === 0;
  }

  async showSelectionInterface() {
    // Remove interface anterior se existir
    const existing = document.querySelector('.pdf-exporter-sidebar');
    if (existing) existing.remove();
    
    this.findElements(this.detectPlatform(window.location.hostname));

    // Torna elementos selecionáveis
    this.elements.forEach(element => {
      element.classList.add('pdf-exporter-selectable');
      
      // Adiciona checkbox visual
      const checkbox = document.createElement('div');
      checkbox.className = 'pdf-exporter-checkbox';
      checkbox.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.toggleElementSelection(element);
      };
      element.appendChild(checkbox);

      element.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.toggleElementSelection(element);
      });
    });
    
    // Cria sidebar
    this.createSelectionSidebar();
    this.selectAll(); // Seleciona tudo por padrão
  }

  createSelectionSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'pdf-exporter-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h3>Seleção de Conteúdo</h3>
        <button id="close-sidebar-btn" onclick="aiExporter.hideInterface()">×</button>
      </div>
      <p>Clique nos elementos da página para incluir ou excluir da exportação.</p>
      <div class="sidebar-stats">
        Selecionados: <span id="selected-count">0</span> de ${this.elements.length}
      </div>
      <div class="sidebar-actions">
        <button onclick="aiExporter.selectAll()">Selecionar Todos</button>
        <button onclick="aiExporter.deselectAll()">Limpar Seleção</button>
      </div>
      <div class="sidebar-export">
        <button id="export-selected-btn" onclick="aiExporter.exportSelected()">Abrir no Editor</button>
      </div>
    `;
    
    document.body.appendChild(sidebar);
  }

  toggleElementSelection(element) {
    const checkbox = element.querySelector('.pdf-exporter-checkbox');
    
    if (this.selectedElements.has(element)) {
      this.selectedElements.delete(element);
      element.classList.remove('pdf-exporter-selected');
      if (checkbox) checkbox.classList.remove('selected');
    } else {
      this.selectedElements.add(element);
      element.classList.add('pdf-exporter-selected');
      if (checkbox) checkbox.classList.add('selected');
    }
    
    this.updateSelectionCount();
  }

  updateSelectionCount() {
    const counter = document.getElementById('selected-count');
    if (counter) {
      counter.textContent = this.selectedElements.size;
    }
    const exportBtn = document.getElementById('export-selected-btn');
    if (exportBtn) {
        exportBtn.disabled = this.selectedElements.size === 0;
        exportBtn.textContent = this.selectedElements.size === 0 ? 'Selecione itens' : 'Abrir no Editor';
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
    // Copia para um array para evitar problemas de modificação durante a iteração
    [...this.selectedElements].forEach(element => {
      this.toggleElementSelection(element);
    });
  }

  async exportSelected() {
    if (this.selectedElements.size === 0) {
      alert('Nenhum elemento selecionado para exportar.');
      return;
    }
    
    // Usa os elementos selecionados para a exportação
    const originalElements = this.elements;
    this.elements = Array.from(this.selectedElements);
    
    try {
      const content = this.createCleanContent();
      const images = this.images;
      
      // Envia o conteúdo para o editor
      browser.runtime.sendMessage({
        action: 'openEditor',
        data: {
          content: content,
          images: images,
          hostname: window.location.hostname
        }
      });

      this.hideInterface();

    } catch(error) {
        console.error("Erro ao exportar selecionados:", error);
        alert("Ocorreu um erro ao preparar o conteúdo para o editor.");
    } finally {
      // Restaura os elementos originais
      this.elements = originalElements;
    }
  }

  hideInterface() {
    const sidebar = document.querySelector('.pdf-exporter-sidebar');
    if (sidebar) sidebar.remove();
    
    document.querySelectorAll('.pdf-exporter-selectable, .pdf-exporter-selected').forEach(element => {
      element.classList.remove('pdf-exporter-selectable', 'pdf-exporter-selected');
      const checkbox = element.querySelector('.pdf-exporter-checkbox');
      if (checkbox) checkbox.remove();
      // Restaurar evento de clique original se necessário (complexo, omitido por simplicidade)
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

  async scanPageContent() {
    try {
      const platform = this.detectPlatform(window.location.hostname);
      this.findElements(platform);
      
      const imgs = document.querySelectorAll('img[src]');
      const articles = document.querySelectorAll('article, .post, .entry-content');
      const comments = document.querySelectorAll('.comment, .reply, [class*="comment-"]');
      
      return {
        success: true,
        content: {
          ai: this.elements.length,
          images: imgs.length,
          articles: articles.length,
          comments: comments.length
        }
      };
    } catch (error) {
      console.warn('Erro ao escanear conteúdo:', error);
      return {
        success: false,
        content: { ai: 0, images: 0, articles: 0, comments: 0 }
      };
    }
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      console.log('Content script recebeu mensagem:', message);
      try {
        switch (message.action) {
          case 'quickCapture': {
            const result = await this.exportToPDF(message.hostname || window.location.hostname, message.mode || 'smart');
            sendResponse({ success: true, message: 'Conteúdo capturado com sucesso', data: result });
            break;
          }
          case 'advancedCapture': {
            await this.showSelectionInterface();
            sendResponse({ success: true, message: 'Interface de seleção ativada' });
            break;
          }
          case 'scanContent': {
            const result = await this.scanPageContent();
            sendResponse(result);
            break;
          }
          case 'exportDocument': {
             const originalElements = this.elements;
             if (this.selectedElements.size > 0) {
                this.elements = Array.from(this.selectedElements);
             }
             const content = this.createCleanContent();
             // Lógica de exportação direta (ex: usando html2pdf)
             if (message.format === 'pdf') {
                await this.generatePDFAdvanced(message.settings, content);
             } // Adicionar outros formatos aqui
             this.elements = originalElements;
             sendResponse({ success: true });
             break;
          }
          case 'previewDocument': {
             const originalElements = this.elements;
             if (this.selectedElements.size > 0) {
                this.elements = Array.from(this.selectedElements);
             }
             const content = this.createCleanContent();
             browser.runtime.sendMessage({
                action: 'openEditor',
                data: { content, images: this.images, hostname: window.location.hostname }
             });
             this.elements = originalElements;
             sendResponse({ success: true });
             break;
          }
          default:
            sendResponse({ success: false, error: `Ação não reconhecida: ${message.action}` });
        }
      } catch (error) {
        console.error(`Erro ao processar ação ${message.action}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Erro desconhecido no content script'
        });
      }
      return true; // Manter canal aberto para respostas assíncronas
    });
  }

  async setup() {
    // Adiciona estilos apenas uma vez
    if (!document.getElementById('pdf-exporter-styles')) {
      const style = document.createElement('style');
      style.id = 'pdf-exporter-styles';
      style.textContent = `
        .pdf-exporter-selectable {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px dashed transparent;
        }
        .pdf-exporter-selectable:hover {
          border: 2px dashed #3b82f6;
          background-color: rgba(59, 130, 246, 0.05);
        }
        .pdf-exporter-selected {
          border: 2px solid #10b981 !important;
          background-color: rgba(16, 185, 129, 0.1) !important;
        }
        .pdf-exporter-checkbox {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 20px;
          height: 20px;
          background-color: #fff;
          border: 2px solid #9ca3af;
          border-radius: 4px;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pdf-exporter-selected .pdf-exporter-checkbox {
          background-color: #10b981;
          border-color: #059669;
        }
        .pdf-exporter-selected .pdf-exporter-checkbox::after {
          content: '✔';
          color: white;
          font-size: 14px;
        }
        .pdf-exporter-sidebar {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          z-index: 10000;
          width: 320px;
          top: 20px;
          right: 20px;
          position: fixed;
          padding: 16px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background-color: #fff;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pdf-exporter-sidebar .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .pdf-exporter-sidebar h3 {
          color: #111827;
          font-size: 18px;
          margin: 0;
          font-weight: 600;
        }
        .pdf-exporter-sidebar #close-sidebar-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #9ca3af;
            padding: 0;
            line-height: 1;
        }
        .pdf-exporter-sidebar p {
          color: #4b5563;
          font-size: 14px;
          margin: 0;
        }
        .pdf-exporter-sidebar .sidebar-stats {
            background-color: #f3f4f6;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            color: #374151;
        }
        .pdf-exporter-sidebar .sidebar-actions {
            display: flex;
            gap: 8px;
        }
        .pdf-exporter-sidebar button {
          flex-grow: 1;
          background-color: #f9fafb;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .pdf-exporter-sidebar button:hover {
          background-color: #f3f4f6;
        }
        .pdf-exporter-sidebar .sidebar-export button {
            width: 100%;
            background-color: #2563eb;
            color: white;
            font-weight: 500;
            border: none;
        }
        .pdf-exporter-sidebar .sidebar-export button:hover {
            background-color: #1d4ed8;
        }
        .pdf-exporter-sidebar .sidebar-export button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Inicializa o exportador
const aiExporter = new AdvancedAIChatPDFExporter();

// Adiciona função global para acesso do sidebar
window.aiExporter = aiExporter;

console.log('AI Content Processor carregado com sucesso');

document.addEventListener('DOMContentLoaded', () => {
  aiExporter.setup();
});
