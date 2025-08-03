// Enhanced Options Script for AI Exporter Firefox Extension

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      defaultFormat: 'pdf',
      selectionMode: 'area',
      autoSave: true,
      showNotifications: true,
      enableAnimations: true,
      compactMode: false,
      debugMode: false,
      exportHistory: true,
      maxHistoryItems: 100
    };

    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadStatistics();
    this.setupEventListeners();
    this.updateVersion();
    console.log('🦊 AI Exporter Options carregadas para Firefox');
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'get-preferences'
      });

      if (response?.success && response.preferences) {
        this.applySettings(response.preferences);
      } else {
        this.applySettings(this.defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.applySettings(this.defaultSettings);
    }
  }

  async loadStatistics() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'get-statistics'
      });

      if (response?.success && response.statistics) {
        this.updateStatisticsDisplay(response.statistics);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  applySettings(settings) {
    // Aplicar configurações aos elementos
    const elements = {
      defaultFormat: document.getElementById('defaultFormat'),
      selectionMode: document.getElementById('selectionMode'),
      autoSave: document.getElementById('autoSave'),
      showNotifications: document.getElementById('showNotifications'),
      enableAnimations: document.getElementById('enableAnimations'),
      compactMode: document.getElementById('compactMode'),
      debugMode: document.getElementById('debugMode'),
      exportHistory: document.getElementById('exportHistory'),
      maxHistoryItems: document.getElementById('maxHistoryItems')
    };

    Object.keys(elements).forEach(key => {
      const element = elements[key];
      if (!element) return;

      const value = settings[key] !== undefined ? settings[key] : this.defaultSettings[key];

      if (element.type === 'checkbox') {
        element.checked = value;
      } else {
        element.value = value;
      }
    });
  }

  updateStatisticsDisplay(stats) {
    // Atualizar números nas estatísticas
    const totalExports = document.getElementById('totalExports');
    const areaExports = document.getElementById('areaExports');
    const standardExports = document.getElementById('standardExports');
    const lastExport = document.getElementById('lastExport');

    if (totalExports) totalExports.textContent = stats.exportsTotal || 0;
    if (areaExports) areaExports.textContent = stats.areaExports || 0;
    if (standardExports) standardExports.textContent = stats.standardExports || 0;

    if (lastExport && stats.lastExport) {
      const date = new Date(stats.lastExport);
      lastExport.textContent = date.toLocaleDateString('pt-BR');
    }
  }

  updateVersion() {
    const versionElement = document.getElementById('version');
    if (versionElement) {
      versionElement.textContent = browser.runtime.getManifest().version;
    }
  }

  setupEventListeners() {
    // Botão Salvar
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Botão Restaurar Padrões
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefaults());
    }

    // Botão Limpar Histórico
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    // Botão Exportar Configurações
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    if (exportSettingsBtn) {
      exportSettingsBtn.addEventListener('click', () => this.exportSettings());
    }

    // Links do footer
    const aboutLink = document.getElementById('aboutLink');
    if (aboutLink) {
      aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAboutDialog();
      });
    }

    const helpLink = document.getElementById('helpLink');
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openHelp();
      });
    }

    const githubLink = document.getElementById('githubLink');
    if (githubLink) {
      githubLink.addEventListener('click', (e) => {
        e.preventDefault();
        browser.tabs.create({ url: 'https://github.com/yourusername/ai-exporter' });
      });
    }

    // Auto-save nas mudanças
    this.setupAutoSave();
  }

  setupAutoSave() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
      const eventType = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        this.debouncedSave();
      });
    });
  }

  debouncedSave = this.debounce(() => {
    this.saveSettings(false); // false = não mostrar notificação
  }, 1000);

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async saveSettings(showNotification = true) {
    try {
      const settings = this.gatherSettings();

      const response = await browser.runtime.sendMessage({
        action: 'update-preferences',
        preferences: settings
      });

      if (response?.success) {
        if (showNotification) {
          this.showSuccessMessage('Configurações salvas com sucesso!');
        }

        // Atualizar badge do botão
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
          saveBtn.textContent = '✅ Salvo!';
          setTimeout(() => {
            saveBtn.textContent = '💾 Salvar Configurações';
          }, 2000);
        }
      } else {
        throw new Error(response?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      this.showErrorMessage('Erro ao salvar configurações: ' + error.message);
    }
  }

  gatherSettings() {
    return {
      defaultFormat: document.getElementById('defaultFormat')?.value || 'pdf',
      selectionMode: document.getElementById('selectionMode')?.value || 'area',
      autoSave: document.getElementById('autoSave')?.checked || false,
      showNotifications: document.getElementById('showNotifications')?.checked || true,
      enableAnimations: document.getElementById('enableAnimations')?.checked || true,
      compactMode: document.getElementById('compactMode')?.checked || false,
      debugMode: document.getElementById('debugMode')?.checked || false,
      exportHistory: document.getElementById('exportHistory')?.checked || true,
      maxHistoryItems: parseInt(document.getElementById('maxHistoryItems')?.value) || 100
    };
  }

  async resetToDefaults() {
    if (!confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
      return;
    }

    try {
      this.applySettings(this.defaultSettings);
      await this.saveSettings();
      this.showSuccessMessage('Configurações restauradas para os padrões!');
    } catch (error) {
      console.error('Erro ao restaurar padrões:', error);
      this.showErrorMessage('Erro ao restaurar configurações padrão');
    }
  }

  async clearHistory() {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de exportações?')) {
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({
        action: 'clear-export-history'
      });

      if (response?.success) {
        this.showSuccessMessage('Histórico limpo com sucesso!');
        // Recarregar estatísticas
        await this.loadStatistics();
      } else {
        throw new Error(response?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      this.showErrorMessage('Erro ao limpar histórico: ' + error.message);
    }
  }

  async exportSettings() {
    try {
      const settings = this.gatherSettings();
      const exportData = {
        version: browser.runtime.getManifest().version,
        timestamp: new Date().toISOString(),
        settings: settings
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-exporter-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccessMessage('Configurações exportadas com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar configurações:', error);
      this.showErrorMessage('Erro ao exportar configurações');
    }
  }

  showAboutDialog() {
    alert(`AI Exporter v${browser.runtime.getManifest().version}

🦊 Extensão otimizada para Firefox
📄 Exportação de conversas de IA
📐 Seleção de área avançada
🔒 Foco em privacidade

Desenvolvido com ❤️ para a comunidade Firefox`);
  }

  openHelp() {
    browser.tabs.create({
      url: browser.runtime.getURL('dist/help/index.html')
    });
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type = 'info') {
    // Criar notificação visual
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remover após 4 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);

    // Adicionar estilos de animação se não existirem
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Log de inicialização
console.log('🦊 AI Exporter Enhanced Options carregado para Firefox');
