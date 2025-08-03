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
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        await this.detectCurrentSite();
        await this.scanPageContent();
        this.loadHistory();
        this.updateUI();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Capture modes
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCaptureMode(e.currentTarget.dataset.mode);
            });
        });

        // Format selection
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectFormat(e.currentTarget.dataset.format);
            });
        });

        // Action buttons
        document.getElementById('quick-capture').addEventListener('click', () => this.quickCapture());
        document.getElementById('advanced-capture').addEventListener('click', () => this.advancedCapture());
        document.getElementById('preview-btn').addEventListener('click', () => this.previewDocument());
        document.getElementById('export-btn').addEventListener('click', () => this.exportDocument());

        // Enhancement buttons
        document.getElementById('summarize').addEventListener('click', () => this.enhanceContent('summarize'));
        document.getElementById('translate').addEventListener('click', () => this.enhanceContent('translate'));
        document.getElementById('extract-key').addEventListener('click', () => this.enhanceContent('extract-key'));
        document.getElementById('generate-toc').addEventListener('click', () => this.enhanceContent('generate-toc'));

        // History management
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
        document.getElementById('history-search').addEventListener('input', (e) => this.filterHistory(e.target.value));
        document.getElementById('history-filter').addEventListener('change', (e) => this.filterHistoryByDate(e.target.value));

        // Footer actions
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('help-btn').addEventListener('click', () => this.openHelp());
        document.getElementById('feedback-btn').addEventListener('click', () => this.openFeedback());

        // Template selection
        document.getElementById('template-select').addEventListener('change', (e) => this.applyTemplate(e.target.value));
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
        // Remove active class from all tabs and content
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');

        this.currentTab = tabName;
    }

    selectCaptureMode(mode) {
        // Remove active class from all mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected mode
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        this.captureMode = mode;
    }

    selectFormat(format) {
        // Remove selected class from all format buttons
        document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('selected'));
        
        // Add selected class to selected format
        document.querySelector(`[data-format="${format}"]`).classList.add('selected');
        
        this.selectedFormat = format;
    }

    async quickCapture() {
            }
        } catch (error) {
            console.error('Erro na captura rápida:', error);
            this.setStatus('Erro na captura', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async advancedCapture() {
        if (this.isProcessing) return;

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            // Abre a interface de seleção avançada
            await browser.tabs.sendMessage(currentTab.id, {
                action: 'openAdvancedCapture',
                mode: this.captureMode
            });

            // Fecha o popup para que o usuário possa interagir com a página
            window.close();
        } catch (error) {
            console.error('Erro na captura avançada:', error);
            this.setStatus('Erro ao abrir captura avançada', 'error');
        }
    }

    async enhanceContent(enhancementType) {
        if (this.isProcessing) return;

        this.showLoading(`Aplicando ${enhancementType}...`);

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'enhanceContent',
                type: enhancementType
            });

            if (response && response.success) {
                this.setStatus(`${enhancementType} aplicado com sucesso`, 'success');
            } else {
                this.setStatus(`Erro ao aplicar ${enhancementType}`, 'error');
            }
        } catch (error) {
            console.error(`Erro no enhancement ${enhancementType}:`, error);
            this.setStatus('Erro no processamento', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async previewDocument() {
        if (this.isProcessing) return;

        this.showLoading('Gerando preview...');

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'previewDocument',
                format: this.selectedFormat,
                settings: this.getExportSettings()
            });

            if (response && response.success) {
                // Abre preview em nova aba
                const previewUrl = browser.runtime.getURL('preview.html');
                browser.tabs.create({ url: previewUrl });
                window.close();
            } else {
                this.setStatus('Erro ao gerar preview', 'error');
            }
        } catch (error) {
            console.error('Erro no preview:', error);
            this.setStatus('Erro no preview', 'error');
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
                this.setStatus('Erro na exportação', 'error');
            }
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.setStatus('Erro na exportação', 'error');
        } finally {
            this.hideLoading();
        }
    }

    getExportSettings() {
        return {
            imageQuality: document.getElementById('image-quality').value,
            pageSize: document.getElementById('page-size').value,
            orientation: document.getElementById('orientation').value,
            template: document.getElementById('template-select').value,
            filters: {
                removeAds: document.getElementById('filter-ads').checked,
                removeNav: document.getElementById('filter-nav').checked,
                removeFooter: document.getElementById('filter-footer').checked,
                removeSidebar: document.getElementById('filter-sidebar').checked,
                enhanceImages: document.getElementById('enhance-images').checked,
                cleanText: document.getElementById('clean-text').checked
            }
        };
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
        
        document.getElementById('image-quality').value = template.imageQuality;
        document.getElementById('page-size').value = template.pageSize;
        document.getElementById('orientation').value = template.orientation;

        this.setStatus(`Template ${templateName} aplicado`, 'success');
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
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 12px; padding: 20px;">Nenhum item no histórico</p>';
            return;
        }

        historyList.innerHTML = this.history.map(item => `
            <div class="history-item" data-url="${item.url}">
                <div class="history-item-header">
                    <span class="history-item-title">${item.title || 'Sem título'}</span>
                    <span class="history-item-date">${this.formatDate(item.date)}</span>
                </div>
                <a href="#" class="history-item-url">${this.truncateUrl(item.url)}</a>
            </div>
        `).join('');

        // Adiciona event listeners aos itens do histórico
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                browser.tabs.create({ url });
                window.close();
            });
        });

        // Atualiza estatísticas
        document.getElementById('total-captures').textContent = this.history.length;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekCount = this.history.filter(item => new Date(item.date) > weekAgo).length;
        document.getElementById('week-captures').textContent = weekCount;
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
            let show = true;

            switch (filter) {
                case 'today':
                    show = itemDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    show = itemDate > weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    show = itemDate > monthAgo;
                    break;
                default:
                    show = true;
            }

            item.style.display = show ? 'block' : 'none';
        });
    }

    clearHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            this.history = [];
            this.saveHistory();
            this.updateHistoryDisplay();
            this.setStatus('Histórico limpo', 'success');
        }
    }

    openSettings() {
        browser.tabs.create({ url: browser.runtime.getURL('options.html') });
        window.close();
    }

    openHelp() {
        browser.tabs.create({ url: browser.runtime.getURL('help.html') });
        window.close();
    }

    openFeedback() {
        browser.tabs.create({ url: 'https://github.com/your-repo/issues' });
        window.close();
    }

    showLoading(text = 'Processando...') {
        this.isProcessing = true;
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        this.isProcessing = false;
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    setStatus(message, type = 'info') {
        const indicator = document.getElementById('status-indicator');
        indicator.textContent = message;
        indicator.className = type;

        // Remove status após 3 segundos
        setTimeout(() => {
            indicator.textContent = 'Pronto';
            indicator.className = '';
        }, 3000);
    }

    formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diffHours = Math.abs(now - d) / 36e5;

        if (diffHours < 1) {
            return 'Agora há pouco';
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h atrás`;
        } else if (diffHours < 168) { // 7 days
            return `${Math.floor(diffHours / 24)}d atrás`;
        } else {
            return d.toLocaleDateString('pt-BR');
        }
    }

    truncateUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const pathname = urlObj.pathname;
            
            if (pathname.length > 30) {
                return hostname + pathname.substring(0, 27) + '...';
            }
            return hostname + pathname;
        } catch {
            return url.length > 40 ? url.substring(0, 37) + '...' : url;
        }
    }

    updateUI() {
        // Seleciona modo padrão
        document.querySelector('[data-mode="smart"]').classList.add('active');
        
        // Seleciona formato padrão
        document.querySelector('[data-format="pdf"]').classList.add('selected');
        
        // Atualiza status
        this.setStatus('Pronto para capturar');
    }
}

// Inicializa o popup quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.popupController = new AdvancedPopupController();
});
