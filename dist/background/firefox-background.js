// Firefox-optimized background script com funcionalidades melhoradas

// Use browser API nativa do Firefox - compatibilidade otimizada
const api = typeof browser !== 'undefined' ? browser : chrome;

// Estado da extensão - otimizado para Firefox
const extensionState = {
  activeTab: null,
  exportHistory: [],
  firefoxTheme: null,
  containers: new Map(),
  userPreferences: {
    defaultFormat: 'pdf',
    autoSave: true,
    selectionMode: 'area', // 'area', 'element', 'full'
    firefoxOptimized: true
  }
};

// === INITIALIZATION ===
api.runtime.onInstalled.addListener(async (details) => {
  console.log('AI Exporter Firefox inicializado:', details.reason);

  await initializeExtension();
  await setupContextMenus();
  await detectFirefoxFeatures();
  await setupKeyboardShortcuts();
});

async function initializeExtension() {
  // Configurar badge inicial
  await updateBadge("✓", "#28a745");

  // Verificar permissões opcionais
  await checkOptionalPermissions();

  // Configurar storage inicial
  await api.storage.local.set({
    version: api.runtime.getManifest().version,
    installDate: Date.now(),
    firefoxOptimized: true,
    features: {
      sidebar: true,
      containers: true,
      themes: true,
      areaSelection: true,
      customPDF: true
    },
    statistics: {
      exportsTotal: 0,
      lastExport: null,
      favoriteFormat: 'pdf'
    }
  });
}

async function detectFirefoxFeatures() {
  // Detectar tema do Firefox
  if (api.theme) {
    try {
      const theme = await api.theme.getCurrent();
      extensionState.firefoxTheme = theme;

      // Configurar listener para mudanças de tema
      api.theme.onUpdated.addListener(handleThemeUpdate);
    } catch (error) {
      console.warn('Tema não disponível:', error);
    }
  }

  // Detectar containers (se disponível)
  if (api.contextualIdentities) {
    try {
      const containers = await api.contextualIdentities.query({});
      containers.forEach(container => {
        extensionState.containers.set(container.cookieStoreId, container);
      });
    } catch (error) {
      console.warn('Containers não disponíveis:', error);
    }
  }
}

async function checkOptionalPermissions() {
  const optionalPerms = ['downloads', 'clipboardWrite', 'bookmarks', 'theme'];

  for (const perm of optionalPerms) {
    try {
      const hasPermission = await api.permissions.contains({ permissions: [perm] });
      if (!hasPermission) {
        console.log(`Permissão opcional ${perm} não concedida`);
      }
    } catch (error) {
      console.warn(`Erro ao verificar permissão ${perm}:`, error);
    }
  }
}

// === THEME HANDLING ===
async function handleThemeUpdate(updateInfo) {
  extensionState.firefoxTheme = updateInfo.theme;

  // Notificar todas as abas sobre mudança de tema
  const tabs = await api.tabs.query({});

  for (const tab of tabs) {
    try {
      await api.tabs.sendMessage(tab.id, {
        action: "theme-changed",
        theme: updateInfo.theme,
        windowId: updateInfo.windowId
      });
    } catch (error) {
      // Ignorar erros de abas que não têm content script
    }
  }
}

// === COMMANDS ===
api.commands.onCommand.addListener(async (command, tab) => {
  console.log(`Comando Firefox executado: ${command}`);

  try {
    switch (command) {
      case "toggle-popup":
        // Firefox não permite abrir popup programaticamente
        // Enviar mensagem para content script mostrar UI flutuante
        await api.tabs.sendMessage(tab.id, {
          action: "toggle-floating-ui",
          source: "keyboard-shortcut"
        });
        break;

      case "quick-export":
        await handleQuickExport(tab);
        break;

      case "toggle-sidebar":
        // Tentar abrir/fechar sidebar
        if (api.sidebarAction) {
          await api.sidebarAction.toggle();
        }
        break;

      case "_execute_sidebar_action":
        await showNotification(
          "AI Exporter",
          "Sidebar ativada! Use Ctrl+Shift+S para alternar."
        );
        break;
    }
  } catch (error) {
    console.warn(`Erro ao executar comando ${command}:`, error);
    await showNotification(
      "AI Exporter - Aviso",
      "Comando não disponível nesta página"
    );
  }
});

async function handleQuickExport(tab) {
  try {
    await api.tabs.sendMessage(tab.id, {
      action: "quick-export",
      format: "pdf",
      source: "keyboard-shortcut"
    });

    await showNotification("AI Exporter", "Iniciando exportação rápida...");
    await updateBadge("⏳", "#ff9800");

  } catch (error) {
    await showNotification(
      "AI Exporter - Erro",
      "Não foi possível exportar desta página"
    );
  }
}

