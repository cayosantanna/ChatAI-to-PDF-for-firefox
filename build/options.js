// Controlador da página de configurações
class OptionsController {
    constructor() {
        this.settings = {};
        this.defaultSettings = this.getDefaultSettings();
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.populateUI();
        this.handleNavigation();
        this.setupAutoSave();
        this.checkTheme();
    }

    getDefaultSettings() {
        return {
            // Geral
            uiTheme: 'auto',
            language: 'pt-BR',
            showNotifications: true,
            autoDetectContent: true,
            rememberSettings: true,
            closeAfterExport: false,

            // Captura
            defaultCaptureMode: 'smart',
            ignoreSelectors: '[ads], [role="banner"], .navigation, .sidebar, .footer',
            prioritySelectors: 'article, main, .content, [role="main"]',
            claudeArtifacts: true,
            chatgptCanvas: true,
            notionComments: false,

            // Processamento
            removeAds: true,
            removeNavigation: true,
            removeComments: false,
            cleanFormatting: false,
            defaultImageQuality: 'medium',
            maxImageSize: 1920,
            compressImages: true,
            fixEncoding: false,
            normalizeWhitespace: true,
            removeEmptyParagraphs: true,

            // Exportação
            defaultPageSize: 'a4',
            pdfMargins: 20,
            includeMetadata: true,
            pdfBookmarks: false,
            filenamePattern: 'title-date',
            customFilenamePattern: '{site}_{title}_{date}',
            askDownloadLocation: false,
            defaultDownloadFolder: 'Downloads/AI-Content',

            // IA
            aiProvider: 'none',
            aiApiKey: '',
            autoSummarize: false,
            autoExtractKeywords: false,
            autoGenerateToc: false,
            translationTarget: 'pt',
            detectLanguage: true,

            // Avançado
            maxElements: 1000,
            processingTimeout: 30,
            parallelProcessing: true,
            debugMode: false,
            verboseLogging: false,
            cacheSize: 100
        };
    }

    async loadSettings() {
        try {
            const result = await browser.storage.local.get('aiContentSettings');
            this.settings = { ...this.defaultSettings, ...result.aiContentSettings };
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    async saveSettings() {
        try {
            await browser.storage.local.set({ aiContentSettings: this.settings });
            this.showSaveStatus('Configurações salvas com sucesso!', 'success');
            this.markAllAsUnchanged();
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showSaveStatus('Erro ao salvar configurações!', 'error');
        }
    }

    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Botões principais
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancel-settings').addEventListener('click', () => {
            window.close();
        });

        // Controles de formulário
        this.setupFormControls();

        // Botões especiais
        this.setupSpecialButtons();

