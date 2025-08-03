// Firefox Sidebar JavaScript - Funcionalidade nativa

// Estado da sidebar
const firefoxSidebarState = {
  currentTab: null,
  exportHistory: [],
  firefoxInfo: null,
  isFirefox: typeof browser !== 'undefined'
};

// Inicialização da sidebar
document.addEventListener('DOMContentLoaded', () => {
  // Inicialize a sidebar, carregue conversas, etc.
  // Exemplo de comunicação com background:
  browser.runtime.sendMessage({ type: 'sidebarOpened' });

  // Adicione event listeners para exportação, seleção, etc.
  initializeSidebar();
  setupEventListeners();
  setupKeyboardShortcuts();
  loadExportHistory();
  updateCurrentTabInfo();
  
  // Auto-refresh a cada 5 segundos
  setInterval(updateCurrentTabInfo, 5000);
});

// Inicializar sidebar
async function initializeSidebar() {
  try {
    // Carregar informações do Firefox
    await loadFirefoxInfo();
    
    // Verificar aba atual
    await checkCurrentTabSupport();
    
    console.log('[AI Exporter Sidebar] Inicializada com sucesso');
  } catch (error) {
    console.error('[AI Exporter Sidebar] Erro na inicialização:', error);
  }
}

// Carregar informações do Firefox
async function loadFirefoxInfo() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab) {
      const response = await browser.runtime.sendMessage({ 
        action: "get-firefox-info" 
      });
      
      if (response) {
        firefoxSidebarState.firefoxInfo = response;
        updateFirefoxInfo(response);
      }
    }
  } catch (error) {
    console.warn('[AI Exporter Sidebar] Erro ao carregar info do Firefox:', error);
  }
}

// Atualizar informações do Firefox na UI
function updateFirefoxInfo(info) {
  // Atualizar tema
  const themeElement = document.getElementById('theme-name');
  if (themeElement && info.theme) {
    const themeName = getThemeName(info.theme);
    themeElement.textContent = themeName;
  }
  
  // Atualizar versão
  const versionElement = document.getElementById('firefox-version');
  if (versionElement && info.firefoxVersion) {
    versionElement.textContent = info.firefoxVersion;
  }
  
  // Atualizar modo privado
  const privateModeElement = document.getElementById('private-mode');
  if (privateModeElement) {
    privateModeElement.textContent = info.isPrivate ? 'Sim' : 'Não';
  }
  
  // Atualizar container
  if (info.container) {
    const containerInfo = document.getElementById('container-info');
    const containerIcon = document.getElementById('container-icon');
    const containerName = document.getElementById('container-name');
    
    if (containerInfo && containerIcon && containerName) {
      containerInfo.style.display = 'block';
      containerIcon.textContent = info.container.icon || '📦';
      containerName.textContent = info.container.name;
      
      // Aplicar cor do container se disponível
      if (info.container.color) {
        containerName.style.color = info.container.color;
      }
    }
  }
}

// Obter nome amigável do tema
function getThemeName(theme) {
  if (!theme || !theme.colors) {
    return 'Sistema';
  }
  
  // Detectar se é tema escuro
  const isDark = isThemeDark(theme);
  return isDark ? 'Escuro' : 'Claro';
}

// Detectar se o tema é escuro
function isThemeDark(theme) {
  if (!theme.colors || !theme.colors.toolbar) {
    return false;
  }
  
  // Converter cor para RGB e calcular luminosidade
  const color = theme.colors.toolbar;
  const rgb = hexToRgb(color);
  
  if (rgb) {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }
  
  return false;
}

// Converter hex para RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Atualizar informações da aba atual
async function updateCurrentTabInfo() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (!currentTab) return;
    
    firefoxSidebarState.currentTab = currentTab;
    
    // Atualizar status
    updateStatus(currentTab);
    
    // Verificar se content script está carregado
    checkContentScriptStatus(currentTab);
    
  } catch (error) {
    console.warn('[AI Exporter Sidebar] Erro ao atualizar info da aba:', error);
    updateStatus(null);
  }
}

// Atualizar status da página
function updateStatus(tab) {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const currentSite = document.getElementById('current-site');
  
  if (!tab) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Aba não encontrada';
    currentSite.textContent = '';
    toggleExportButtons(false);
    return;
  }
  
  const supportedSites = [
    'chatgpt.com', 'claude.ai', 'gemini.google.com',
    'chat.deepseek.com', 'grok.com', 'perplexity.ai',
    'you.com', 'poe.com', 'copilot.microsoft.com'
  ];
  
  const isSupported = supportedSites.some(site => tab.url.includes(site));
  
  if (isSupported) {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'Pronto para exportar';
    
    // Extrair nome do site
    const url = new URL(tab.url);
    currentSite.textContent = url.hostname;
    
    toggleExportButtons(true);
  } else {
    statusDot.className = 'status-dot inactive';
    statusText.textContent = 'Site não suportado';
    currentSite.textContent = tab.url ? new URL(tab.url).hostname : '';
    toggleExportButtons(false);
  }
}

// Verificar status do content script
async function checkContentScriptStatus(tab) {
  try {
    await browser.tabs.sendMessage(tab.id, { action: "ping" });
    // Content script está carregado
  } catch (error) {
    // Content script não está carregado
    const statusText = document.getElementById('status-text');
    if (statusText.textContent === 'Pronto para exportar') {
      statusText.textContent = 'Carregando extensão...';
    }
  }
}

