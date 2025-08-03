// AI Exporter Popup Script - Enhanced with Editor
class AIExporterPopup {
  constructor() {
    this.currentTab = null;
    this.isSupported = false;
    this.init();
  }

  async init() {
    console.log('🦊 AI Exporter Popup iniciado no Firefox');

    await this.checkCurrentSite();
    this.setupEventListeners();
    this.updateUI();
  }

  async checkCurrentSite() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];

      if (!this.currentTab) {
        this.updateSiteStatus(false, 'Nenhuma aba ativa', 'Não foi possível detectar a aba atual');
        return;
      }

      const supportedSites = [
        'chatgpt.com',
        'claude.ai',
        'gemini.google.com',
        'chat.deepseek.com',
        'grok.x.ai',
        'perplexity.ai',
        'aistudio.google.com',
        'poe.com',
        'you.com',
        'copilot.microsoft.com',
        'character.ai'
      ];

      this.isSupported = supportedSites.some(site =>
        this.currentTab.url?.includes(site)
      );

      if (this.isSupported) {
        const siteName = this.getSiteName(this.currentTab.url);
        this.updateSiteStatus(true, `✅ ${siteName} Suportado`, 'Pronto para exportar conversas');
      } else {
        this.updateSiteStatus(false, '❌ Site Não Suportado', 'Este site não está na lista de sites de IA suportados');
      }

    } catch (error) {
      console.error('Erro ao verificar site:', error);
      this.updateSiteStatus(false, 'Erro', 'Não foi possível verificar o site atual');
    }
  }

  getSiteName(url) {
    if (url.includes('chatgpt.com')) return 'ChatGPT';
    if (url.includes('claude.ai')) return 'Claude';
    if (url.includes('gemini.google.com')) return 'Gemini';
    if (url.includes('chat.deepseek.com')) return 'DeepSeek';
    if (url.includes('grok.x.ai')) return 'Grok';
    if (url.includes('perplexity.ai')) return 'Perplexity';
    if (url.includes('aistudio.google.com')) return 'AI Studio';
    if (url.includes('poe.com')) return 'Poe';
    if (url.includes('you.com')) return 'You.com';
    if (url.includes('copilot.microsoft.com')) return 'Copilot';
    return 'Site Desconhecido';
  }

  updateSiteStatus(supported, title, details) {
    const statusElement = document.getElementById('siteStatus');
    const iconElement = document.getElementById('statusIcon');
    const textElement = document.getElementById('statusText');
    const detailsElement = document.getElementById('statusDetails');

    if (supported) {
      statusElement.className = 'site-status supported';
      iconElement.textContent = '✅';
    } else {
      statusElement.className = 'site-status unsupported';
      iconElement.textContent = '❌';
    }

    textElement.textContent = title;
    detailsElement.textContent = details;
  }

  setupEventListeners() {
    // Botões de exportação
    document.getElementById('exportPdf')?.addEventListener('click', () => this.exportContent('pdf'));
    document.getElementById('exportPng')?.addEventListener('click', () => this.exportContent('png'));
    document.getElementById('exportMd')?.addEventListener('click', () => this.exportContent('markdown'));
    document.getElementById('exportTxt')?.addEventListener('click', () => this.exportContent('txt'));

    // Recursos especiais
    document.getElementById('areaSelection')?.addEventListener('click', () => this.startAreaSelection());
    document.getElementById('withEditor')?.addEventListener('click', () => this.exportWithEditor());
    document.getElementById('openSidebar')?.addEventListener('click', () => this.openSidebar());

    // Footer buttons
    document.getElementById('historyBtn')?.addEventListener('click', () => this.showHistory());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
    document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());
  }

  updateUI() {
    const exportButtons = document.querySelectorAll('.export-btn');
    const featureButtons = document.querySelectorAll('.feature-btn');

    exportButtons.forEach(btn => {
      btn.disabled = !this.isSupported;
      if (!this.isSupported) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });

    featureButtons.forEach(btn => {
      btn.disabled = !this.isSupported;
      if (!this.isSupported) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  }

  async exportContent(format) {
    if (!this.isSupported) {
      this.showNotification('Site não suportado', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await browser.tabs.sendMessage(this.currentTab.id, {
        action: 'exportContent',
        format: format,
        withEditor: false
      });

      if (response?.success) {
        this.showNotification(`Conteúdo exportado como ${format.toUpperCase()}`, 'success');
        this.updateExportStats();
      } else {
        throw new Error(response?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      this.showNotification(`Erro ao exportar: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async exportWithEditor() {
    if (!this.isSupported) {
      this.showNotification('Site não suportado', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Primeiro, extrair o conteúdo
      const response = await browser.tabs.sendMessage(this.currentTab.id, {
        action: 'extractContent',
        includeFormatting: true
      });

      if (response?.success && response.content) {
        // Abrir editor com o conteúdo
        await this.openEditor(response.content, response.metadata);
      } else {
        throw new Error(response?.error || 'Não foi possível extrair o conteúdo');
      }
    } catch (error) {
      console.error('Erro ao abrir editor:', error);
      this.showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async openEditor(content, metadata) {
    // Criar URL para a página do editor
    const editorUrl = browser.runtime.getURL('dist/editor/index.html');

    // Salvar conteúdo temporariamente no storage
    const tempData = {
      content: content,
      metadata: metadata,
      timestamp: Date.now()
    };

    await browser.storage.local.set({
      tempEditorData: tempData
    });

    // Abrir editor em nova aba
    await browser.tabs.create({
      url: editorUrl,
      active: true
    });

    // Fechar popup
    window.close();
  }

  async startAreaSelection() {
    if (!this.isSupported) {
      this.showNotification('Site não suportado', 'error');
      return;
    }

    try {
      await browser.tabs.sendMessage(this.currentTab.id, {
        action: 'startAreaSelection'
      });

      this.showNotification('Clique e arraste para selecionar a área', 'info');
      window.close();
    } catch (error) {
      console.error('Erro ao iniciar seleção de área:', error);
      this.showNotification('Erro ao iniciar seleção de área', 'error');
    }
  }

  async openSidebar() {
    try {
      await browser.sidebarAction.open();
      window.close();
    } catch (error) {
      console.error('Erro ao abrir sidebar:', error);
      this.showNotification('Sidebar não disponível', 'error');
    }
  }

  async showHistory() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'get-export-history'
      });

      if (response?.success && response.history) {
        this.displayHistory(response.history);
      } else {
        this.showNotification('Histórico vazio', 'info');
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      this.showNotification('Erro ao carregar histórico', 'error');
    }
  }

  displayHistory(history) {
    const content = document.querySelector('.content');

    // Criar overlay do histórico
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const historyPanel = document.createElement('div');
    historyPanel.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-height: 80%;
      overflow-y: auto;
      width: 100%;
      max-width: 400px;
    `;

    let historyHTML = '<h3>📊 Histórico de Exportações</h3>';

    if (history.length === 0) {
      historyHTML += '<p>Nenhuma exportação realizada ainda.</p>';
    } else {
      historyHTML += '<div style="max-height: 300px; overflow-y: auto;">';
      history.slice(0, 10).forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('pt-BR');
        historyHTML += `
          <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <strong>${item.format?.toUpperCase() || 'N/A'}</strong>
            <br><small>${date}</small>
            <br><small>${item.title || item.url || 'Sem título'}</small>
          </div>
        `;
      });
      historyHTML += '</div>';
    }

    historyHTML += '<button id="closeHistory" style="margin-top: 15px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Fechar</button>';

    historyPanel.innerHTML = historyHTML;
    overlay.appendChild(historyPanel);
    document.body.appendChild(overlay);

    // Fechar histórico
    document.getElementById('closeHistory').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  async openSettings() {
    await browser.runtime.openOptionsPage();
    window.close();
  }

  showHelp() {
    const helpText = `
🤖 AI Exporter - Ajuda

📄 Exportação:
• PDF - Formato ideal para arquivamento
• Imagem - Para compartilhamento visual
• Markdown - Para desenvolvedores
• Texto - Formato universal

🚀 Recursos Especiais:
• Seleção de Área - Escolha exatamente o que exportar
• Editor - Edite antes de salvar
• Sidebar - Acesso rápido (específico do Firefox)

⌨️ Atalhos de Teclado:
• Ctrl+Shift+E - Exportação rápida
• Ctrl+Shift+A - Seleção de área
• Ctrl+Shift+S - Toggle sidebar

🦊 Otimizado para Firefox com recursos exclusivos!
    `;

    alert(helpText);
  }

  async updateExportStats() {
    try {
      await browser.runtime.sendMessage({
        action: 'update-export-stats'
      });
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const contentElement = document.querySelector('.content');

    if (show) {
      loadingElement.style.display = 'block';
      contentElement.style.opacity = '0.5';
    } else {
      loadingElement.style.display = 'none';
      contentElement.style.opacity = '1';
    }
  }

  showNotification(message, type = 'info') {
    // Usar notification do browser se disponível
    if (browser.notifications) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('dist/assets/icon/48.png'),
        title: 'AI Exporter',
        message: message
      });
    } else {
      // Fallback para alert
      alert(`AI Exporter: ${message}`);
    }
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new AIExporterPopup();
});

// Log de inicialização
console.log('🦊 AI Exporter Popup carregado para Firefox');
