// Popup JavaScript - Funcionalidades avançadas estilo extensão Chrome profissional

class AdvancedPopupController {
    constructor() {
        this.currentTab = 'capture';
        this.captureMode = 'smart';
        this.selectedFormat = 'pdf';
        this.detectedContent = {
            ai: 0,
            images: 0,
            articles: 0,
            comments: 0
        };
        this.history = [];
        this.isProcessing = false;
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            await this.detectCurrentSite();
            await this.scanPageContent();
            await this.loadHistory();
            this.updateUI();
        } catch (error) {
            console.error('Erro na inicialização do popup:', error);
            this.setStatus('Erro na inicialização', 'error');
        }
    }

    setupEventListeners() {
        try {
            // Tab navigation
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab || e.target.closest('.nav-tab').dataset.tab;
                    if (tabName) {
                        this.switchTab(tabName);
                    }
                });
            });

            // Capture modes
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    if (mode) {
                        this.selectCaptureMode(mode);
                    }
                });
            });

            // Format selection
            document.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const format = e.currentTarget.dataset.format;
                    if (format) {
                        this.selectFormat(format);
                    }
                });
            });

            // Action buttons
            this.addSafeEventListener('quick-capture', 'click', () => this.quickCapture());
            this.addSafeEventListener('advanced-capture', 'click', () => this.advancedCapture());
            this.addSafeEventListener('preview-btn', 'click', () => this.previewDocument());
            this.addSafeEventListener('export-btn', 'click', () => this.exportDocument());

            // Enhancement buttons
            this.addSafeEventListener('summarize', 'click', () => this.enhanceContent('summarize'));
            this.addSafeEventListener('translate', 'click', () => this.enhanceContent('translate'));
            this.addSafeEventListener('extract-key', 'click', () => this.enhanceContent('extract-key'));
            this.addSafeEventListener('generate-toc', 'click', () => this.enhanceContent('generate-toc'));

            // History management
            this.addSafeEventListener('clear-history', 'click', () => this.clearHistory());
            this.addSafeEventListener('history-search', 'input', (e) => this.filterHistory(e.target.value));
            this.addSafeEventListener('history-filter', 'change', (e) => this.filterHistoryByDate(e.target.value));

            // Footer actions
            this.addSafeEventListener('settings-btn', 'click', () => this.openSettings());
            this.addSafeEventListener('help-btn', 'click', () => this.openHelp());
            this.addSafeEventListener('feedback-btn', 'click', () => this.openFeedback());

            // Template selection
            this.addSafeEventListener('template-select', 'change', (e) => this.applyTemplate(e.target.value));
        } catch (error) {
            console.error('Erro ao configurar event listeners:', error);
        }
    }

    // Helper para adicionar event listeners com verificação de existência do elemento
    addSafeEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Elemento não encontrado: ${id}`);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('capture');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('process');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('export');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('history');
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (this.currentTab === 'capture') {
                            this.quickCapture();
                        } else if (this.currentTab === 'export') {
                            this.exportDocument();
                        }
                        break;
                }
            }
        });
    }

    async detectCurrentSite() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) return;

            const url = new URL(currentTab.url);
            const hostname = url.hostname;
            
            let siteType = 'Página web';
            let siteIcon = '🌐';

            // Detecção inteligente do tipo de site
            if (hostname.includes('claude.ai')) {
                siteType = 'Claude AI';
                siteIcon = '🤖';
            } else if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
                siteType = 'ChatGPT';
                siteIcon = '🤖';
            } else if (hostname.includes('grok.com')) {
                siteType = 'Grok';
                siteIcon = '🤖';
            } else if (hostname.includes('gemini.google.com') || hostname.includes('bard.google.com')) {
                siteType = 'Gemini';
                siteIcon = '🤖';
            } else if (hostname.includes('notion.so')) {
                siteType = 'Notion';
                siteIcon = '📝';
            } else if (hostname.includes('github.com')) {
                siteType = 'GitHub';
                siteIcon = '💻';
            } else if (hostname.includes('stackoverflow.com')) {
                siteType = 'Stack Overflow';
                siteIcon = '❓';
            } else if (hostname.includes('medium.com')) {
                siteType = 'Medium';
                siteIcon = '📰';
            } else if (hostname.includes('reddit.com')) {
                siteType = 'Reddit';
                siteIcon = '💬';
            } else if (hostname.includes('docs.google.com')) {
                siteType = 'Google Docs';
                siteIcon = '📄';
            }

            document.getElementById('site-detection').textContent = `${siteIcon} ${siteType}`;
        } catch (error) {
            console.warn('Erro ao detectar site:', error);
            document.getElementById('site-detection').textContent = '🔍 Detectando...';
        }
    }

    async scanPageContent() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) return;

            // Envia mensagem para content script fazer a análise
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'scanContent'
            });

            if (response && response.content) {
                this.detectedContent = response.content;
                this.updateDetectionCounts();
            }
        } catch (error) {
            console.warn('Erro ao escanear conteúdo:', error);
            // Valores padrão se não conseguir escanear
            this.detectedContent = { ai: 0, images: 0, articles: 0, comments: 0 };
            this.updateDetectionCounts();
        }
    }

    updateDetectionCounts() {
        document.getElementById('ai-count').textContent = this.detectedContent.ai;
        document.getElementById('image-count').textContent = this.detectedContent.images;
        document.getElementById('article-count').textContent = this.detectedContent.articles;
        document.getElementById('comment-count').textContent = this.detectedContent.comments;
    }

    switchTab(tabName) {
        try {
            // Remove active class from all tabs and content
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active class to selected tab and content
            const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
            const targetContent = document.getElementById(`tab-${tabName}`);
            
            if (targetTab && targetContent) {
                targetTab.classList.add('active');
                targetContent.classList.add('active');
                this.currentTab = tabName;
            } else {
                console.warn(`Tab ou conteúdo não encontrado para: ${tabName}`);
            }
        } catch (error) {
            console.error('Erro ao trocar aba:', error);
        }
    }

    selectCaptureMode(mode) {
        try {
            // Remove active class from all mode buttons
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            
            // Add active class to selected mode
            const targetMode = document.querySelector(`[data-mode="${mode}"]`);
            if (targetMode) {
                targetMode.classList.add('active');
                this.captureMode = mode;
            } else {
                console.warn(`Modo de captura não encontrado: ${mode}`);
            }
        } catch (error) {
            console.error('Erro ao selecionar modo de captura:', error);
        }
    }

    selectFormat(format) {
        try {
            // Remove selected class from all format buttons
            document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('selected'));
            
            // Add selected class to selected format
            const targetFormat = document.querySelector(`[data-format="${format}"]`);
            if (targetFormat) {
                targetFormat.classList.add('selected');
                this.selectedFormat = format;
            } else {
                console.warn(`Formato não encontrado: ${format}`);
            }
        } catch (error) {
            console.error('Erro ao selecionar formato:', error);
        }
    }

    async quickCapture() {
        if (this.isProcessing) return;

        this.showLoading('Capturando conteúdo...');
        
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            console.log('Enviando mensagem para background script para tab:', currentTab.url);
            
            // Envia mensagem para background script que gerencia a comunicação
            const response = await browser.runtime.sendMessage({
                action: 'captureContent',
                mode: this.captureMode,
                hostname: new URL(currentTab.url).hostname
            });

            console.log('Resposta recebida:', response);

            if (response && response.success) {
                this.setStatus('Conteúdo capturado e PDF gerado!', 'success');
                
                // Adiciona ao histórico
                this.addToHistory({
                    title: currentTab.title,
                    url: currentTab.url,
                    date: new Date(),
                    mode: this.captureMode,
                    type: 'quick'
                });

                // Mostra informações sobre o que foi capturado
                if (response.data) {
                    const info = response.data;
                    this.setStatus(
                        `PDF gerado! ${info.elementsFound} elementos, ${info.imagesFound} imagens`, 
                        'success'
                    );
                }

                // Muda para a aba de exportação para mostrar o resultado
                this.switchTab('export');
            } else {
                const errorMsg = response?.error || 'Erro desconhecido ao capturar conteúdo';
                this.setStatus(errorMsg, 'error');
                console.error('Erro na resposta:', response);
            }
        } catch (error) {
            console.error('Erro na captura rápida:', error);
            let errorMessage = 'Erro na captura';
            
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script não carregado. Recarregue a página.';
            } else if (error.message.includes('No tab with id')) {
                errorMessage = 'Aba não encontrada. Tente novamente.';
            } else {
                errorMessage = error.message || 'Erro desconhecido';
            }
            
            this.setStatus(errorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async advancedCapture() {
        if (this.isProcessing) return;

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            // Abre a interface de seleção avançada via content script
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'advancedCapture',
                mode: this.captureMode
            });

            if (response && response.success) {
                this.setStatus('Interface de seleção ativada', 'success');
                // Fecha o popup para que o usuário possa interagir com a página
                window.close();
            } else {
                throw new Error('Falha ao ativar interface de seleção');
            }
        } catch (error) {
            console.error('Erro na captura avançada:', error);
            
            let errorMessage = 'Erro ao abrir captura avançada';
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script não carregado. Recarregue a página.';
            }
            
            this.setStatus(errorMessage, 'error');
        }
    }

    async enhanceContent(enhancementType) {
        if (this.isProcessing) return;

        this.showLoading(`Aplicando ${enhancementType} com IA...`);

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            // Envia solicitação de enhancement para o content script
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'enhanceContent',
                type: enhancementType
            });

            if (response && response.success) {
                this.setStatus(`${enhancementType} aplicado com sucesso`, 'success');
            } else {
                const errorMsg = response?.error || `Erro ao aplicar ${enhancementType}`;
                this.setStatus(errorMsg, 'error');
            }
        } catch (error) {
            console.error(`Erro no enhancement ${enhancementType}:`, error);
            
            let errorMessage = `Erro: ${error.message}`;
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script não carregado. Recarregue a página.';
            }
            
            this.setStatus(errorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadAIService() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = browser.runtime.getURL('ai-service.js');
            script.onload = resolve;
            script.onerror = () => reject(new Error('Falha ao carregar AI Service'));
            document.head.appendChild(script);
        });
    }

    async previewDocument() {
        if (this.isProcessing) return;

        this.showLoading('Gerando preview...');

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'previewDocument',
                format: this.selectedFormat,
                settings: this.getExportSettings()
            });

            if (response && response.success) {
                this.setStatus('Preview gerado com sucesso', 'success');
                // Abre editor com preview
                const editorUrl = browser.runtime.getURL('editor.html');
                browser.tabs.create({ url: editorUrl });
                window.close();
            } else {
                const errorMsg = response?.error || 'Erro ao gerar preview';
                this.setStatus(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Erro no preview:', error);
            
            let errorMessage = 'Erro no preview';
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script não carregado. Recarregue a página.';
            }
            
            this.setStatus(errorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async exportDocument() {
        if (this.isProcessing) return;

        this.showLoading(`Exportando para ${this.selectedFormat.toUpperCase()}...`);

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'exportDocument',
                format: this.selectedFormat,
                settings: this.getExportSettings()
            });

            if (response && response.success) {
                this.setStatus('Documento exportado com sucesso', 'success');
                
                // Adiciona ao histórico
                this.addToHistory({
                    title: currentTab.title,
                    url: currentTab.url,
                    date: new Date(),
                    format: this.selectedFormat,
                    type: 'export'
                });

                // Fecha popup após 2 segundos
                setTimeout(() => window.close(), 2000);
            } else {
                const errorMsg = response?.error || 'Erro na exportação';
                this.setStatus(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Erro na exportação:', error);
            
            let errorMessage = 'Erro na exportação';
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script não carregado. Recarregue a página.';
            }
            
            this.setStatus(errorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    getExportSettings() {
        return {
            imageQuality: this.getElementValue('image-quality', 'medium'),
            pageSize: this.getElementValue('page-size', 'a4'),
            orientation: this.getElementValue('orientation', 'portrait'),
            template: this.getElementValue('template-select', 'default'),
            filters: {
                removeAds: this.getElementChecked('filter-ads', true),
                removeNav: this.getElementChecked('filter-nav', true),
                removeFooter: this.getElementChecked('filter-footer', true),
                removeSidebar: this.getElementChecked('filter-sidebar', true),
                enhanceImages: this.getElementChecked('enhance-images', true),
                cleanText: this.getElementChecked('clean-text', true)
            }
        };
    }

    // Helper para obter valores de elementos com fallback
    getElementValue(id, defaultValue = '') {
        const element = document.getElementById(id);
        return element ? element.value : defaultValue;
    }

    // Helper para obter estado de checkbox com fallback
    getElementChecked(id, defaultValue = false) {
        const element = document.getElementById(id);
        return element ? element.checked : defaultValue;
    }

    applyTemplate(templateName) {
        // Aplica configurações predefinidas baseadas no template
        const templates = {
            default: {
                imageQuality: 'medium',
                pageSize: 'a4',
                orientation: 'portrait'
            },
            academic: {
                imageQuality: 'high',
                pageSize: 'a4',
                orientation: 'portrait'
            },
            business: {
                imageQuality: 'medium',
                pageSize: 'letter',
                orientation: 'portrait'
            },
            report: {
                imageQuality: 'high',
                pageSize: 'a4',
                orientation: 'portrait'
            },
            blog: {
                imageQuality: 'medium',
                pageSize: 'a4',
                orientation: 'portrait'
            },
            newsletter: {
                imageQuality: 'low',
                pageSize: 'letter',
                orientation: 'portrait'
            }
        };

        const template = templates[templateName] || templates.default;
        
        // Aplica configurações com verificação de existência dos elementos
        this.setElementValue('image-quality', template.imageQuality);
        this.setElementValue('page-size', template.pageSize);
        this.setElementValue('orientation', template.orientation);

        this.setStatus(`Template ${templateName} aplicado`, 'success');
    }

    // Helper para definir valores de elementos com verificação
    setElementValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    addToHistory(item) {
        this.history.unshift(item);
        
        // Limita histórico a 50 itens
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        this.saveHistory();
        this.updateHistoryDisplay();
    }

    saveHistory() {
        try {
            browser.storage.local.set({ 'ai-processor-history': this.history });
        } catch (error) {
            console.warn('Erro ao salvar histórico:', error);
        }
    }

    async loadHistory() {
        try {
            const result = await browser.storage.local.get('ai-processor-history');
            this.history = result['ai-processor-history'] || [];
            this.updateHistoryDisplay();
        } catch (error) {
            console.warn('Erro ao carregar histórico:', error);
            this.history = [];
        }
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        
        if (!historyList) return;

        if (this.history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 12px; padding: 20px;">Nenhum item no histórico</p>';
            if(document.getElementById('total-captures')) document.getElementById('total-captures').textContent = '0';
            if(document.getElementById('week-captures')) document.getElementById('week-captures').textContent = '0';
            return;
        }

        historyList.innerHTML = this.history.map(item => `
            <div class="history-item" data-url="${item.url}" data-date="${item.date}" style="cursor: pointer;">
                <div class="history-item-header">
                    <span class="history-item-title">${item.title || 'Sem título'}</span>
                    <span class="history-item-date">${this.formatDate(item.date)}</span>
                </div>
                <div class="history-item-url">${this.truncateUrl(item.url)}</div>
            </div>
        `).join('');

        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const url = item.dataset.url;
                if (url) {
                    browser.tabs.create({ url });
                    window.close();
                }
            });
        });

        if(document.getElementById('total-captures')) document.getElementById('total-captures').textContent = this.history.length;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekCount = this.history.filter(item => new Date(item.date) > weekAgo).length;
        if(document.getElementById('week-captures')) document.getElementById('week-captures').textContent = weekCount;
    }

    filterHistory(searchTerm) {
        const items = document.querySelectorAll('.history-item');
        const term = searchTerm.toLowerCase();
        items.forEach(item => {
            const title = item.querySelector('.history-item-title').textContent.toLowerCase();
            const url = item.querySelector('.history-item-url').textContent.toLowerCase();
            if (title.includes(term) || url.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterHistoryByDate(filter) {
        const items = document.querySelectorAll('.history-item');
        const now = new Date();
        
        items.forEach(item => {
            const itemDate = new Date(item.dataset.date);
            let show = false;

            switch (filter) {
                case 'all':
                    show = true;
                    break;
                case 'today':
                    show = itemDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    show = itemDate >= sevenDaysAgo;
                    break;
                case 'month':
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    show = itemDate >= thirtyDaysAgo;
                    break;
                default:
                    show = true;
            }

            item.style.display = show ? 'block' : 'none';
        });
    }

    clearHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
            this.history = [];
            this.saveHistory();
            this.updateHistoryDisplay();
            this.setStatus('Histórico limpo', 'success');
        }
    }

    openSettings() {
        browser.runtime.openOptionsPage();
        window.close();
    }

    openHelp() {
        browser.tabs.create({ url: 'https://github.com/cayosantanna/ChatAI-to-PDF-for-firefox/blob/main/README.md' });
        window.close();
    }

    openFeedback() {
        browser.tabs.create({ url: 'https://github.com/cayosantanna/ChatAI-to-PDF-for-firefox/issues' });
        window.close();
    }

    showLoading(text = 'Processando...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        this.isProcessing = true;
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        this.isProcessing = false;
    }

    setStatus(message, type = 'info') {
        const statusIndicator = document.getElementById('status-indicator');

        if (statusIndicator) {
            statusIndicator.textContent = message;
            statusIndicator.className = `status-indicator ${type}`;
        }

        // Também atualiza elemento status-text se existir (para compatibilidade)
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
        }

        setTimeout(() => {
            if (statusIndicator) {
                statusIndicator.textContent = 'Pronto';
                statusIndicator.className = 'status-indicator info';
            }
            if (statusText) {
                statusText.textContent = 'Pronto';
            }
        }, 4000);
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diffSeconds = Math.round((now - d) / 1000);
        const diffMinutes = Math.round(diffSeconds / 60);
        const diffHours = Math.round(diffMinutes / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSeconds < 60) return 'agora mesmo';
        if (diffMinutes < 60) return `há ${diffMinutes} min`;
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays === 1) return 'ontem';
        if (diffDays < 7) return `há ${diffDays} dias`;
        
        return d.toLocaleDateString('pt-BR');
    }

    truncateUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            let truncated = urlObj.hostname + (urlObj.pathname.length > 1 ? urlObj.pathname.replace(/\/$/, '') : '');
            if (truncated.length > 40) {
                truncated = truncated.substring(0, 37) + '...';
            }
            return truncated;
        } catch {
            return url.length > 40 ? url.substring(0, 37) + '...' : url;
        }
    }

    updateUI() {
        try {
            this.selectCaptureMode(this.captureMode);
            this.selectFormat(this.selectedFormat);
            this.setStatus('Pronto para capturar', 'info');
        } catch (error) {
            console.error('Erro ao atualizar UI:', error);
        }
    }

    // Método para validar se a extensão pode funcionar na página atual
    async validateCurrentPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }

            const url = new URL(currentTab.url);
            
            // Verifica se é uma página válida (não chrome://, about:, etc)
            if (['chrome:', 'about:', 'moz-extension:', 'chrome-extension:'].some(protocol => url.protocol === protocol)) {
                throw new Error('Esta página não permite a execução da extensão');
            }

            return { valid: true, tab: currentTab };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Método para verificar se o content script está carregado
    async checkContentScript(tabId) {
        try {
            const response = await browser.tabs.sendMessage(tabId, { action: 'ping' });
            return response && response.success;
        } catch (error) {
            return false;
        }
    }

    // Método para injetar content script se necessário
    async ensureContentScript(tabId) {
        try {
            const isLoaded = await this.checkContentScript(tabId);
            if (!isLoaded) {
                await browser.tabs.executeScript(tabId, { file: 'content.js' });
                // Aguarda um pouco para garantir que o script carregou
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return true;
        } catch (error) {
            console.error('Erro ao injetar content script:', error);
            return false;
        }
    }
}

// Inicializa o popup quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.popupController = new AdvancedPopupController();
});
