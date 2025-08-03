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