// === KEYBOARD SHORTCUTS ===
async function setupKeyboardShortcuts() {
  try {
    api.commands.onCommand.addListener(async (command) => {
      const tab = await getCurrentTab();

      switch (command) {
        case 'quick-export':
          await handleQuickExport(tab);
          break;
        case 'area-selection':
          await startAreaSelection(tab);
          break;
        case 'toggle-sidebar':
          await toggleSidebar();
          break;
        case 'open-options':
          await api.runtime.openOptionsPage();
          break;
      }
    });
  } catch (error) {
    console.log('Keyboard shortcuts not available:', error);
  }
}

async function handleQuickExport(tab) {
  if (!isAISite(tab?.url)) {
    await showNotification('Erro', 'Esta funcionalidade só está disponível em sites de IA');
    return;
  }

  try {
    const result = await api.tabs.sendMessage(tab.id, {
      action: 'quickExport',
      format: extensionState.userPreferences.defaultFormat
    });

    if (result?.success) {
      await updateExportStats();
      await showNotification('Sucesso', 'Conteúdo exportado com sucesso!');
    }
  } catch (error) {
    console.error('Erro no export rápido:', error);
    await showNotification('Erro', 'Falha ao exportar conteúdo');
  }
}

async function startAreaSelection(tab) {
  if (!isAISite(tab?.url)) {
    await showNotification('Erro', 'Seleção de área disponível apenas em sites de IA');
    return;
  }

  try {
    await api.tabs.sendMessage(tab.id, {
      action: 'startAreaSelection'
    });
  } catch (error) {
    console.error('Erro ao iniciar seleção de área:', error);
  }
}

async function toggleSidebar() {
  try {
    await api.sidebarAction.toggle();
  } catch (error) {
    console.log('Sidebar não disponível:', error);
  }
}

// === CONTEXT MENUS ===
async function setupContextMenus() {
  // Limpar menus existentes
  await api.contextMenus.removeAll();

  // Menu principal com ícone
  api.contextMenus.create({
    id: "ai-exporter-main",
    title: "🤖 AI Exporter",
    contexts: ["page", "selection"],
    documentUrlPatterns: getSupportedUrls()
  });

  // Submenus de exportação com ícones
  const exportOptions = [
    { id: "export-pdf", title: "📄 Exportar como PDF", format: "pdf" },
    { id: "export-png", title: "🖼️ Exportar como Imagem", format: "png" },
    { id: "export-markdown", title: "📝 Exportar como Markdown", format: "markdown" },
    { id: "export-txt", title: "📋 Exportar como Texto", format: "txt" }
  ];

  exportOptions.forEach(option => {
    api.contextMenus.create({
      id: option.id,
      parentId: "ai-exporter-main",
      title: option.title,
      contexts: ["page", "selection"]
    });
  });

  // Separador
  api.contextMenus.create({
    id: "separator-1",
    parentId: "ai-exporter-main",
    type: "separator",
    contexts: ["page"]
  });

  // Funcionalidades específicas do Firefox
  if (extensionState.containers.size > 0) {
    api.contextMenus.create({
      id: "container-info",
      parentId: "ai-exporter-main",
      title: "📦 Informações do Container",
      contexts: ["page"]
    });
  }

  api.contextMenus.create({
    id: "open-sidebar",
    parentId: "ai-exporter-main",
    title: "📑 Abrir Sidebar",
    contexts: ["page"]
  });

  api.contextMenus.create({
    id: "open-options",
    parentId: "ai-exporter-main",
    title: "⚙️ Configurações",
    contexts: ["page"]
  });
}

function getSupportedUrls() {
  return [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://chat.deepseek.com/*",
    "https://grok.com/*",
    "https://www.perplexity.ai/*",
    "https://poe.com/*",
    "https://you.com/*",
    "https://copilot.microsoft.com/*"
  ];
}

// === CONTEXT MENU HANDLERS ===
api.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case "export-pdf":
      case "export-png":
      case "export-markdown":
      case "export-txt":
        const format = info.menuItemId.replace("export-", "");
        await sendExportMessage(tab.id, format, info.selectionText);
        break;

      case "container-info":
        await showContainerInfo(tab);
        break;

      case "open-sidebar":
        if (api.sidebarAction) {
          await api.sidebarAction.open();
        }
        break;

      case "open-options":
        await api.runtime.openOptionsPage();
        break;
    }
  } catch (error) {
    console.warn('Erro no menu de contexto:', error);
  }
});

async function sendExportMessage(tabId, format, selectedText = null) {
  try {
    await api.tabs.sendMessage(tabId, {
      action: "export-conversation",
      format: format,
      selectedText: selectedText,
      source: "context-menu"
    });

    await showNotification(
      "AI Exporter",
      `Exportando ${selectedText ? 'seleção' : 'conversa'} como ${format.toUpperCase()}...`
    );

    await updateBadge("⏳", "#ff9800");

  } catch (error) {
    await showNotification(
      "AI Exporter - Erro",
      "Extensão não carregada nesta página"
    );
  }
}

