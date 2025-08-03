    async quickCapture() {
        if (this.isProcessing) return;

        this.showLoading('Capturando conteúdo...');
        
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('Nenhuma aba ativa encontrada');
            }
            
            console.log('Enviando mensagem para tab:', currentTab.url);
            
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'quickCapture',
                mode: this.captureMode,
                hostname: new URL(currentTab.url).hostname
            });

            console.log('Resposta recebida:', response);

            if (response && response.success) {
                this.setStatus('Conteúdo capturado com sucesso', 'success');
                
                // Adiciona ao histórico
                this.addToHistory({
                    title: currentTab.title,
                    url: currentTab.url,
                    date: new Date(),
                    mode: this.captureMode,
                    type: 'quick'
                });

                // Muda para a aba de processamento
                this.switchTab('process');
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
