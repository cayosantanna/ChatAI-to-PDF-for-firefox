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
        if (message.action === 'exportToPDF' || message.action === 'quickCapture') {
          console.log('Iniciando captura de conteúdo...', message);
          await this.exportToPDF(message.hostname || window.location.hostname, message.mode || 'smart');
          sendResponse({ success: true, message: 'Conteúdo capturado com sucesso' });
        } else if (message.action === 'advancedCapture') {
          console.log('Iniciando captura avançada...', message);
          await this.showSelectionInterface();
          sendResponse({ success: true, message: 'Interface de seleção ativada' });
        } else if (message.action === 'toggleSidebar') {
          this.toggleSelectionSidebar();
          sendResponse({ success: true });
        } else if (message.action === 'getPageInfo') {
          const info = await this.getPageInfo();
          sendResponse({ success: true, data: info });
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
      }
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
      }
      .pdf-exporter-checkbox.checked {
        background: #10b981;
        border-color: #10b981;
      }
      .pdf-exporter-checkbox.checked::after {
        content: '✓';
        color: white;
        font-size: 14px;
        position: absolute;
        top: -2px;
        left: 3px;
      }
      .pdf-exporter-toolbar {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 250px;
        display: none;
      }
      .pdf-exporter-toolbar button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        margin: 4px 2px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .pdf-exporter-toolbar button:hover {
        background: #2563eb;
      }
      .pdf-exporter-toolbar button.secondary {
        background: #6b7280;
      }
      .pdf-exporter-toolbar button.secondary:hover {
        background: #4b5563;
      }
    `;
    document.head.appendChild(style);
  }

  getElementsForSite(hostname) {
    this.elements = [];
    this.csp = false;

    switch (hostname) {
      case 'claude.ai':
        // Mensagens individuais
        const claudeMessages = document.querySelectorAll('div[data-test-render-count]');
        claudeMessages.forEach(msg => {
          if (msg && msg.parentElement) this.elements.push(msg.parentElement);
        });
        
        // Artifacts
        const claudeArtifacts = document.querySelector('div.ease-out.w-full[class*="overflow-"]');
        if (claudeArtifacts) this.elements.push(claudeArtifacts);
        break;

      case 'chatgpt.com':
        // Mensagens individuais
        const chatgptMessages = document.querySelectorAll('article');
        chatgptMessages.forEach(msg => {
          if (msg && msg.parentElement) this.elements.push(msg.parentElement);
        });
        
        // Canvas
        const chatgptCanvas = document.querySelector('section.popover>main');
        if (chatgptCanvas) this.elements.push(chatgptCanvas);
        
        this.csp = true;
        break;

      case 'grok.com':
        // Mensagens individuais
        const grokMessages = document.querySelectorAll('div[class*="message"]');
        grokMessages.forEach(msg => this.elements.push(msg));
        
        // Thoughts
        const grokThoughts = document.querySelector('aside');
        if (grokThoughts) this.elements.push(grokThoughts);
        break;

      case 'gemini.google.com':
        // Mensagens individuais  
        const geminiMessages = document.querySelectorAll('message-content');
        geminiMessages.forEach(msg => this.elements.push(msg));
        
        // Extended responses
        const geminiExtended = document.querySelector('extended-response-panel response-container');
        if (geminiExtended) this.elements.push(geminiExtended);
        
        this.csp = true;
        break;

      case 'www.notion.so':
        // Blocos de conteúdo do Notion
        const notionBlocks = document.querySelectorAll('[data-block-id]');
        notionBlocks.forEach(block => this.elements.push(block));
        
        // Página principal
        const notionPage = document.querySelector('[role="main"]');
        if (notionPage) this.elements.push(notionPage);
        break;

      default:
        console.error(`${hostname} não é suportado`);
        return false;
    }

    console.debug(`Elementos encontrados em ${hostname}:`, this.elements);
    this.elements = this.elements.filter(n => n);
    return this.elements.length > 0;
  }

  showSelectionInterface() {
    // Remove interface anterior se existir
    const existingToolbar = document.getElementById('pdf-exporter-toolbar');
    if (existingToolbar) existingToolbar.remove();

    // Adiciona checkboxes aos elementos
    this.elements.forEach((element, index) => {
      element.classList.add('pdf-exporter-selectable');
      element.dataset.pdfExporterIndex = index;
      
      const checkbox = document.createElement('div');
      checkbox.className = 'pdf-exporter-checkbox';
      checkbox.dataset.index = index;
      
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleElementSelection(index, checkbox);
      });
      
      element.appendChild(checkbox);
      
      // Adiciona click no elemento
      element.addEventListener('click', (e) => {
        if (!e.target.classList.contains('pdf-exporter-checkbox')) {
          this.toggleElementSelection(index, checkbox);
        }
      });
    });

    // Cria toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'pdf-exporter-toolbar';
    toolbar.className = 'pdf-exporter-toolbar';
    toolbar.style.display = 'block';
    
    toolbar.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937;">Exportar para PDF</h3>
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">Clique nos elementos para selecioná-los</p>
      
      <div style="margin-bottom: 15px;">
        <button id="select-all-btn">Selecionar Tudo</button>
        <button id="select-none-btn" class="secondary">Desmarcar Tudo</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-size: 14px;">
          <input type="checkbox" id="include-images-cb" checked> Incluir imagens
        </label>
        <label style="display: block; margin-bottom: 5px; font-size: 14px;">
          <input type="checkbox" id="remove-headers-cb" checked> Remover cabeçalhos/rodapés
        </label>
      </div>
      
      <div style="margin-bottom: 15px;">
        <button id="open-editor-btn" style="background: #10b981;">Abrir Editor</button>
        <button id="direct-export-btn">Exportar Direto</button>
      </div>
      
      <button id="cancel-btn" class="secondary">Cancelar</button>
    `;

    document.body.appendChild(toolbar);

    // Event listeners para toolbar
    document.getElementById('select-all-btn').addEventListener('click', () => this.selectAllElements());
    document.getElementById('select-none-btn').addEventListener('click', () => this.selectNoElements());
    document.getElementById('open-editor-btn').addEventListener('click', () => this.openEditor());
    document.getElementById('direct-export-btn').addEventListener('click', () => this.directExport());
    document.getElementById('cancel-btn').addEventListener('click', () => this.hideSelectionInterface());
  }

  toggleElementSelection(index, checkbox) {
    if (this.selectedElements.has(index)) {
      this.selectedElements.delete(index);
      checkbox.classList.remove('checked');
      this.elements[index].classList.remove('pdf-exporter-selected');
    } else {
      this.selectedElements.add(index);
      checkbox.classList.add('checked');
      this.elements[index].classList.add('pdf-exporter-selected');
    }
  }

  selectAllElements() {
    this.elements.forEach((element, index) => {
      this.selectedElements.add(index);
      const checkbox = element.querySelector('.pdf-exporter-checkbox');
      if (checkbox) {
        checkbox.classList.add('checked');
        element.classList.add('pdf-exporter-selected');
      }
    });
  }

  selectNoElements() {
    this.selectedElements.clear();
    this.elements.forEach((element, index) => {
      const checkbox = element.querySelector('.pdf-exporter-checkbox');
      if (checkbox) {
        checkbox.classList.remove('checked');
        element.classList.remove('pdf-exporter-selected');
      }
    });
  }

  hideSelectionInterface() {
    // Remove checkboxes e classes
    this.elements.forEach(element => {
      element.classList.remove('pdf-exporter-selectable', 'pdf-exporter-selected');
      const checkbox = element.querySelector('.pdf-exporter-checkbox');
      if (checkbox) checkbox.remove();
      
      // Remove event listeners clonando elemento
      const newElement = element.cloneNode(true);
      element.parentNode.replaceChild(newElement, element);
    });

    // Remove toolbar
    const toolbar = document.getElementById('pdf-exporter-toolbar');
    if (toolbar) toolbar.remove();

    this.selectedElements.clear();
  }

  async extractImages() {
    this.images = [];
    const selectedElementsList = Array.from(this.selectedElements).map(i => this.elements[i]);
    
    for (const element of selectedElementsList) {
      const imgs = element.querySelectorAll('img');
      for (const img of imgs) {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          
          this.images.push({
            src: img.src,
            dataUrl: dataUrl,
            alt: img.alt || '',
            width: img.width,
            height: img.height
          });
        } catch (error) {
          console.warn('Não foi possível extrair imagem:', img.src, error);
        }
      }
    }
  }

  cleanContent(content) {
    const includeImages = document.getElementById('include-images-cb')?.checked ?? true;
    const removeHeaders = document.getElementById('remove-headers-cb')?.checked ?? true;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    if (removeHeaders) {
      // Remove elementos comuns de cabeçalho/rodapé
      const selectorsToRemove = [
        'header', 'footer', 'nav', '.header', '.footer', '.navigation',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.sidebar', '.menu', '.toolbar', '.breadcrumb'
      ];
      
      selectorsToRemove.forEach(selector => {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    }
    
    if (!includeImages) {
      const imgs = tempDiv.querySelectorAll('img');
      imgs.forEach(img => img.remove());
    }
    
    return tempDiv.innerHTML;
  }

  async openEditor() {
    if (this.selectedElements.size === 0) {
      alert('Selecione pelo menos um elemento para editar');
      return;
    }

    const includeImages = document.getElementById('include-images-cb')?.checked ?? true;
    
    if (includeImages) {
      await this.extractImages();
    }

    // Coleta conteúdo dos elementos selecionados
    const selectedElementsList = Array.from(this.selectedElements)
      .sort((a, b) => a - b)
      .map(i => this.elements[i]);
    
    let combinedContent = '';
    selectedElementsList.forEach(element => {
      const content = this.cleanContent(element.outerHTML);
      combinedContent += content + '\n\n';
    });

    // Abre editor em nova aba
    const editorUrl = browser.runtime.getURL('editor.html');
    const editorTab = window.open(editorUrl, '_blank', 'width=1200,height=800');
    
    // Envia dados para o editor
    setTimeout(() => {
      editorTab.postMessage({
        type: 'LOAD_CONTENT',
        content: combinedContent,
        images: this.images,
        hostname: location.hostname
      }, '*');
    }, 1000);

    this.hideSelectionInterface();
  }

  async directExport() {
    if (this.selectedElements.size === 0) {
      alert('Selecione pelo menos um elemento para exportar');
      return;
    }

    const includeImages = document.getElementById('include-images-cb')?.checked ?? true;
    
    if (includeImages) {
      await this.extractImages();
    }

    // Para sites com CSP restrito, usa impressão nativa
    if (this.csp) {
      this.exportSelectedWithPrint();
    } else {
      this.exportSelectedWithHtml2Pdf();
    }
    
    this.hideSelectionInterface();
  }

  exportSelectedWithPrint() {
    const selectedElementsList = Array.from(this.selectedElements)
      .sort((a, b) => a - b)
      .map(i => this.elements[i]);

    const temp = document.createElement('div');
    temp.id = 'pdf-export-' + Math.random().toString(36).slice(2, 9);
    
    selectedElementsList.forEach(element => {
      const cleanedContent = this.cleanContent(element.outerHTML);
      const div = document.createElement('div');
      div.innerHTML = cleanedContent;
      temp.appendChild(div);
    });

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body > * {
          display: none !important;
        }
        #${temp.id} {
          display: block !important;
        }
        #${temp.id} img {
          max-width: 100%;
          height: auto;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(temp);
    
    window.print();
    
    setTimeout(() => {
      if (document.head.contains(style)) document.head.removeChild(style);
      if (document.body.contains(temp)) document.body.removeChild(temp);
    }, 1000);
  }

  exportSelectedWithHtml2Pdf() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.3/html2pdf.bundle.min.js';
    
    script.onload = () => {
      const selectedElementsList = Array.from(this.selectedElements)
        .sort((a, b) => a - b)
        .map(i => this.elements[i]);

      const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      
      const temp = document.createElement('div');
      selectedElementsList.forEach(element => {
        const cleanedContent = this.cleanContent(element.outerHTML);
        const div = document.createElement('div');
        div.innerHTML = cleanedContent;
        div.style.marginBottom = '20px';
        temp.appendChild(div);
      });

      html2pdf().set({
        margin: 15,
        filename: `ai-chat-selected-${ts}.pdf`,
        html2canvas: { 
          scale: 2, 
          logging: false,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      }).from(temp).save();
    };
    
    script.onerror = () => {
      alert('Erro ao carregar biblioteca html2pdf.js. Usando método de impressão alternativo.');
      this.exportSelectedWithPrint();
    };
    
    document.body.appendChild(script);
  }

  async exportToPDF(hostname) {
    if (!this.getElementsForSite(hostname)) {
      alert(`Nenhum elemento encontrado para exportar em ${hostname}`);
      return;
    }

    // Mostra interface de seleção
    this.showSelectionInterface();
  }
}

// Inicializa o exportador quando a página carrega
const advancedPdfExporter = new AdvancedAIChatPDFExporter();