// Habilitar/desabilitar botões de exportação
function toggleExportButtons(enabled) {
  const buttons = document.querySelectorAll('.export-button');
  buttons.forEach(btn => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.5';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  });
}

// Configurar event listeners
function setupEventListeners() {
  // Botões de exportação
  document.querySelectorAll('.export-button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (btn.disabled) return;
      
      const format = e.currentTarget.dataset.format;
      await handleExport(format);
    });
  });
  
  // Botão de configurações
  document.getElementById('open-options')?.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
  
  // Botão de alternar tema
  document.getElementById('toggle-theme')?.addEventListener('click', async () => {
    // Esta funcionalidade seria para alternar tema da extensão, não do Firefox
    showFeedback('Funcionalidade em desenvolvimento', 'info');
  });
  
  // Botão de limpar histórico
  document.getElementById('clear-history')?.addEventListener('click', async () => {
    if (confirm('Limpar todo o histórico de exportações?')) {
      await clearExportHistory();
    }
  });
  
  // Escutar mensagens do background
  browser.runtime.onMessage.addListener(handleMessage);
}

// Configurar atalhos de teclado
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + número para exportação rápida
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      
      const formats = ['pdf', 'png', 'markdown', 'txt'];
      const format = formats[parseInt(e.key) - 1];
      
      if (format) {
        handleExport(format);
      }
    }
  });
}

// Manipular exportação
async function handleExport(format) {
  if (!firefoxSidebarState.currentTab) {
    showFeedback('Nenhuma aba ativa encontrada', 'error');
    return;
  }
  
  const button = document.querySelector(`[data-format="${format}"]`);
  if (button) {
    button.classList.add('loading');
  }
  
  try {
    showFeedback(`Exportando como ${format.toUpperCase()}...`, 'info');
    
    await browser.tabs.sendMessage(firefoxSidebarState.currentTab.id, {
      action: "export-conversation",
      format: format,
      source: "firefox-sidebar"
    });
    
  } catch (error) {
    console.error('[AI Exporter Sidebar] Erro na exportação:', error);
    showFeedback('Erro ao exportar. Tente recarregar a página.', 'error');
  } finally {
    if (button) {
      button.classList.remove('loading');
    }
  }
}

// Carregar histórico de exportações
async function loadExportHistory() {
  try {
    const result = await browser.storage.local.get('exportHistory');
    firefoxSidebarState.exportHistory = result.exportHistory || [];
    
    renderExportHistory();
  } catch (error) {
    console.warn('[AI Exporter Sidebar] Erro ao carregar histórico:', error);
  }
}

// Renderizar histórico
function renderExportHistory() {
  const historyContainer = document.getElementById('export-history');
  
  if (firefoxSidebarState.exportHistory.length === 0) {
    historyContainer.innerHTML = '<div class="no-history">Nenhuma exportação ainda</div>';
    return;
  }
  
  const historyItems = firefoxSidebarState.exportHistory
    .slice(0, 10) // Mostrar apenas os últimos 10
    .map(item => `
      <div class="history-item">
        <span class="history-format">${item.format}</span>
        <span class="history-time">${formatTime(item.timestamp)}</span>
      </div>
    `).join('');
  
  historyContainer.innerHTML = historyItems;
}

// Formatar tempo
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

// Limpar histórico
async function clearExportHistory() {
  try {
    firefoxSidebarState.exportHistory = [];
    await browser.storage.local.set({ exportHistory: [] });
    renderExportHistory();
    showFeedback('Histórico limpo', 'success');
  } catch (error) {
    console.error('[AI Exporter Sidebar] Erro ao limpar histórico:', error);
    showFeedback('Erro ao limpar histórico', 'error');
  }
}

// Manipular mensagens
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case "export-complete":
      showFeedback(`Exportação ${message.format.toUpperCase()} concluída!`, 'success');
      addToHistory(message.format);
      break;
      
    case "export-error":
      showFeedback(`Erro na exportação: ${message.error}`, 'error');
      break;
      
    case "theme-changed":
      loadFirefoxInfo(); // Recarregar informações do tema
      break;
  }
  
  sendResponse({ received: true });
}

// Adicionar ao histórico
function addToHistory(format) {
  const historyItem = {
    format: format,
    timestamp: Date.now(),
    url: firefoxSidebarState.currentTab?.url || 'unknown'
  };
  
  firefoxSidebarState.exportHistory.unshift(historyItem);
  
  // Manter apenas os últimos 50 itens
  if (firefoxSidebarState.exportHistory.length > 50) {
    firefoxSidebarState.exportHistory = firefoxSidebarState.exportHistory.slice(0, 50);
  }
  
  // Salvar no storage
  browser.storage.local.set({ 
    exportHistory: firefoxSidebarState.exportHistory 
  });
  
  // Re-renderizar histórico
  renderExportHistory();
}

// Mostrar feedback
function showFeedback(message, type = 'info', duration = 3000) {
  // Criar elemento de feedback temporário
  const feedback = document.createElement('div');
  feedback.className = `feedback feedback-${type}`;
  feedback.textContent = message;
  
  const colors = {
    success: '#30e60b',
    error: '#d70022',
    info: '#0060df',
    warning: '#ff9400'
  };
  
  feedback.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 11px;
    z-index: 1000;
    animation: slideDown 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => feedback.remove(), 300);
  }, duration);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('[AI Exporter Sidebar] JavaScript carregado ✅');
