// AI Site Selectors - Firefox Optimized
// Seletores específicos para cada plataforma de IA

const AI_SITE_SELECTORS = {
  'chatgpt.com': {
    conversationContainer: '[data-testid="conversation-turn-3"]',
    messageElements: '[data-message-author-role]',
    exportButton: '.btn-primary',
    fallback: 'main'
  },
  
  'claude.ai': {
    conversationContainer: '.conversation',
    messageElements: '.message',
    exportButton: '.export-btn',
    fallback: 'main'
  },
  
  'gemini.google.com': {
    conversationContainer: '.conversation-container',
    messageElements: '.model-response, .user-input',
    exportButton: '.export-button',
    fallback: 'main'
  },
  
  'chat.deepseek.com': {
    conversationContainer: '.chat-container',
    messageElements: '.message-item',
    exportButton: '.export-btn',
    fallback: 'main'
  },
  
  'grok.x.ai': {
    conversationContainer: '.grok-conversation',
    messageElements: '.message-bubble',
    exportButton: '.export-action',
    fallback: 'main'
  },
  
  'perplexity.ai': {
    conversationContainer: '.search-results',
    messageElements: '.result-item',
    exportButton: '.export-btn',
    fallback: 'main'
  },
  
  'aistudio.google.com': {
    conversationContainer: '.studio-chat',
    messageElements: '.chat-message',
    exportButton: '.export-button',
    fallback: 'main'
  },
  
  'poe.com': {
    conversationContainer: '.chat-container',
    messageElements: '.message',
    exportButton: '.export-btn',
    fallback: 'main'
  },
  
  'you.com': {
    conversationContainer: '.conversation',
    messageElements: '.chat-message',
    exportButton: '.export-action',
    fallback: 'main'
  },
  
  'copilot.microsoft.com': {
    conversationContainer: '.conversation-main',
    messageElements: '.message-item',
    exportButton: '.export-btn',
    fallback: 'main'
  },
  
  'character.ai': {
    conversationContainer: '.conversation-container',
    messageElements: '.message-row',
    exportButton: '.export-button',
    fallback: 'main'
  }
};

// Função para obter seletores do site atual
function getCurrentSiteSelectors() {
  const hostname = window.location.hostname.replace('www.', '');
  return AI_SITE_SELECTORS[hostname] || {
    conversationContainer: 'main',
    messageElements: 'p, div[role="presentation"]',
    exportButton: '.export-btn',
    fallback: 'body'
  };
}

// Exportar para uso nos content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AI_SITE_SELECTORS, getCurrentSiteSelectors };
}
