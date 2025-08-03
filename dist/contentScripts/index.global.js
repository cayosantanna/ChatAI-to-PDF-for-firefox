// Content Script Global para AI Exporter - Firefox Optimized
// Arquivo central que unifica todos os content scripts

// Import dos módulos principais
;(() => {
  'use strict';

  // Verificar se já foi inicializado para evitar duplicatas
  if (window.aiExporterGlobal) {
    console.log('🦊 AI Exporter já inicializado nesta página');
    return;
  }

  window.aiExporterGlobal = true;

  console.log('🦊 AI Exporter Content Script Global iniciado');

  // Definir API compatível
  const api = typeof browser !== 'undefined' ? browser : chrome;

  // Estado global do content script
  const globalState = {
    isActive: false,
    currentSite: null,
    exportMode: null,
    selectionActive: false
  };

  // Detectar site AI atual
  function detectAISite() {
    const hostname = window.location.hostname;
    const sites = {
      'chatgpt.com': 'ChatGPT',
      'claude.ai': 'Claude',
      'gemini.google.com': 'Gemini',
      'chat.deepseek.com': 'DeepSeek',
      'grok.x.ai': 'Grok',
      'perplexity.ai': 'Perplexity',
      'aistudio.google.com': 'AI Studio',
      'poe.com': 'Poe',
      'you.com': 'You.com',
      'copilot.microsoft.com': 'Copilot',
      'character.ai': 'Character.ai'
    };

    for (const [domain, name] of Object.entries(sites)) {
      if (hostname.includes(domain)) {
        globalState.currentSite = name;
        return name;
      }
    }
    return null;
  }

  // Inicializar funcionalidades baseadas no site
  function initializeForSite(siteName) {
    console.log(`🎯 Inicializando AI Exporter para ${siteName}`);

    // Adicionar indicador visual discreto
    addSiteIndicator(siteName);

    // Configurar listeners específicos do site
    setupSiteSpecificListeners(siteName);

    // Notificar background script
    api.runtime.sendMessage({
      type: 'SITE_DETECTED',
      site: siteName,
      url: window.location.href
    }).catch(() => {
      // Background script pode não estar pronto ainda
    });
  }

  // Adicionar indicador visual
  function addSiteIndicator(siteName) {
    // Remover indicador anterior se existir
    const existing = document.getElementById('ai-exporter-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'ai-exporter-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #ff7139, #ff4500);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(255, 113, 57, 0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: -moz-system-font, system-ui, sans-serif;
      ">
        🦊 AI Exporter Ready - ${siteName}
      </div>
    `;

    document.body.appendChild(indicator);

    // Mostrar por 3 segundos
    setTimeout(() => {
      indicator.firstElementChild.style.opacity = '1';
    }, 100);

    setTimeout(() => {
      indicator.firstElementChild.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  }

  // Configurar listeners específicos
  function setupSiteSpecificListeners(siteName) {
    // Listener para comandos do background
    api.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'EXPORT_REQUEST':
          handleExportRequest(message.format);
          break;

        case 'START_AREA_SELECTION':
          startAreaSelection();
          break;

        case 'PING':
          sendResponse({ site: siteName, ready: true });
          break;

        default:
          console.log('🦊 Mensagem não reconhecida:', message.type);
      }
    });

    // Listener para atalhos de teclado
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.code) {
          case 'KeyE':
            e.preventDefault();
            handleExportRequest('pdf');
            break;
          case 'KeyA':
            e.preventDefault();
            startAreaSelection();
            break;
        }
      }
    });
  }

  // Manipular requisição de exportação
  function handleExportRequest(format) {
    console.log(`📤 Exportando ${globalState.currentSite} como ${format}`);

    // Extrair conteúdo baseado no site
    const content = extractContent();

    if (content) {
      // Enviar para background script
      api.runtime.sendMessage({
        type: 'EXPORT_CONTENT',
        content: content,
        format: format,
        site: globalState.currentSite,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });

      showExportNotification(format);
    } else {
      showErrorNotification('Não foi possível extrair conteúdo desta página');
    }
  }

  // Extrair conteúdo da página
  function extractContent() {
    const siteName = globalState.currentSite;

    // Seletores específicos por site
    const selectors = {
      'ChatGPT': '[data-message-author-role], .markdown',
      'Claude': '[data-is-streaming], .prose',
      'Gemini': '.model-response-text, .user-input',
      'DeepSeek': '.message-content, .chat-message',
      'Grok': '.tweet-text, .response-text',
      'Perplexity': '.prose, .answer-content',
      'AI Studio': '.model-response, .prompt-text',
      'Poe': '.Message_botMessageBubble, .Message_humanMessageBubble',
      'You.com': '.ai-response, .user-query',
      'Copilot': '.response-message, .user-message',
      'Character.ai': '.msg, .response'
    };

    const selector = selectors[siteName];
    if (!selector) {
      // Fallback genérico
      return {
        title: document.title,
        text: document.body.innerText.slice(0, 5000),
        html: document.body.innerHTML.slice(0, 10000)
      };
    }

    const elements = document.querySelectorAll(selector);
    const messages = Array.from(elements).map(el => ({
      text: el.innerText.trim(),
      html: el.innerHTML
    })).filter(msg => msg.text.length > 0);

    return {
      title: document.title,
      site: siteName,
      messages: messages,
      fullText: messages.map(m => m.text).join('\n\n'),
      timestamp: new Date().toISOString()
    };
  }

  // Iniciar seleção de área
  function startAreaSelection() {
    if (globalState.selectionActive) return;

    console.log('🎯 Iniciando seleção de área');
    globalState.selectionActive = true;

    // Criar overlay de seleção
    const overlay = document.createElement('div');
    overlay.id = 'ai-exporter-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 113, 57, 0.1);
      z-index: 999999;
      cursor: crosshair;
      backdrop-filter: blur(1px);
    `;

    // Adicionar instruções
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff7139;
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(255, 113, 57, 0.3);
      font-family: -moz-system-font, system-ui, sans-serif;
    `;
    instructions.textContent = '🖱️ Clique e arraste para selecionar área • ESC para cancelar';

    document.body.appendChild(overlay);
    document.body.appendChild(instructions);

    // Adicionar listeners de seleção
    let isSelecting = false;
    let startX, startY;

    overlay.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      // Atualizar área de seleção visual
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      const left = Math.min(startX, e.clientX);
      const top = Math.min(startY, e.clientY);

      // Implementar visual de seleção aqui se necessário
    });

    overlay.addEventListener('mouseup', (e) => {
      if (!isSelecting) return;

      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);

      if (width > 10 && height > 10) {
        // Capturar área selecionada
        captureSelectedArea({
          x: Math.min(startX, e.clientX),
          y: Math.min(startY, e.clientY),
          width: width,
          height: height
        });
      }

      cleanup();
    });

    // ESC para cancelar
    const escListener = (e) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };

    document.addEventListener('keydown', escListener);

    function cleanup() {
      globalState.selectionActive = false;
      overlay.remove();
      instructions.remove();
      document.removeEventListener('keydown', escListener);
    }
  }

  // Capturar área selecionada
  function captureSelectedArea(area) {
    console.log('📸 Capturando área selecionada:', area);

    api.runtime.sendMessage({
      type: 'CAPTURE_AREA',
      area: area,
      site: globalState.currentSite,
      url: window.location.href
    });

    showExportNotification('screenshot');
  }

  // Mostrar notificação de exportação
  function showExportNotification(format) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4ade80, #16a34a);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
      animation: slideIn 0.3s ease-out;
      font-family: -moz-system-font, system-ui, sans-serif;
    `;

    notification.innerHTML = `
      ✅ Exportando como ${format.toUpperCase()}...
    `;

    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }

  // Mostrar notificação de erro
  function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      font-family: -moz-system-font, system-ui, sans-serif;
    `;

    notification.innerHTML = `❌ ${message}`;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
  }

  // Inicialização principal
  function initialize() {
    console.log('🦊 Inicializando AI Exporter Content Script Global');

    const siteName = detectAISite();

    if (siteName) {
      globalState.isActive = true;
      initializeForSite(siteName);
    } else {
      console.log('🔍 Site não suportado para AI Exporter');
    }
  }

  // Aguardar DOM ready e inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();

console.log('🦊 AI Exporter Content Script Global carregado');
