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
        this.setupFormatting();
        this.setupAutoSave();
        this.setupKeyboardShortcuts();
        this.listenForContentFromExtension();
        this.updateCounts();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('save-btn').addEventListener('click', () => this.saveDocument());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-word-btn').addEventListener('click', () => this.exportToWord());

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
        
        if (autoSaveCheckbox.checked) {
            this.autoSaveInterval = setInterval(() => {
                this.saveDocument(true);
            }, 30000); // Auto-save every 30 seconds
        }

        autoSaveCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.autoSaveInterval = setInterval(() => {
                    this.saveDocument(true);
                }, 30000);
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
        window.addEventListener('message', (event) => {
            if (event.data.type === 'LOAD_CONTENT') {
                this.loadContent(event.data.content, event.data.images, event.data.hostname);
            }
        });
    }

    loadContent(content, images = [], hostname = '') {
        this.currentDocument.content = content;
        this.currentDocument.images = images;
        this.currentDocument.metadata.title = `Conversa - ${hostname} - ${new Date().toLocaleDateString()}`;
        
        this.editor.innerHTML = content;
        this.populateExtractedImages(images);
        this.updateCounts();
        this.updateOutline();
        this.setStatus('Conteúdo carregado com sucesso');
    }

    populateExtractedImages(images) {
        const extractedImagesContainer = document.getElementById('extracted-images');
        const imagesPanelContainer = document.getElementById('images-panel');
        
        extractedImagesContainer.innerHTML = '';
        
        // Remove existing thumbnails from sidebar
        imagesPanelContainer.querySelectorAll('.image-thumbnail').forEach(img => img.remove());
        
        images.forEach((image, index) => {
            // Add to modal
            const img = document.createElement('img');
            img.src = image.dataUrl;
            img.className = 'extracted-image';
            img.dataset.index = index;
            img.addEventListener('click', () => {
                this.selectedImage = image;
                document.querySelectorAll('.extracted-image').forEach(i => i.classList.remove('selected'));
                img.classList.add('selected');
            });
            extractedImagesContainer.appendChild(img);
            
            // Add to sidebar
            const thumbnail = document.createElement('img');
            thumbnail.src = image.dataUrl;
            thumbnail.className = 'image-thumbnail';
            thumbnail.title = image.alt || 'Imagem extraída';
            thumbnail.addEventListener('click', () => {
                this.insertImageIntoEditor(image);
            });
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

        // Update font family and size
        try {
            const fontFamily = document.queryCommandValue('fontName');
            const fontSize = document.queryCommandValue('fontSize');
            
            if (fontFamily) {
                document.getElementById('font-family').value = fontFamily.replace(/"/g, '');
            }
        } catch (e) {
            // Ignore errors from queryCommandValue
        }
    }

    updateCounts() {
        const text = this.editor.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        document.getElementById('word-count').textContent = `Palavras: ${words}`;
        document.getElementById('char-count').textContent = `Caracteres: ${chars}`;
        
        this.currentDocument.metadata.wordCount = words;
        this.currentDocument.metadata.charCount = chars;
    }

    updateOutline() {
        const outline = document.getElementById('document-outline');
        outline.innerHTML = '';
        
        const headings = this.editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading, index) => {
            const item = document.createElement('div');
            item.className = `outline-item ${heading.tagName.toLowerCase()}`;
            item.textContent = heading.textContent || `${heading.tagName} sem título`;
            item.addEventListener('click', () => {
                heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.highlightElement(heading);
            });
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
        document.getElementById('last-saved').textContent = 
            `Última alteração: ${this.currentDocument.metadata.modified.toLocaleTimeString()}`;
    }

    saveDocument(isAutoSave = false) {
        this.currentDocument.content = this.editor.innerHTML;
        
        try {
            localStorage.setItem('ai-chat-pdf-document', JSON.stringify(this.currentDocument));
            
            if (!isAutoSave) {
                this.setStatus('Documento salvo com sucesso');
            }
            
            document.getElementById('last-saved').textContent = 
                `Salvo: ${new Date().toLocaleTimeString()}`;
        } catch (error) {
            this.setStatus('Erro ao salvar documento', 'error');
        }
    }

    loadSavedDocument() {
        try {
            const saved = localStorage.getItem('ai-chat-pdf-document');
            if (saved) {
                this.currentDocument = JSON.parse(saved);
                this.editor.innerHTML = this.currentDocument.content;
                this.updateCounts();
                this.updateOutline();
                this.setStatus('Documento carregado');
            }
        } catch (error) {
            this.setStatus('Erro ao carregar documento', 'error');
        }
    }

    async exportToPDF() {
        this.setStatus('Gerando PDF...');
        
        try {
            // Load html2pdf library
            if (!window.html2pdf) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.3/html2pdf.bundle.min.js');
            }

            const margins = this.getPDFMargins();
            const includeMetadata = document.getElementById('include-metadata').checked;
            
            // Create container for PDF content
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.fontFamily = this.editor.style.fontFamily || 'Times New Roman';
            container.style.fontSize = '16px';
            container.style.lineHeight = '1.6';
            container.style.color = '#000';
            container.style.background = '#fff';
            
            // Add metadata if enabled
            if (includeMetadata) {
                const metadata = document.createElement('div');
                metadata.innerHTML = `
                    <h1>${this.currentDocument.metadata.title}</h1>
                    <p><strong>Criado:</strong> ${this.currentDocument.metadata.created.toLocaleString()}</p>
                    <p><strong>Modificado:</strong> ${this.currentDocument.metadata.modified.toLocaleString()}</p>
                    <p><strong>Palavras:</strong> ${this.currentDocument.metadata.wordCount}</p>
                    <hr style="margin: 30px 0;">
                `;
                container.appendChild(metadata);
            }
            
            // Add main content
            const content = document.createElement('div');
            content.innerHTML = this.editor.innerHTML;
            container.appendChild(content);

            const options = {
                margin: margins,
                filename: `${this.currentDocument.metadata.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    logging: false, 
                    useCORS: true,
                    allowTaint: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait' 
                }
            };

            await html2pdf().set(options).from(container).save();
            this.setStatus('PDF exportado com sucesso');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.setStatus('Erro ao exportar PDF', 'error');
        }
    }

    async exportToWord() {
        this.setStatus('Gerando documento Word...');
        
        try {
            // Create HTML content for Word
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${this.currentDocument.metadata.title}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
                        h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 10pt 0; }
                        p { margin: 6pt 0; }
                        img { max-width: 100%; height: auto; }
                        table { border-collapse: collapse; width: 100%; }
                        td, th { border: 1pt solid black; padding: 4pt; }
                    </style>
                </head>
                <body>
                    ${this.editor.innerHTML}
                </body>
                </html>
            `;

            // Create blob and download
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentDocument.metadata.title.replace(/[^a-z0-9]/gi, '_')}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.setStatus('Documento Word exportado com sucesso');
        } catch (error) {
            console.error('Erro ao exportar Word:', error);
            this.setStatus('Erro ao exportar documento Word', 'error');
        }
    }

    getPDFMargins() {
        const marginSetting = document.getElementById('pdf-margins').value;
        switch (marginSetting) {
            case 'narrow': return [12.7, 12.7, 12.7, 12.7];
            case 'wide': return [38.1, 38.1, 38.1, 38.1];
            default: return [25.4, 25.4, 25.4, 25.4]; // normal
        }
    }

    showImageModal() {
        document.getElementById('insert-image-modal').style.display = 'block';
    }

    showTableModal() {
        document.getElementById('insert-table-modal').style.display = 'block';
    }

    showLinkModal() {
        // Pre-fill with selected text if any
        const selection = window.getSelection();
        const selectedText = selection.toString();
        if (selectedText) {
            document.getElementById('link-text').value = selectedText;
        }
        document.getElementById('insert-link-modal').style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        this.selectedImage = null;
        
        // Clear modal inputs
        const modal = document.getElementById(modalId);
        const inputs = modal.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type !== 'checkbox') {
                input.value = '';
            }
        });
    }

    handleImageUpload(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const image = {
                        src: file.name,
                        dataUrl: e.target.result,
                        alt: file.name,
                        width: 0,
                        height: 0
                    };
                    
                    // Add to current document images
                    this.currentDocument.images.push(image);
                    
                    // Add to extracted images display
                    const img = document.createElement('img');
                    img.src = image.dataUrl;
                    img.className = 'extracted-image';
                    img.addEventListener('click', () => {
                        this.selectedImage = image;
                        document.querySelectorAll('.extracted-image').forEach(i => i.classList.remove('selected'));
                        img.classList.add('selected');
                    });
                    document.getElementById('extracted-images').appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    insertSelectedImage() {
        if (!this.selectedImage) {
            alert('Selecione uma imagem primeiro');
            return;
        }

        this.insertImageIntoEditor(this.selectedImage);
        this.hideModal('insert-image-modal');
    }

    insertImageIntoEditor(image) {
        const img = document.createElement('img');
        img.src = image.dataUrl;
        img.alt = image.alt || '';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.margin = '10px 0';
        img.style.borderRadius = '6px';
        
        this.insertElementAtCursor(img);
        this.markAsModified();
    }

    insertTable() {
        const rows = parseInt(document.getElementById('table-rows').value);
        const cols = parseInt(document.getElementById('table-cols').value);
        
        if (rows < 1 || cols < 1 || rows > 20 || cols > 10) {
            alert('Número inválido de linhas ou colunas');
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '15px 0';

        for (let i = 0; i < rows; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement(i === 0 ? 'th' : 'td');
                cell.style.border = '1px solid #ddd';
                cell.style.padding = '8px';
                cell.innerHTML = i === 0 ? `Cabeçalho ${j + 1}` : '&nbsp;';
                row.appendChild(cell);
            }
            table.appendChild(row);
        }

        this.insertElementAtCursor(table);
        this.hideModal('insert-table-modal');
        this.markAsModified();
    }

    insertLink() {
        const text = document.getElementById('link-text').value;
        const url = document.getElementById('link-url').value;
        
        if (!text || !url) {
            alert('Preencha o texto e a URL do link');
            return;
        }

        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        link.target = '_blank';
        link.style.color = '#3b82f6';
        link.style.textDecoration = 'underline';

        this.insertElementAtCursor(link);
        this.hideModal('insert-link-modal');
        this.markAsModified();
    }

    insertElementAtCursor(element) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
            
            // Move cursor after inserted element
            range.setStartAfter(element);
            range.setEndAfter(element);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no selection, append to editor
            this.editor.appendChild(element);
        }
        
        this.editor.focus();
    }

    zoomIn() {
        if (this.zoomLevel < 200) {
            this.zoomLevel += 10;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > 50) {
            this.zoomLevel -= 10;
            this.applyZoom();
        }
    }

    applyZoom() {
        this.editor.style.zoom = this.zoomLevel / 100;
        document.getElementById('zoom-level').textContent = this.zoomLevel + '%';
    }

    setStatus(message, type = 'info') {
        const statusText = document.getElementById('status-text');
        statusText.textContent = message;
        statusText.className = type;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            statusText.textContent = 'Pronto';
            statusText.className = '';
        }, 3000);
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
    window.documentEditor = new DocumentEditor();
    
    // Try to load any saved document
    window.documentEditor.loadSavedDocument();
});