        // Atalhos de teclado
        this.setupKeyboardShortcuts();
    }

    setupFormControls() {
        // Inputs de texto, números e senhas
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="password"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInputChange(e.target);
            });
        });

        // Selects
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleInputChange(e.target);
            });
        });

        // Textareas
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                this.handleInputChange(e.target);
            });
        });

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleInputChange(e.target);
            });
        });

        // Padrão de filename personalizado
        document.getElementById('filename-pattern').addEventListener('change', (e) => {
            const customContainer = document.getElementById('custom-pattern-container');
            customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        // Provedor de IA
        document.getElementById('ai-provider').addEventListener('change', (e) => {
            const apiKeyContainer = document.getElementById('ai-api-key-container');
            apiKeyContainer.style.display = e.target.value !== 'none' ? 'block' : 'none';
        });
    }

    setupSpecialButtons() {
        // Limpar cache
        document.getElementById('clear-cache').addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja limpar o cache?')) {
                try {
                    await browser.storage.local.remove(['aiContentCache']);
                    this.showNotification('Cache limpo com sucesso!', 'success');
                } catch (error) {
                    this.showNotification('Erro ao limpar cache!', 'error');
                }
            }
        });

        // Exportar configurações
        document.getElementById('export-settings').addEventListener('click', () => {
            this.exportSettings();
        });

        // Importar configurações
        document.getElementById('import-settings').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
        });

        // Resetar configurações
        document.getElementById('reset-settings').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
                this.resetSettings();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveSettings();
            }

            if (e.key === 'Escape') {
                window.close();
            }

            // Navegação por números
            if (e.altKey && e.key >= '1' && e.key <= '6') {
                e.preventDefault();
                const sections = ['general', 'capture', 'processing', 'export', 'ai', 'advanced'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    this.showSection(sections[sectionIndex]);
                }
            }
        });
    }

    setupAutoSave() {
        let autoSaveTimeout;
        
        document.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                if (this.settings.rememberSettings) {
                    this.collectFormData();
                    this.saveSettings();
                }
            }, 2000);
        });
    }

    handleInputChange(element) {
        this.markAsChanged(element);
        this.validateInput(element);
        
        if (element.type === 'checkbox') {
            this.settings[this.toCamelCase(element.id)] = element.checked;
        } else {
            this.settings[this.toCamelCase(element.id)] = element.value;
        }
    }

    markAsChanged(element) {
        const settingItem = element.closest('.setting-item');
        if (settingItem) {
            settingItem.classList.add('changed');
        }
    }

    markAllAsUnchanged() {
        document.querySelectorAll('.setting-item.changed').forEach(item => {
            item.classList.remove('changed');
        });
    }

    validateInput(element) {
        const settingItem = element.closest('.setting-item');
        if (!settingItem) return;

        settingItem.classList.remove('invalid', 'valid');

        // Validações específicas
        if (element.type === 'number') {
            const value = parseFloat(element.value);
            const min = parseFloat(element.min);
            const max = parseFloat(element.max);
            
            if (isNaN(value) || (min && value < min) || (max && value > max)) {
                settingItem.classList.add('invalid');
                return false;
            }
        }

        if (element.type === 'password' && element.id === 'ai-api-key') {
            if (element.value && !this.validateApiKey(element.value)) {
                settingItem.classList.add('invalid');
                return false;
            }
        }

        settingItem.classList.add('valid');
        return true;
    }

    validateApiKey(key) {
        // Validação básica para chaves de API
        if (key.startsWith('sk-') && key.length > 20) return true; // OpenAI
        if (key.startsWith('claude-') && key.length > 20) return true; // Anthropic
        if (key.length > 10) return true; // Genérico
        return false;
    }

    populateUI() {
        // Popular todos os campos com os valores salvos
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(this.toKebabCase(key));
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });

        // Configurações especiais
        this.updateSpecialUI();
    }

    updateSpecialUI() {
        // Mostrar/ocultar padrão personalizado
        const filenamePattern = document.getElementById('filename-pattern').value;
        const customContainer = document.getElementById('custom-pattern-container');
        customContainer.style.display = filenamePattern === 'custom' ? 'block' : 'none';

        // Mostrar/ocultar chave da API
        const aiProvider = document.getElementById('ai-provider').value;
        const apiKeyContainer = document.getElementById('ai-api-key-container');
        apiKeyContainer.style.display = aiProvider !== 'none' ? 'block' : 'none';
    }

    handleNavigation() {
        // Mostrar seção baseada na URL
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section') || 'general';
        this.showSection(section);
    }

    showSection(sectionName) {
        // Atualizar navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Mostrar seção
        document.querySelectorAll('.option-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionName}`);
        });

        // Atualizar URL
        const url = new URL(window.location);
        url.searchParams.set('section', sectionName);
        window.history.replaceState(null, '', url);
    }

    collectFormData() {
        // Coletar dados de todos os formulários
        const formData = {};
        
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.id) {
                const key = this.toCamelCase(element.id);
                if (element.type === 'checkbox') {
                    formData[key] = element.checked;
                } else {
                    formData[key] = element.value;
                }
            }
        });

        this.settings = { ...this.settings, ...formData };
    }

    checkTheme() {
        const theme = this.settings.uiTheme;
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', theme);
        }
    }

    async exportSettings() {
        try {
            const settings = { ...this.settings };
            // Remover dados sensíveis
            delete settings.aiApiKey;
            
            const blob = new Blob([JSON.stringify(settings, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-content-processor-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Configurações exportadas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar configurações:', error);
            this.showNotification('Erro ao exportar configurações!', 'error');
        }
    }

    async importSettings(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const importedSettings = JSON.parse(text);
            
            // Validar configurações importadas
            const validSettings = {};
            Object.keys(this.defaultSettings).forEach(key => {
                if (importedSettings.hasOwnProperty(key)) {
                    validSettings[key] = importedSettings[key];
                }
            });

            this.settings = { ...this.settings, ...validSettings };
            this.populateUI();
            await this.saveSettings();
            
            this.showNotification('Configurações importadas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao importar configurações:', error);
            this.showNotification('Erro ao importar configurações! Verifique se o arquivo é válido.', 'error');
        }
    }

    async resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.populateUI();
        await this.saveSettings();
        this.showNotification('Configurações resetadas para os valores padrão!', 'success');
    }

    showSaveStatus(message, type = 'info') {
        const statusElement = document.getElementById('save-status');
        statusElement.textContent = message;
        statusElement.className = type;
        
        setTimeout(() => {
            statusElement.textContent = 'Configurações salvas automaticamente';
            statusElement.className = '';
        }, 3000);
    }

    showNotification(message, type = 'info') {
        if (this.settings.showNotifications && browser.notifications) {
            browser.notifications.create({
                type: 'basic',
                iconUrl: '../icons/icon-48.png',
                title: 'AI Content Processor',
                message: message
            });
        }
        
        this.showSaveStatus(message, type);
    }

    // Utilitários
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    toKebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
}

// Utilitários para temas
class ThemeManager {
    static init() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            if (document.body.getAttribute('data-theme') === 'auto') {
                document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }

    static setTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', theme);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
    ThemeManager.init();
});

// Gerenciamento de navegação por teclado melhorado
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
});

// Smooth scrolling para seções
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = document.querySelector(`#section-${item.dataset.section}`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Funcionalidade de busca nas configurações
class SettingsSearch {
    constructor() {
        this.createSearchBox();
        this.setupSearch();
    }

    createSearchBox() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="settings-search" placeholder="Buscar configurações...">
                <button id="clear-search" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const header = document.querySelector('.options-header .header-content');
        header.appendChild(searchContainer);
    }

    setupSearch() {
        const searchInput = document.getElementById('settings-search');
        const clearButton = document.getElementById('clear-search');

        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
            clearButton.style.display = e.target.value ? 'block' : 'none';
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.performSearch('');
            clearButton.style.display = 'none';
        });
    }

    performSearch(query) {
        const searchTerm = query.toLowerCase();
        const settingItems = document.querySelectorAll('.setting-item');
        const settingGroups = document.querySelectorAll('.setting-group');
        
        if (!searchTerm) {
            // Mostrar todos os elementos
            settingItems.forEach(item => item.style.display = '');
            settingGroups.forEach(group => group.style.display = '');
            return;
        }

        settingItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(searchTerm);
            item.style.display = matches ? '' : 'none';
        });

        // Ocultar grupos vazios
        settingGroups.forEach(group => {
            const visibleItems = group.querySelectorAll('.setting-item:not([style*="display: none"])');
            group.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    }
}

// Inicializar busca após o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new SettingsSearch(), 100);
});
