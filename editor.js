// Editor JavaScript - Funcionalidade completa estilo Word

class DocumentEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.currentDocument = {
            content: '',
            images: [],
            metadata: {
                title: 'Documento sem título',
                created: new Date(),
                modified: new Date(),
                wordCount: 0,
                charCount: 0
            }
        };
        this.autoSaveInterval = null;
        this.zoomLevel = 100;
        this.selectedImage = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModalEvents(); // Adicionado para garantir que os modais funcionem
        this.setupFormatting();
        this.setupAutoSave();
        this.setupKeyboardShortcuts();
        this.listenForContentFromExtension();
        this.updateCounts();
        this.loadSavedDocument(); // Carrega o documento ao iniciar
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('save-btn').addEventListener('click', () => this.saveDocument());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-word-btn').addEventListener('click', () => this.exportToWord());
        document.getElementById('clear-editor-btn').addEventListener('click', () => this.clearEditor());

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                if (command) {
                    this.execCommand(command);
                    this.updateFormatButtons();
                }
            });
        });

        // Font controls
        document.getElementById('font-family').addEventListener('change', (e) => {
            this.execCommand('fontName', e.target.value);
        });

        document.getElementById('font-size').addEventListener('change', (e) => {
            this.execCommand('fontSize', '3'); // Reset to default first
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const span = document.createElement('span');
                span.style.fontSize = e.target.value + 'pt';
                try {
                    selection.getRangeAt(0).surroundContents(span);
                } catch (e) {
                    console.warn('Could not apply font size to selection');
                }
            }
        });

        // Color pickers
        document.getElementById('text-color').addEventListener('change', (e) => {
            this.execCommand('foreColor', e.target.value);
        });

        document.getElementById('bg-color').addEventListener('change', (e) => {
            this.execCommand('backColor', e.target.value);
        });

        // Insert buttons
        document.getElementById('insert-image-btn').addEventListener('click', () => this.showImageModal());
        document.getElementById('insert-table-btn').addEventListener('click', () => this.showTableModal());
        document.getElementById('insert-link-btn').addEventListener('click', () => this.showLinkModal());

        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => this.execCommand('undo'));
        document.getElementById('redo-btn').addEventListener('click', () => this.execCommand('redo'));

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());

        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateCounts();
            this.updateOutline();
            this.markAsModified();
        });

        this.editor.addEventListener('keyup', () => {
            this.updateFormatButtons();
        });

        this.editor.addEventListener('mouseup', () => {
            this.updateFormatButtons();
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Image modal
        document.getElementById('image-file-input').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
        
        document.getElementById('image-url-input').addEventListener('change', (e) => {
            // Lógica para carregar imagem da URL
            const url = e.target.value;
            if (url) {
                this.insertImageIntoEditor({ dataUrl: url, alt: 'Imagem da Web' });
                this.hideModal('insert-image-modal');
            }
        });

        document.getElementById('insert-selected-image').addEventListener('click', () => {
            this.insertSelectedImage();
        });

        document.getElementById('cancel-image-modal').addEventListener('click', () => {
            this.hideModal('insert-image-modal');
        });

        // Table modal
        document.getElementById('insert-table').addEventListener('click', () => {
            this.insertTable();
        });

        document.getElementById('cancel-table-modal').addEventListener('click', () => {
            this.hideModal('insert-table-modal');
        });

        // Link modal
        document.getElementById('insert-link').addEventListener('click', () => {
            this.insertLink();
        });

        document.getElementById('cancel-link-modal').addEventListener('click', () => {
            this.hideModal('insert-link-modal');
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupFormatting() {
        // Enable rich text editing
        this.editor.contentEditable = true;
        document.execCommand('defaultParagraphSeparator', false, 'p');
    }

    setupAutoSave() {
        const autoSaveCheckbox = document.getElementById('auto-save');
        
        if (!autoSaveCheckbox) return;

        const setupInterval = () => {
            if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = setInterval(() => {
                this.saveDocument(true);
            }, 30000); // Auto-save every 30 seconds
        };

        if (autoSaveCheckbox.checked) {
            setupInterval();
        }

        autoSaveCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.saveDocument(); // Salva imediatamente ao ativar
                setupInterval();
            } else {
                if (this.autoSaveInterval) {
                    clearInterval(this.autoSaveInterval);
                    this.autoSaveInterval = null;
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveDocument();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.execCommand('redo');
                        } else {
                            e.preventDefault();
                            this.execCommand('undo');
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.execCommand('redo');
                        break;
                }
            }
        });
    }

    listenForContentFromExtension() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'loadContent') {
                console.log("Editor recebeu conteúdo:", message.data);
                this.loadContent(message.data.content, message.data.images, message.data.hostname);
                sendResponse({ success: true });
            }
        });
    }

    loadContent(content, images = [], hostname = '') {
        this.currentDocument.content = content;
        this.currentDocument.images = images || [];
        this.currentDocument.metadata.title = `Conteúdo de ${hostname || 'página da web'}`;
        
        document.getElementById('document-title').textContent = this.currentDocument.metadata.title;
        this.editor.innerHTML = content;
        this.populateExtractedImages(this.currentDocument.images);
        this.updateCounts();
        this.updateOutline();
        this.saveDocument(); // Salva o conteúdo recebido
        this.setStatus('Conteúdo carregado e salvo localmente.');
    }

    populateExtractedImages(images) {
        const extractedImagesContainer = document.getElementById('extracted-images');
        const imagesPanelContainer = document.getElementById('images-panel');
        
        if (!extractedImagesContainer || !imagesPanelContainer) return;

        extractedImagesContainer.innerHTML = '';
        imagesPanelContainer.innerHTML = '<h4>Imagens Extraídas</h4>'; // Limpa e adiciona header
        
        if (!images || images.length === 0) {
            imagesPanelContainer.innerHTML += '<p>Nenhuma imagem extraída.</p>';
            return;
        }

        images.forEach((image, index) => {
            const dataUrl = image.base64 || image.dataUrl || image.src;
            if (!dataUrl) return;

            // Add to modal
            const imgContainer = document.createElement('div');
            imgContainer.className = 'extracted-image-container';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.className = 'extracted-image';
            img.dataset.index = index;
            img.onclick = () => {
                this.selectedImage = image;
                document.querySelectorAll('.extracted-image-container').forEach(c => c.classList.remove('selected'));
                imgContainer.classList.add('selected');
            };
            imgContainer.appendChild(img);
            extractedImagesContainer.appendChild(imgContainer);
            
            // Add to sidebar
            const thumbnail = document.createElement('img');
            thumbnail.src = dataUrl;
            thumbnail.className = 'image-thumbnail';
            thumbnail.title = image.alt || `Imagem ${index + 1} - Clique para inserir`;
            thumbnail.onclick = () => {
                this.insertImageIntoEditor({ dataUrl, alt: image.alt });
            };
            imagesPanelContainer.appendChild(thumbnail);
        });
    }

    execCommand(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
    }

    updateFormatButtons() {
        document.querySelectorAll('.format-btn').forEach(btn => {
            const command = btn.dataset.command;
            if (command) {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            }
        });

        try {
            const fontFamily = document.queryCommandValue('fontName').replace(/['"]/g, '');
            const formatBlock = document.queryCommandValue('formatBlock');
            
            const fontSelect = document.getElementById('font-family');
            if (fontSelect) fontSelect.value = fontFamily || 'Arial';

            const formatSelect = document.getElementById('format-block');
            if (formatSelect) formatSelect.value = formatBlock || 'p';

        } catch (e) {
            // Ignore errors, common in some browsers
        }
    }

    updateCounts() {
        const text = this.editor.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        const wordCountEl = document.getElementById('word-count');
        const charCountEl = document.getElementById('char-count');

        if(wordCountEl) wordCountEl.textContent = `Palavras: ${words}`;
        if(charCountEl) charCountEl.textContent = `Caracteres: ${chars}`;
        
        this.currentDocument.metadata.wordCount = words;
        this.currentDocument.metadata.charCount = chars;
    }

    updateOutline() {
        const outline = document.getElementById('document-outline');
        if (!outline) return;
        outline.innerHTML = '<h4>Estrutura</h4>';
        
        const headings = this.editor.querySelectorAll('h1, h2, h3, h4');
        if (headings.length === 0) {
            outline.innerHTML += '<p>Nenhum título encontrado.</p>';
            return;
        }

        headings.forEach((heading) => {
            const item = document.createElement('div');
            item.className = `outline-item ${heading.tagName.toLowerCase()}`;
            item.textContent = heading.textContent || `${heading.tagName} sem título`;
            item.onclick = () => {
                heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.highlightElement(heading);
            };
            outline.appendChild(item);
        });
    }

    highlightElement(element) {
        element.style.background = '#fef3c7';
        setTimeout(() => {
            element.style.background = '';
        }, 2000);
    }

    markAsModified() {
        this.currentDocument.metadata.modified = new Date();
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Não salvo`;
            lastSavedEl.style.color = '#f59e0b';
        }
    }

    saveDocument(isAutoSave = false) {
        this.currentDocument.content = this.editor.innerHTML;
        
        try {
            localStorage.setItem('ai-processor-document', JSON.stringify(this.currentDocument));
            
            const statusMsg = isAutoSave ? 'Progresso salvo automaticamente' : 'Documento salvo com sucesso!';
            this.setStatus(statusMsg, 'success');
            
            const lastSavedEl = document.getElementById('last-saved');
            if (lastSavedEl) {
                lastSavedEl.textContent = `Salvo às ${new Date().toLocaleTimeString()}`;
                lastSavedEl.style.color = '#10b981';
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            this.setStatus('Erro ao salvar documento', 'error');
        }
    }

    loadSavedDocument() {
        try {
            const saved = localStorage.getItem('ai-processor-document');
            if (saved) {
                this.currentDocument = JSON.parse(saved);
                this.editor.innerHTML = this.currentDocument.content || '';
                document.getElementById('document-title').textContent = this.currentDocument.metadata.title || 'Documento sem título';
                this.populateExtractedImages(this.currentDocument.images);
                this.updateCounts();
                this.updateOutline();
                this.setStatus('Documento recuperado da última sessão.');
            } else {
                this.setStatus('Novo documento. Comece a editar!');
            }
        } catch (error) {
            console.error("Erro ao carregar:", error);
            this.setStatus('Erro ao carregar documento salvo', 'error');
            localStorage.removeItem('ai-processor-document'); // Limpa dados corrompidos
        }
    }

    async exportToPDF() {
        this.setStatus('Gerando PDF...');
        
        try {
            if (!window.html2pdf) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            }

            const margins = this.getPDFMargins();
            const includeMetadata = document.getElementById('include-metadata').checked;
            const pageSize = document.getElementById('pdf-page-size').value;
            const orientation = document.getElementById('pdf-orientation').value;
            
            const contentToExport = this.editor.innerHTML;
            const title = this.currentDocument.metadata.title;

            let fullHtml = '';

            if (includeMetadata) {
                fullHtml += `
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                        <h1>${title}</h1>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                `;
            }
            fullHtml += contentToExport;
            
            const element = document.createElement('div');
            element.innerHTML = fullHtml;

            const opt = {
              margin:       margins,
              filename:     `${title.replace(/ /g, '_')}.pdf`,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, logging: true },
              jsPDF:        { unit: 'mm', format: pageSize, orientation: orientation }
            };

            await html2pdf().set(opt).from(element).save();

            this.setStatus('PDF exportado com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao exportar para PDF:", error);
            this.setStatus('Erro ao gerar PDF. Verifique o console.', 'error');
        }
    }

    async exportToWord() {
        this.setStatus('Gerando DOCX...');
        try {
            if (!window.htmlDocx) {
                await this.loadScript('https://unpkg.com/html-docx-js/dist/html-docx.js');
            }

            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${this.currentDocument.metadata.title}</title>
                </head>
                <body>
                    ${this.editor.innerHTML}
                </body>
                </html>
            `;
            
            const fileBuffer = htmlDocx.asBlob(content);
            const url = URL.createObjectURL(fileBuffer);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.currentDocument.metadata.title.replace(/ /g, '_')}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.setStatus('DOCX exportado com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao exportar para Word:", error);
            this.setStatus('Erro ao gerar DOCX. Verifique o console.', 'error');
        }
    }

    getPDFMargins() {
        const top = parseFloat(document.getElementById('margin-top').value) || 15;
        const bottom = parseFloat(document.getElementById('margin-bottom').value) || 15;
        const left = parseFloat(document.getElementById('margin-left').value) || 15;
        const right = parseFloat(document.getElementById('margin-right').value) || 15;
        return [top, left, bottom, right];
    }

    showImageModal() {
        document.getElementById('insert-image-modal').style.display = 'block';
    }

    showTableModal() {
        this.hideAllModals();
        document.getElementById('insert-table-modal').style.display = 'flex';
    }

    showLinkModal() {
        this.hideAllModals();
        document.getElementById('insert-link-modal').style.display = 'flex';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if(modal) modal.style.display = 'none';
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    }

    handleImageUpload(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.insertImageIntoEditor({ dataUrl: e.target.result, alt: file.name });
                };
                reader.readAsDataURL(file);
            }
        }
        this.hideModal('insert-image-modal');
    }

    insertSelectedImage() {
        if (this.selectedImage) {
            this.insertImageIntoEditor(this.selectedImage);
            this.hideModal('insert-image-modal');
        } else {
            alert('Nenhuma imagem selecionada.');
        }
    }

    insertImageIntoEditor(image) {
        const img = document.createElement('img');
        img.src = image.dataUrl || image.base64 || image.src;
        img.alt = image.alt || 'Imagem';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        this.insertElementAtCursor(img);
    }

    insertTable() {
        const rows = parseInt(document.getElementById('table-rows').value, 10);
        const cols = parseInt(document.getElementById('table-cols').value, 10);

        if (rows > 0 && cols > 0) {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';

            for (let i = 0; i < rows; i++) {
                const tr = table.insertRow();
                for (let j = 0; j < cols; j++) {
                    const td = tr.insertCell();
                    td.style.border = '1px solid #ccc';
                    td.style.padding = '8px';
                    td.innerHTML = '<p><br></p>'; // Adiciona um parágrafo para facilitar a edição
                }
            }
            this.insertElementAtCursor(table);
            this.hideModal('insert-table-modal');
        }
    }

    insertLink() {
        const url = document.getElementById('link-url').value;
        const text = document.getElementById('link-text').value || url;

        if (url) {
            this.execCommand('createLink', url);
            // A lógica para mudar o texto é mais complexa, pode ser melhorada
            this.hideModal('insert-link-modal');
        }
    }

    insertElementAtCursor(element) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
        } else {
            this.editor.appendChild(element);
        }
    }

    zoomIn() {
        this.zoomLevel = Math.min(200, this.zoomLevel + 10);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(50, this.zoomLevel - 10);
        this.applyZoom();
    }

    applyZoom() {
        this.editor.style.zoom = `${this.zoomLevel}%`;
        document.getElementById('zoom-level').textContent = `${this.zoomLevel}%`;
    }

    setStatus(message, type = 'info') {
        const statusBar = document.getElementById('status-bar');
        const statusText = document.getElementById('status-text');
        
        if (!statusBar || !statusText) return;

        statusText.textContent = message;
        statusBar.className = `status-bar ${type}`;

        setTimeout(() => {
            statusBar.className = 'status-bar';
        }, 4000);
    }
    
    clearEditor() {
        if (confirm('Tem certeza que deseja limpar todo o conteúdo do editor? Esta ação não pode ser desfeita.')) {
            this.editor.innerHTML = '';
            this.currentDocument = {
                content: '',
                images: [],
                metadata: {
                    title: 'Documento sem título',
                    created: new Date(),
                    modified: new Date(),
                    wordCount: 0,
                    charCount: 0
                }
            };
            this.updateCounts();
            this.updateOutline();
            this.populateExtractedImages([]);
            this.saveDocument();
            this.setStatus('Editor limpo.', 'success');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'editor-page') { // Garante que só rode na página do editor
        window.documentEditor = new DocumentEditor();
    }
});
