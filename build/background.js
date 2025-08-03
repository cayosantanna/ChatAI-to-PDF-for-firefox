// Background script para gerenciar mensagens da extensão
// Corrigido para funcionar com popup

// Escuta mensagens do popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureContent') {
    // Obtém a aba ativa
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tab = tabs[0];
        const url = new URL(tab.url);
        const hostname = url.hostname;
        
        // Verifica se é um site suportado
        const supportedDomains = [
          'claude.ai',
          'chatgpt.com', 
          'grok.com',
          'gemini.google.com',
          'www.notion.so',
          'notion.so'
        ];
        
        if (supportedDomains.some(domain => hostname.includes(domain))) {
          // Envia mensagem para o content script
          browser.tabs.sendMessage(tab.id, {
            action: 'exportToPDF',
            hostname: hostname,
            mode: message.mode || 'smart'
          }).then(() => {
            sendResponse({ success: true, hostname: hostname });
          }).catch((error) => {
            console.error('Erro ao enviar mensagem para content script:', error);
            sendResponse({ success: false, error: error.message });
          });
        } else {
          sendResponse({ 
            success: false, 
            error: `Site ${hostname} não é suportado`,
            supportedSites: supportedDomains
          });
        }
      } else {
        sendResponse({ success: false, error: 'Nenhuma aba ativa encontrada' });
      }
    });
    
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === 'openEditor') {
    // Abre o editor em nova aba
    browser.tabs.create({
      url: browser.runtime.getURL('editor.html')
    });
    sendResponse({ success: true });
  }
  
  if (message.action === 'openOptions') {
    // Abre as configurações
    browser.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
});

// Escuta comandos de teclado
browser.commands.onCommand.addListener((command) => {
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      switch (command) {
        case 'quick-capture':
          browser.tabs.sendMessage(tabs[0].id, {
            action: 'exportToPDF',
            mode: 'smart'
          });
          break;
        case 'open-editor':
          browser.tabs.create({
            url: browser.runtime.getURL('editor.html')
          });
          break;
        case 'toggle-sidebar':
          browser.tabs.sendMessage(tabs[0].id, {
            action: 'toggleSidebar'
          });
          break;
      }
    }
  });
});

// Detecta instalação da extensão
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Configurações padrão na primeira instalação
    browser.storage.local.set({
      aiContentSettings: {
        uiTheme: 'auto',
        language: 'pt-BR',
        showNotifications: true,
        autoDetectContent: true,
        defaultCaptureMode: 'smart'
      }
    });
    
    // Abre página de boas-vindas
    browser.tabs.create({
      url: browser.runtime.getURL('options.html?section=general')
    });
  }
});
