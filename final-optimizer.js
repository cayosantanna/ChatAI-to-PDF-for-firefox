#!/usr/bin/env node

/**
 * 🦊 Otimizador Final - AI Exporter Firefox Extension
 * Aplica otimizações finais e correções para versão de produção
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class FinalOptimizer {
  constructor() {
    this.basePath = process.cwd();
    this.optimizations = [];
    this.errors = [];
    this.stats = {
      filesOptimized: 0,
      sizeReduced: 0,
      errorsFixed: 0
    };
  }

  async optimize() {
    console.log(`${BLUE}🦊 Otimizador Final - AI Exporter v3.5.4${RESET}\n`);

    try {
      await this.validateStructure();
      await this.optimizeManifest();
      await this.optimizeJavaScript();
      await this.optimizeCSS();
      await this.optimizeHTML();
      await this.optimizeLocales();
      await this.cleanupUnnecessaryFiles();
      await this.validateFinalState();
      
      this.displayResults();
      return this.errors.length === 0;
    } catch (error) {
      console.error(`${RED}❌ Erro crítico durante otimização:${RESET}`, error);
      return false;
    }
  }

  async validateStructure() {
    console.log(`${YELLOW}📋 Validando estrutura do projeto...${RESET}`);
    
    const requiredFiles = [
      'manifest.json',
      'browser-polyfill.js',
      'dist/background/firefox-background.js',
      'dist/popup/index.html',
      'dist/popup/popup.js',
      'dist/options/enhanced-options.html',
      'dist/options/enhanced-options.js',
      'dist/contentScripts/ai-exporter-content.js',
      'dist/contentScripts/style.css',
      'dist/contentScripts/index.global.js'
    ];

    let missingFiles = [];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.basePath, file))) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.errors.push(`Arquivos obrigatórios faltando: ${missingFiles.join(', ')}`);
    } else {
      this.optimizations.push('✅ Todos os arquivos obrigatórios presentes');
    }
  }

  async optimizeManifest() {
    console.log(`${YELLOW}🔧 Otimizando manifest.json...${RESET}`);
    
    const manifestPath = path.join(this.basePath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    let changes = 0;
    
    // Verificar se todos os sites estão listados corretamente
    const expectedSites = [
      "https://chatgpt.com/*",
      "https://claude.ai/*", 
      "https://gemini.google.com/*",
      "https://chat.deepseek.com/*",
      "https://grok.x.ai/*",
      "https://www.perplexity.ai/*",
      "https://aistudio.google.com/*",
      "https://poe.com/*",
      "https://you.com/*",
      "https://copilot.microsoft.com/*",
      "https://character.ai/*"
    ];
    
    // Atualizar host_permissions se necessário
    if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(expectedSites)) {
      manifest.host_permissions = expectedSites;
      changes++;
    }
    
    // Garantir que content_scripts esteja sincronizado
    if (manifest.content_scripts && manifest.content_scripts[0]) {
      if (JSON.stringify(manifest.content_scripts[0].matches) !== JSON.stringify(expectedSites)) {
        manifest.content_scripts[0].matches = expectedSites;
        changes++;
      }
    }
    
    // Otimizar CSP se necessário
    if (!manifest.content_security_policy || 
        !manifest.content_security_policy.extension_pages) {
      manifest.content_security_policy = {
        extension_pages: "script-src 'self' 'unsafe-inline'; object-src 'self'"
      };
      changes++;
    }
    
    if (changes > 0) {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      this.optimizations.push(`🔧 Manifest.json otimizado (${changes} mudanças)`);
      this.stats.filesOptimized++;
    }
  }

  async optimizeJavaScript() {
    console.log(`${YELLOW}⚡ Otimizando arquivos JavaScript...${RESET}`);
    
    const jsFiles = [
      'dist/background/firefox-background.js',
      'dist/popup/popup.js',
      'dist/options/enhanced-options.js',
      'dist/contentScripts/ai-exporter-content.js',
      'dist/contentScripts/index.global.js'
    ];
    
    for (const file of jsFiles) {
      const filePath = path.join(this.basePath, file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalSize = content.length;
        
        // Remover console.logs desnecessários (manter apenas importantes)
        content = content.replace(/console\.log\([^)]*'[^']*debug[^']*'[^)]*\);?\n?/gi, '');
        content = content.replace(/console\.debug\([^)]*\);?\n?/gi, '');
        
        // Remover comentários de desenvolvimento
        content = content.replace(/\/\/ TODO:.*$/gm, '');
        content = content.replace(/\/\/ FIXME:.*$/gm, '');
        content = content.replace(/\/\* DEBUG[\s\S]*?\*\//g, '');
        
        // Otimizar espaços em branco excessivos
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.replace(/[ \t]+$/gm, '');
        
        const newSize = content.length;
        const reduction = originalSize - newSize;
        
        if (reduction > 0) {
          fs.writeFileSync(filePath, content);
          this.optimizations.push(`⚡ ${file} otimizado (-${reduction} bytes)`);
          this.stats.sizeReduced += reduction;
          this.stats.filesOptimized++;
        }
      }
    }
  }

  async optimizeCSS() {
    console.log(`${YELLOW}🎨 Otimizando arquivos CSS...${RESET}`);
    
    const cssFiles = [
      'dist/contentScripts/style.css',
      'dist/sidebar/firefox-sidebar.css'
    ];
    
    for (const file of cssFiles) {
      const filePath = path.join(this.basePath, file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalSize = content.length;
        
        // Remover comentários desnecessários
        content = content.replace(/\/\* TODO[\s\S]*?\*\//g, '');
        content = content.replace(/\/\* DEBUG[\s\S]*?\*\//g, '');
        
        // Otimizar espaços
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.replace(/[ \t]+$/gm, '');
        
        // Combinar regras duplicadas simples
        content = content.replace(/(\.[a-zA-Z-]+)\s*\{\s*([^}]+)\s*\}\s*\1\s*\{\s*([^}]+)\s*\}/g, 
                                  '$1 { $2; $3 }');
        
        const newSize = content.length;
        const reduction = originalSize - newSize;
        
        if (reduction > 0) {
          fs.writeFileSync(filePath, content);
          this.optimizations.push(`🎨 ${file} otimizado (-${reduction} bytes)`);
          this.stats.sizeReduced += reduction;
          this.stats.filesOptimized++;
        }
      }
    }
  }

  async optimizeHTML() {
    console.log(`${YELLOW}📄 Otimizando arquivos HTML...${RESET}`);
    
    const htmlFiles = [
      'dist/popup/index.html',
      'dist/options/enhanced-options.html',
      'dist/options/index.html',
      'dist/sidebar/firefox-sidebar.html',
      'dist/help/index.html',
      'dist/editor/index.html'
    ];
    
    for (const file of htmlFiles) {
      const filePath = path.join(this.basePath, file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalSize = content.length;
        
        // Remover comentários HTML desnecessários
        content = content.replace(/<!--[\s\S]*?-->/g, '');
        
        // Otimizar espaços em branco
        content = content.replace(/\s+/g, ' ');
        content = content.replace(/>\s+</g, '><');
        content = content.replace(/\n{2,}/g, '\n');
        
        // Garantir encoding correto
        if (!content.includes('charset="UTF-8"')) {
          content = content.replace(/<meta/, '<meta charset="UTF-8">\n  <meta');
        }
        
        const newSize = content.length;
        const reduction = originalSize - newSize;
        
        if (reduction > 10) { // Só otimizar se a redução for significativa
          fs.writeFileSync(filePath, content);
          this.optimizations.push(`📄 ${file} otimizado (-${reduction} bytes)`);
          this.stats.sizeReduced += reduction;
          this.stats.filesOptimized++;
        }
      }
    }
  }

  async optimizeLocales() {
    console.log(`${YELLOW}🌐 Otimizando arquivos de localização...${RESET}`);
    
    const localesDir = path.join(this.basePath, '_locales');
    
    if (fs.existsSync(localesDir)) {
      const locales = fs.readdirSync(localesDir);
      
      for (const locale of locales) {
        const messagesFile = path.join(localesDir, locale, 'messages.json');
        
        if (fs.existsSync(messagesFile)) {
          try {
            const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
            const originalSize = JSON.stringify(messages).length;
            
            // Garantir campos obrigatórios
            const requiredKeys = ['extensionName', 'extensionDescription'];
            let modified = false;
            
            for (const key of requiredKeys) {
              if (!messages[key]) {
                console.warn(`${YELLOW}⚠️  Campo ${key} faltando em ${locale}${RESET}`);
                this.errors.push(`Campo obrigatório ${key} faltando em locale ${locale}`);
              }
            }
            
            // Compactar JSON
            const compactJSON = JSON.stringify(messages, null, 2);
            const newSize = compactJSON.length;
            
            if (newSize !== originalSize) {
              fs.writeFileSync(messagesFile, compactJSON);
              modified = true;
            }
            
            if (modified) {
              this.optimizations.push(`🌐 Locale ${locale} otimizado`);
              this.stats.filesOptimized++;
            }
          } catch (error) {
            this.errors.push(`Erro no arquivo de locale ${locale}: ${error.message}`);
          }
        }
      }
    }
  }

  async cleanupUnnecessaryFiles() {
    console.log(`${YELLOW}🧹 Limpando arquivos desnecessários...${RESET}`);
    
    const unnecessaryPatterns = [
      '**/*.tmp',
      '**/*.log',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.bak',
      '**/*.orig',
      'node_modules/**',
      '.git/**',
      '**/*.map'
    ];
    
    // Arquivos específicos desnecessários
    const specificFiles = [
      'package.json',
      'package-lock.json',
      'webpack.config.js',
      'tsconfig.json',
      '.gitignore',
      'yarn.lock'
    ];
    
    let cleanedFiles = 0;
    
    for (const file of specificFiles) {
      const filePath = path.join(this.basePath, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        cleanedFiles++;
      }
    }
    
    if (cleanedFiles > 0) {
      this.optimizations.push(`🧹 ${cleanedFiles} arquivos desnecessários removidos`);
    }
  }

  async validateFinalState() {
    console.log(`${YELLOW}✅ Validando estado final...${RESET}`);
    
    try {
      // Validar manifest.json
      const manifest = JSON.parse(fs.readFileSync(path.join(this.basePath, 'manifest.json'), 'utf8'));
      
      if (!manifest.version) {
        this.errors.push('Versão não especificada no manifest');
      }
      
      if (!manifest.permissions || manifest.permissions.length === 0) {
        this.errors.push('Nenhuma permissão especificada no manifest');
      }
      
      // Verificar tamanho total
      const totalSize = this.calculateDirectorySize(this.basePath);
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (totalSize > maxSize) {
        this.errors.push(`Extensão muito grande: ${(totalSize / 1024 / 1024).toFixed(2)}MB (máximo: 50MB)`);
      } else {
        this.optimizations.push(`📏 Tamanho final: ${(totalSize / 1024).toFixed(2)}KB`);
      }
      
    } catch (error) {
      this.errors.push(`Erro na validação final: ${error.message}`);
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
      const stats = fs.statSync(currentPath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          calculateSize(path.join(currentPath, file));
        });
      }
    }
    
    calculateSize(dirPath);
    return totalSize;
  }

  displayResults() {
    console.log(`\n${BLUE}📊 RELATÓRIO DE OTIMIZAÇÃO FINAL${RESET}`);
    console.log(`═══════════════════════════════════════`);
    
    console.log(`\n${GREEN}✅ OTIMIZAÇÕES APLICADAS:${RESET}`);
    this.optimizations.forEach(opt => console.log(`  ${opt}`));
    
    if (this.errors.length > 0) {
      console.log(`\n${RED}❌ PROBLEMAS ENCONTRADOS:${RESET}`);
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    console.log(`\n${BLUE}📈 ESTATÍSTICAS:${RESET}`);
    console.log(`  📁 Arquivos otimizados: ${this.stats.filesOptimized}`);
    console.log(`  💾 Tamanho reduzido: ${this.stats.sizeReduced} bytes`);
    console.log(`  🔧 Problemas corrigidos: ${this.stats.errorsFixed}`);
    
    if (this.errors.length === 0) {
      console.log(`\n${GREEN}🎉 OTIMIZAÇÃO FINAL CONCLUÍDA COM SUCESSO!${RESET}`);
      console.log(`${GREEN}🦊 A extensão AI Exporter está pronta para produção!${RESET}`);
    } else {
      console.log(`\n${RED}⚠️  OTIMIZAÇÃO CONCLUÍDA COM PROBLEMAS${RESET}`);
      console.log(`${YELLOW}Por favor, resolva os problemas listados acima.${RESET}`);
    }
  }
}

// Executar otimização
if (require.main === module) {
  const optimizer = new FinalOptimizer();
  optimizer.optimize().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = FinalOptimizer;