async function showContainerInfo(tab) {
  const container = extensionState.containers.get(tab.cookieStoreId);

  let message = `Container: ${container ? container.name : 'Padrão'}\n`;
  message += `Privado: ${tab.incognito ? 'Sim' : 'Não'}\n`;
  message += `ID: ${tab.cookieStoreId || 'firefox-default'}`;

  if (container) {
    message += `\nCor: ${container.color}`;
    message += `\nÍcone: ${container.icon}`;
  }

  await showNotification("Informações do Container", message);
}

// === MESSAGE HANDLING ===
api.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    const response = await handleMessage(message, sender);
    sendResponse(response);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    sendResponse({ success: false, error: error.message });
  }
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case "export-complete":
      await handleExportComplete(message, sender.tab);
      return { success: true };

    case "export-error":
      await handleExportError(message);
      return { success: true };

    case "get-firefox-info":
      return await getFirefoxInfo(sender.tab);

    case "request-permission":
      return await requestOptionalPermission(message.permission);

    case "area-selected":
      return await handleAreaSelection(message, sender);

    case "get-export-history":
      return { success: true, history: extensionState.exportHistory };

    case "clear-export-history":
      extensionState.exportHistory = [];
      await api.storage.local.set({ exportHistory: [] });
      return { success: true };

    case "get-preferences":
      return {
        success: true,
        preferences: extensionState.userPreferences
      };

    case "update-preferences":
      await updateUserPreferences(message.preferences);
      return { success: true };

    case "get-statistics":
      return await getStatistics();

    case "ping":
      return { success: true, firefox: true };

    default:
      return { success: false, error: "Ação desconhecida" };
  }
}

async function handleAreaSelection(message, sender) {
  try {
    const { area, format, imageData } = message;

    if (!area || !area.coordinates) {
      throw new Error('Dados de área inválidos');
    }

    // Log da seleção
    console.log('Área selecionada:', {
      coordinates: area.coordinates,
      dimensions: `${area.width}x${area.height}`,
      format: format,
      url: sender.tab?.url
    });

    // Adicionar ao histórico com dados específicos da área
    const historyItem = {
      type: 'area-selection',
      format: format || 'png',
      timestamp: Date.now(),
      url: sender.tab?.url,
      title: sender.tab?.title,
      area: {
        x: area.coordinates.x,
        y: area.coordinates.y,
        width: area.width,
        height: area.height
      },
      container: extensionState.containers.get(sender.tab?.cookieStoreId)?.name || 'Padrão'
    };

    extensionState.exportHistory.unshift(historyItem);

    // Manter apenas 100 itens no histórico
    if (extensionState.exportHistory.length > 100) {
      extensionState.exportHistory = extensionState.exportHistory.slice(0, 100);
    }

    // Salvar histórico
    await api.storage.local.set({
      exportHistory: extensionState.exportHistory
    });

    // Atualizar estatísticas
    await updateExportStats('area');

    // Mostrar notificação de sucesso
    await showNotification(
      "AI Exporter - Área Selecionada ✅",
      `Área de ${area.width}x${area.height}px capturada como ${(format || 'PNG').toUpperCase()}`
    );

    return { success: true, areaId: Date.now() };
  } catch (error) {
    console.error('Erro ao processar seleção de área:', error);
    await showNotification(
      "AI Exporter - Erro ❌",
      `Erro ao processar área selecionada: ${error.message}`
    );
    return { success: false, error: error.message };
  }
}

async function updateUserPreferences(newPreferences) {
  try {
    extensionState.userPreferences = {
      ...extensionState.userPreferences,
      ...newPreferences
    };

    await api.storage.local.set({
      userPreferences: extensionState.userPreferences
    });

    console.log('Preferências atualizadas:', extensionState.userPreferences);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    throw new Error(`Erro ao atualizar preferências: ${error.message}`);
  }
}

async function updateExportStats(type = 'standard') {
  try {
    const result = await api.storage.local.get(['statistics']);
    const currentStats = result.statistics || {
      exportsTotal: 0,
      lastExport: null,
      favoriteFormat: 'pdf',
      areaExports: 0,
      standardExports: 0
    };

    currentStats.exportsTotal++;
    currentStats.lastExport = Date.now();

    if (type === 'area') {
      currentStats.areaExports = (currentStats.areaExports || 0) + 1;
    } else {
      currentStats.standardExports = (currentStats.standardExports || 0) + 1;
    }

    await api.storage.local.set({ statistics: currentStats });

    // Atualizar badge com contador
    const badgeText = currentStats.exportsTotal > 99 ? '99+' : currentStats.exportsTotal.toString();
    await updateBadge(badgeText, '#28a745');

    // Limpar badge após 5 segundos
    setTimeout(async () => {
      await updateBadge('', '#1976d2');
    }, 5000);

  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
  }
}

