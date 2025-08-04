// Background script para gerenciar mensagens da extensão

// Escuta mensagens do popup e content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background recebeu mensagem:', message.action);

  switch (message.action) {
    case 'captureContent':
      handleCaptureContent(message, sendResponse);
      return true; // Manter canal aberto para resposta assíncrona

    case 'openEditor':
      handleOpenEditor(message.data);
      sendResponse({ success: true });
      break;

    case 'openOptions':
      browser.runtime.openOptionsPage().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getSettings':
      browser.storage.local.get(null).then(settings => {
        sendResponse({ success: true, data: settings });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Ação não reconhecida: ' + message.action });
  }
});

async function handleCaptureContent(message, sendResponse) {
    try {
        // Obtém a aba ativa
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
            throw new Error('Nenhuma aba ativa encontrada');
        }

        const tab = tabs[0];
        const hostname = new URL(tab.url).hostname;
        
        console.log('Processando captura para:', hostname);
        
        // Tenta enviar mensagem para o content script
        const response = await browser.tabs.sendMessage(tab.id, {
            action: 'quickCapture',
            hostname: hostname,
            mode: message.mode || 'smart'
        });

        console.log('Resposta do content script:', response);
        sendResponse({ 
            success: true, 
            hostname: hostname,
            ...response 
        });
    } catch (error) {
        console.error('Erro ao processar captura:', error);
        
        // Tenta injetar o content script se houve erro de comunicação
        if (error.message.includes('Could not establish connection')) {
            try {
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]) {
                    await browser.tabs.executeScript(tabs[0].id, { file: 'content.js' });
                    
                    // Aguarda um momento e tenta novamente
                    setTimeout(async () => {
                        try {
                            const response = await browser.tabs.sendMessage(tabs[0].id, {
                                action: 'quickCapture',
                                hostname: new URL(tabs[0].url).hostname,
                                mode: message.mode || 'smart'
                            });
                            sendResponse({ success: true, ...response });
                        } catch (retryError) {
                            sendResponse({ 
                                success: false, 
                                error: 'Falha ao carregar content script: ' + retryError.message 
                            });
                        }
                    }, 1000);
                    return;
                }
            } catch (injectError) {
                console.error('Erro ao injetar content script:', injectError);
            }
        }
        
        sendResponse({ 
            success: false, 
            error: error.message || 'Erro desconhecido'
        });
    }
}

function handleOpenEditor(data) {
    browser.tabs.create({
      url: browser.runtime.getURL('editor.html')
    }).then(newTab => {
        // Aguarda a aba carregar para enviar os dados
        if (data) {
            browser.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === newTab.id && info.status === 'complete') {
                    browser.tabs.sendMessage(tabId, {
                        action: 'loadContent',
                        data: data
                    }).catch(err => console.error('Erro ao enviar dados para editor:', err));
                    // Remove o listener para não ser chamado novamente
                    browser.tabs.onUpdated.removeListener(listener);
                }
            });
        }
    }).catch(error => {
        console.error('Erro ao abrir editor:', error);
    });
}

// Escuta comandos de teclado
browser.commands.onCommand.addListener((command) => {
  console.log('Comando de teclado recebido:', command);
  
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      switch (command) {
        case 'quick-capture':
          browser.tabs.sendMessage(tabId, {
            action: 'quickCapture',
            mode: 'smart',
            hostname: new URL(tabs[0].url).hostname
          }).catch(err => console.error("Erro no atalho de captura:", err));
          break;
        case 'open-editor':
          handleOpenEditor();
          break;
        case 'toggle-sidebar':
          browser.tabs.sendMessage(tabId, {
            action: 'toggleSidebar'
          }).catch(err => console.error("Erro no atalho de sidebar:", err));
          break;
      }
    }
  }).catch(error => console.error('Erro ao consultar abas:', error));
});

// Detecta instalação da extensão
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extensão instalada/atualizada:', details.reason);
  
  if (details.reason === 'install') {
    // Abre a página de opções na primeira instalação
    browser.runtime.openOptionsPage();
  }
});

// Adiciona menu de contexto
browser.contextMenus.create({
    id: "ai-processor-capture",
    title: "Capturar com AI Processor",
    contexts: ["page", "selection"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ai-processor-capture") {
        browser.tabs.sendMessage(tab.id, {
            action: 'advancedCapture'
        }).catch(err => {
            console.error("Erro no menu de contexto:", err);
            // Tenta injetar content script se não estiver carregado
            browser.tabs.executeScript(tab.id, { file: 'content.js' }).then(() => {
                setTimeout(() => {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'advancedCapture'
                    });
                }, 500);
            });
        });
    }
});

console.log('Background script carregado com sucesso');


async function handleCaptureContent(tab, message, sendResponse) {
    try {
        const response = await browser.tabs.sendMessage(tab.id, {
            action: 'quickCapture',
            hostname: new URL(tab.url).hostname,
            mode: message.mode || 'smart'
        });
        sendResponse({ success: true, ...response });
    } catch (error) {
        console.error('Erro ao comunicar com content script:', error);
        let errorMessage = error.message.includes('Could not establish connection')
            ? 'Content script não carregado. Recarregue a página.'
            : error.message;
        sendResponse({ success: false, error: errorMessage });
    }
}

function handleOpenEditor(data) {
    browser.tabs.create({
      url: browser.runtime.getURL('editor.html')
    }).then(newTab => {
        // Aguarda a aba carregar para enviar os dados
        browser.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === newTab.id && info.status === 'complete') {
                browser.tabs.sendMessage(tabId, {
                    action: 'loadContent',
                    data: data
                });
                // Remove o listener para não ser chamado novamente
                browser.tabs.onUpdated.removeListener(listener);
            }
        });
    });
}

// Escuta comandos de teclado
browser.commands.onCommand.addListener((command) => {
  console.log('Comando de teclado recebido:', command);
  
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      switch (command) {
        case 'quick-capture-command':
          browser.tabs.sendMessage(tabId, {
            action: 'quickCapture',
            mode: 'smart',
            hostname: new URL(tabs[0].url).hostname
          }).catch(err => console.error("Erro no atalho de captura:", err));
          break;
        case 'advanced-capture-command':
          browser.tabs.sendMessage(tabId, {
            action: 'advancedCapture'
          }).catch(err => console.error("Erro no atalho de captura avançada:", err));
          break;
      }
    }
  });
});

// Detecta instalação da extensão
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extensão instalada/atualizada:', details.reason);
  
  if (details.reason === 'install') {
    // Abre a página de boas-vindas ou opções na primeira instalação
    browser.runtime.openOptionsPage();
  }
});

// Adiciona menu de contexto
browser.contextMenus.create({
    id: "ai-processor-capture",
    title: "Capturar com AI Processor",
    contexts: ["page", "selection"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ai-processor-capture") {
        browser.tabs.sendMessage(tab.id, {
            action: 'advancedCapture'
        }).catch(err => console.error("Erro no menu de contexto:", err));
    }
});

// Adiciona logging para debug
console.log('Background script carregado e pronto.');
