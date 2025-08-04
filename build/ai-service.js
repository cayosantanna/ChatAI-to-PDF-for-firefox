// Serviço de IA com suporte a modo stealth e contas de usuário

class AIService {
    constructor() {
        this.settings = null;
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const result = await browser.storage.local.get('aiContentSettings');
            this.settings = result.aiContentSettings || {};
        } catch (error) {
            console.error('Erro ao carregar configurações de IA:', error);
            this.settings = {};
        }
    }

    async processWithAI(content, operation = 'summarize') {
        if (!this.settings.aiProvider || this.settings.aiProvider === 'none') {
            throw new Error('Nenhum provedor de IA configurado');
        }

        if (this.settings.useUserAccount) {
            return this.processWithUserAccount(content, operation);
        } else {
            return this.processWithAPI(content, operation);
        }
    }

    async processWithUserAccount(content, operation) {
        const provider = this.settings.aiProvider;
        
        switch (provider) {
            case 'openai':
                return this.processWithChatGPT(content, operation);
            case 'anthropic':
                return this.processWithClaude(content, operation);
            case 'google':
                return this.processWithGemini(content, operation);
            default:
                throw new Error(`Provedor ${provider} não suportado para conta de usuário`);
        }
    }

    async processWithChatGPT(content, operation) {
        try {
            // Abre ChatGPT em nova aba oculta se necessário
            const chatgptTab = await this.getOrCreateTab('https://chatgpt.com');
            
            const prompt = this.buildPrompt(content, operation);
            
            // Injeta script para enviar mensagem no ChatGPT
            const result = await browser.tabs.executeScript(chatgptTab.id, {
                code: `
                    (async function() {
                        const textarea = document.querySelector('textarea[placeholder*="Message"]');
                        const sendButton = document.querySelector('button[data-testid="send-button"]');
                        
                        if (!textarea || !sendButton) {
                            throw new Error('Interface do ChatGPT não encontrada');
                        }
                        
                        // Limpa e insere o prompt
                        textarea.value = '';
                        textarea.focus();
                        textarea.value = ${JSON.stringify(prompt)};
                        
                        // Dispara eventos para simular digitação natural
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        textarea.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Aguarda um pouco para parecer natural
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Clica no botão enviar
                        sendButton.click();
                        
                        // Aguarda a resposta
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const maxAttempts = 60; // 30 segundos
                            
                            const checkForResponse = () => {
                                attempts++;
                                
                                const lastMessage = document.querySelector('article:last-child [data-message-author-role="assistant"]');
                                const isGenerating = document.querySelector('.result-streaming');
                                
                                if (lastMessage && !isGenerating) {
                                    resolve(lastMessage.textContent);
                                } else if (attempts >= maxAttempts) {
                                    reject(new Error('Timeout aguardando resposta do ChatGPT'));
                                } else {
                                    setTimeout(checkForResponse, 500);
                                }
                            };
                            
                            setTimeout(checkForResponse, 1000);
                        });
                    })();
                `
            });

            if (this.settings.stealthMode) {
                // Fecha a aba após usar
                browser.tabs.remove(chatgptTab.id);
            }

            return result[0];
        } catch (error) {
            throw new Error(`Erro ao processar com ChatGPT: ${error.message}`);
        }
    }

    async processWithClaude(content, operation) {
        try {
            const claudeTab = await this.getOrCreateTab('https://claude.ai');
            
            const prompt = this.buildPrompt(content, operation);
            
            const result = await browser.tabs.executeScript(claudeTab.id, {
                code: `
                    (async function() {
                        const textarea = document.querySelector('textarea[placeholder*="Talk to Claude"]');
                        const sendButton = document.querySelector('button[aria-label="Send Message"]');
                        
                        if (!textarea || !sendButton) {
                            throw new Error('Interface do Claude não encontrada');
                        }
                        
                        textarea.value = ${JSON.stringify(prompt)};
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        await new Promise(resolve => setTimeout(resolve, 300));
                        sendButton.click();
                        
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const maxAttempts = 60;
                            
                            const checkForResponse = () => {
                                attempts++;
                                
                                const lastMessage = document.querySelector('[data-testid="message"]:last-child [data-testid="message-content"]');
                                const isGenerating = document.querySelector('.animate-pulse');
                                
                                if (lastMessage && !isGenerating) {
                                    resolve(lastMessage.textContent);
                                } else if (attempts >= maxAttempts) {
                                    reject(new Error('Timeout aguardando resposta do Claude'));
                                } else {
                                    setTimeout(checkForResponse, 500);
                                }
                            };
                            
                            setTimeout(checkForResponse, 1000);
                        });
                    })();
                `
            });

            if (this.settings.stealthMode) {
                browser.tabs.remove(claudeTab.id);
            }

            return result[0];
        } catch (error) {
            throw new Error(`Erro ao processar com Claude: ${error.message}`);
        }
    }

    async processWithGemini(content, operation) {
        try {
            const geminiTab = await this.getOrCreateTab('https://gemini.google.com');
            
            const prompt = this.buildPrompt(content, operation);
            
            const result = await browser.tabs.executeScript(geminiTab.id, {
                code: `
                    (async function() {
                        const textarea = document.querySelector('textarea[aria-label*="Enter a prompt"]') || 
                                        document.querySelector('rich-textarea textarea');
                        const sendButton = document.querySelector('button[aria-label*="Send message"]') ||
                                          document.querySelector('[data-test-id="send-button"]');
                        
                        if (!textarea || !sendButton) {
                            throw new Error('Interface do Gemini não encontrada');
                        }
                        
                        textarea.value = ${JSON.stringify(prompt)};
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        await new Promise(resolve => setTimeout(resolve, 400));
                        sendButton.click();
                        
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const maxAttempts = 60;
                            
                            const checkForResponse = () => {
                                attempts++;
                                
                                const lastMessage = document.querySelector('message-content:last-child') ||
                                                  document.querySelector('.model-response-text:last-child');
                                const isGenerating = document.querySelector('.loading-indicator') ||
                                                    document.querySelector('[aria-label*="Generating"]');
                                
                                if (lastMessage && !isGenerating) {
                                    resolve(lastMessage.textContent);
                                } else if (attempts >= maxAttempts) {
                                    reject(new Error('Timeout aguardando resposta do Gemini'));
                                } else {
                                    setTimeout(checkForResponse, 500);
                                }
                            };
                            
                            setTimeout(checkForResponse, 1000);
                        });
                    })();
                `
            });

            if (this.settings.stealthMode) {
                browser.tabs.remove(geminiTab.id);
            }

            return result[0];
        } catch (error) {
            throw new Error(`Erro ao processar com Gemini: ${error.message}`);
        }
    }

    async processWithAPI(content, operation) {
        const provider = this.settings.aiProvider;
        const apiKey = this.settings.aiApiKey;
        
        if (!apiKey) {
            throw new Error('Chave de API não configurada');
        }

        switch (provider) {
            case 'openai':
                return this.callOpenAIAPI(content, operation, apiKey);
            case 'anthropic':
                return this.callClaudeAPI(content, operation, apiKey);
            case 'google':
                return this.callGeminiAPI(content, operation, apiKey);
            default:
                throw new Error(`Provedor ${provider} não suportado para API`);
        }
    }

    async callOpenAIAPI(content, operation, apiKey) {
        const model = this.settings.openaiModel || 'gpt-4';
        const prompt = this.buildPrompt(content, operation);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callClaudeAPI(content, operation, apiKey) {
        const model = this.settings.claudeModel || 'claude-3-sonnet';
        const prompt = this.buildPrompt(content, operation);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 2000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        return data.content[0].text;
    }

    async callGeminiAPI(content, operation, apiKey) {
        const model = this.settings.geminiModel || 'gemini-pro';
        const prompt = this.buildPrompt(content, operation);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 2000,
                    temperature: 0.7
                }
            })
        });

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    buildPrompt(content, operation) {
        const prompts = {
            summarize: `Por favor, faça um resumo conciso e bem estruturado do seguinte conteúdo:\n\n${content}`,
            keywords: `Extraia as palavras-chave mais importantes do seguinte conteúdo (máximo 10):\n\n${content}`,
            toc: `Gere um índice/sumário baseado no seguinte conteúdo:\n\n${content}`,
            translate: `Traduza o seguinte conteúdo para ${this.settings.translationTarget || 'português'}:\n\n${content}`
        };
        
        return prompts[operation] || prompts.summarize;
    }

    async getOrCreateTab(url) {
        // Verifica se já existe uma aba com a URL
        const tabs = await browser.tabs.query({ url: url + '*' });
        
        if (tabs.length > 0) {
            return tabs[0];
        }
        
        // Cria nova aba
        const tab = await browser.tabs.create({
            url: url,
            active: !this.settings.stealthMode // Aba fica em background no modo stealth
        });
        
        // Aguarda o carregamento
        await this.waitForTabLoad(tab.id);
        return tab;
    }

    async waitForTabLoad(tabId) {
        return new Promise((resolve) => {
            const listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    setTimeout(resolve, 1000); // Aguarda um pouco mais para JS carregar
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }
}

// Instância global
window.aiService = new AIService();