async function getStatistics() {
  try {
    const result = await api.storage.local.get(['statistics']);
    return {
      success: true,
      statistics: result.statistics || {
        exportsTotal: 0,
        lastExport: null,
        favoriteFormat: 'pdf',
        areaExports: 0,
        standardExports: 0
      }
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return { success: false, error: error.message };
  }
}

async function handleExportComplete(message, tab) {
  const format = message.format.toUpperCase();
  await showNotification(
    "AI Exporter - Sucesso ✅",
    `Conversa exportada como ${format}`
  );

  await updateBadge("✓", "#4caf50");

  // Adicionar ao histórico
  const historyItem = {
    format: message.format,
    timestamp: Date.now(),
    url: tab.url,
    title: tab.title,
    container: extensionState.containers.get(tab.cookieStoreId)?.name || 'Padrão'
  };

  extensionState.exportHistory.unshift(historyItem);

  // Manter apenas 100 itens
  if (extensionState.exportHistory.length > 100) {
    extensionState.exportHistory = extensionState.exportHistory.slice(0, 100);
  }

  // Salvar histórico
  await api.storage.local.set({
    exportHistory: extensionState.exportHistory
  });

  // Limpar badge após 3 segundos
  setTimeout(async () => {
    await updateBadge("", "#1976d2");
  }, 3000);
}

async function handleExportError(message) {
  await showNotification(
    "AI Exporter - Erro ❌",
    message.error || "Erro durante a exportação"
  );

  await updateBadge("✗", "#f44336");

  setTimeout(async () => {
    await updateBadge("", "#666");
  }, 3000);
}

async function getFirefoxInfo(tab) {
  const container = extensionState.containers.get(tab.cookieStoreId);

  return {
    theme: extensionState.firefoxTheme,
    container: container ? {
      name: container.name,
      color: container.color,
      icon: container.icon,
      id: container.cookieStoreId
    } : null,
    isPrivate: tab.incognito,
    version: api.runtime.getManifest().version
  };
}

async function requestOptionalPermission(permission) {
  try {
    const granted = await api.permissions.request({ permissions: [permission] });
    return { success: granted };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// === UTILITY FUNCTIONS ===
async function showNotification(title, message, iconUrl = "assets/icon/128.png") {
  try {
    await api.notifications.create({
      type: "basic",
      iconUrl: api.runtime.getURL(iconUrl),
      title: title,
      message: message
    });
  } catch (error) {
    console.warn('Erro ao mostrar notificação:', error);
  }
}

// === TAB MANAGEMENT ===
api.tabs.onActivated.addListener(async (activeInfo) => {
  extensionState.activeTab = activeInfo.tabId;
  await updateBadge("", "#1976d2");
  // Log para debug
  console.log("Tab ativada:", activeInfo.tabId);
});

api.tabs.onRemoved.addListener((tabId) => {
  if (extensionState.activeTab === tabId) {
    extensionState.activeTab = null;
    // Reset badge ao fechar aba ativa
    updateBadge("", "#1976d2");
    console.log("Tab removida:", tabId);
  }
});

// Fallback para Manifest V3 (action)
async function updateBadge(text, color = "#1976d2") {
  try {
    if (api.browserAction && api.browserAction.setBadgeText) {
      await api.browserAction.setBadgeText({ text: text });
      await api.browserAction.setBadgeBackgroundColor({ color: color });
    } else if (api.action && api.action.setBadgeText) {
      await api.action.setBadgeText({ text: text });
      await api.action.setBadgeBackgroundColor({ color: color });
    }
  } catch (error) {
    console.warn('Erro ao atualizar badge:', error);
  }
}

// === WEB NAVIGATION ===
if (api.webNavigation) {
  api.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId === 0) { // Main frame only
      const supportedSites = [
        'chatgpt.com', 'claude.ai', 'gemini.google.com',
        'deepseek.com', 'grok.com', 'perplexity.ai',
        'poe.com', 'you.com', 'copilot.microsoft.com'
      ];

      const isSupported = supportedSites.some(site =>
        details.url.includes(site)
      );

      if (isSupported) {
        // Pequeno delay para garantir que a página carregou
        setTimeout(async () => {
          try {
            await api.tabs.sendMessage(details.tabId, {
              action: "page-ready",
              url: details.url,
              firefox: true
            });
          } catch (error) {
            // Content script ainda não carregou
          }
        }, 1000);
      }
    }
  });
}

console.log('AI Exporter Firefox background script inicializado ✅');

// Listener para comando de teclado
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    browser.sidebarAction.toggle();
  }
});
