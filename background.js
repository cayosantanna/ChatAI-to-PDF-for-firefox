// Background script para gerenciar cliques no ícone da extensão
browser.browserAction.onClicked.addListener((tab) => {
  // Verifica se a aba atual é uma das plataformas suportadas
  const supportedDomains = [
    'claude.ai',
    'chatgpt.com', 
    'grok.com',
    'gemini.google.com',
    'www.notion.so'
  ];
  
  const url = new URL(tab.url);
  const hostname = url.hostname;
  
  if (supportedDomains.includes(hostname)) {
    // Envia mensagem para o content script executar a exportação
    browser.tabs.sendMessage(tab.id, {
      action: 'exportToPDF',
      hostname: hostname
    });
  } else {
    // Mostra notificação se o site não for suportado
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon_48.png',
      title: 'AI Chat PDF Exporter',
      message: `${hostname} não é suportado. Sites suportados: Claude.ai, ChatGPT.com, Grok.com, Gemini.google.com, Notion.so`
    });
  }
});
