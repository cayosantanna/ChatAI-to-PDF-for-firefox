#!/usr/bin/env node

// Validador da extensão AI Exporter para Firefox
const fs = require('fs');
const path = require('path');

console.log('🔍 Validando AI Exporter para Firefox...\n');

// 1. Verificar manifest.json
try {
    const manifestPath = './manifest.json';
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('✅ Manifest.json válido');
    console.log(`   📦 Nome: ${manifest.name}`);
    console.log(`   🔧 Versão: ${manifest.version}`);
    console.log(`   🌐 Sites suportados: ${manifest.host_permissions.length}`);
    console.log(`   ⚡ Permissões: ${manifest.permissions.length}`);
    
    if (manifest.browser_specific_settings?.gecko?.id) {
        console.log(`   🦊 Firefox ID: ${manifest.browser_specific_settings.gecko.id}`);
    }
} catch (error) {
    console.error('❌ Erro no manifest.json:', error.message);
    process.exit(1);
}

// 2. Verificar arquivos essenciais
const requiredFiles = [
    'browser-polyfill.js',
    'dist/background/firefox-background.js',
    'dist/popup/index.html',
    'dist/options/index.html',
    'dist/sidebar/firefox-sidebar.html',
    'dist/contentScripts/index.global.js',
    'dist/contentScripts/style.css',
    'assets/icon/16.png',
    'assets/icon/32.png',
    'assets/icon/48.png',
    'assets/icon/128.png',
    '_locales/pt_BR/messages.json',
    '_locales/en/messages.json'
];

let missingFiles = [];
requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        missingFiles.push(file);
    }
});

if (missingFiles.length === 0) {
    console.log('✅ Todos os arquivos essenciais estão presentes');
} else {
    console.error('❌ Arquivos faltando:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
}

// 3. Verificar tamanho da extensão
function getDirSize(dirPath) {
    let size = 0;
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            size += getDirSize(filePath);
        } else {
            size += stat.size;
        }
    });
    
    return size;
}

const totalSize = getDirSize('.');
const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
console.log(`📊 Tamanho total: ${sizeMB} MB`);

if (totalSize > 50 * 1024 * 1024) { // 50MB
    console.warn('⚠️  Extensão muito grande (>50MB)');
}

// 4. Verificar compatibilidade Firefox
console.log('\n🦊 Verificações específicas do Firefox:');

try {
    const backgroundPath = './dist/background/firefox-background.js';
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
    
    if (backgroundContent.includes('browser.')) {
        console.log('✅ Background script usa API nativa do Firefox');
    }
    
    if (backgroundContent.includes('sidebar')) {
        console.log('✅ Suporte a sidebar detectado');
    }
    
    if (backgroundContent.includes('containers')) {
        console.log('✅ Suporte a containers detectado');
    }
    
} catch (error) {
    console.warn('⚠️  Não foi possível verificar o background script');
}

console.log('\n🎉 Validação concluída!');
console.log('\n📋 Próximos passos:');
console.log('1. Abra Firefox');
console.log('2. Digite: about:debugging');
console.log('3. Clique em "Este Firefox"');
console.log('4. Clique em "Carregar extensão temporária"');
console.log('5. Selecione o arquivo manifest.json');
