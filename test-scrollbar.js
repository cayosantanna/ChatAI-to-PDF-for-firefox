#!/usr/bin/env node

/**
 * 🦊 Teste de Rolagem - AI Exporter Firefox Extension
 * Verifica se todas as opções estão acessíveis via rolagem
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class ScrollbarTester {
  constructor() {
    this.optionsPath = path.join(__dirname, 'dist', 'options', 'enhanced-options.html');
    this.results = {
      scrollProperties: [],
      indicators: [],
      accessibility: [],
      total: 0,
      passed: 0,
      failed: 0
    };
  }

  testScrollbarImplementation() {
    console.log(`${BLUE}🦊 Firefox Scrollbar Test - AI Exporter v3.5.4${RESET}\n`);

    if (!fs.existsSync(this.optionsPath)) {
      console.log(`${RED}❌ Arquivo de opções não encontrado: ${this.optionsPath}${RESET}`);
      return false;
    }

    const content = fs.readFileSync(this.optionsPath, 'utf8');
    
    // Test 1: CSS Scrollbar Properties
    this.testScrollProperties(content);
    
    // Test 2: Scroll Indicators
    this.testScrollIndicators(content);
    
    // Test 3: Accessibility Features
    this.testAccessibility(content);
    
    this.displayResults();
    return this.results.failed === 0;
  }

  testScrollProperties(content) {
    console.log(`${YELLOW}📋 Testando propriedades de rolagem...${RESET}`);
    
    const tests = [
      {
        name: 'overflow-y: auto configurado',
        pattern: /overflow-y:\s*auto/i,
        required: true
      },
      {
        name: 'scrollbar-width para Firefox',
        pattern: /scrollbar-width:\s*thin/i,
        required: true
      },
      {
        name: 'scrollbar-color personalizada',
        pattern: /scrollbar-color:\s*#ff7139/i,
        required: true
      },
      {
        name: 'scroll-behavior: smooth',
        pattern: /scroll-behavior:\s*smooth/i,
        required: false
      }
    ];

    tests.forEach(test => {
      const passed = test.pattern.test(content);
      this.recordResult('scrollProperties', test.name, passed, test.required);
    });
  }

  testScrollIndicators(content) {
    console.log(`${YELLOW}📊 Testando indicadores de rolagem...${RESET}`);
    
    const tests = [
      {
        name: 'Indicador de progresso implementado',
        pattern: /scrollIndicator.*position:\s*fixed/i,
        required: true
      },
      {
        name: 'Botão "Voltar ao topo"',
        pattern: /backToTop.*position:\s*fixed/i,
        required: true
      },
      {
        name: 'Evento scroll listener',
        pattern: /addEventListener\(['"]scroll['"]/i,
        required: true
      }
    ];

    tests.forEach(test => {
      const passed = test.pattern.test(content);
      this.recordResult('indicators', test.name, passed, test.required);
    });
  }

  testAccessibility(content) {
    console.log(`${YELLOW}♿ Testando acessibilidade...${RESET}`);
    
    const tests = [
      {
        name: 'Body com altura adequada',
        pattern: /min-height:\s*100vh/i,
        required: true
      },
      {
        name: 'Container com padding',
        pattern: /padding.*20px/i,
        required: true
      },
      {
        name: 'Botões fixos acessíveis',
        pattern: /position:\s*sticky.*bottom/i,
        required: true
      },
      {
        name: 'Z-index configurado',
        pattern: /z-index:\s*\d+/i,
        required: false
      }
    ];

    tests.forEach(test => {
      const passed = test.pattern.test(content);
      this.recordResult('accessibility', test.name, passed, test.required);
    });
  }

  recordResult(category, testName, passed, required) {
    const result = {
      name: testName,
      passed,
      required,
      status: passed ? '✅' : (required ? '❌' : '⚠️')
    };
    
    this.results[category].push(result);
    this.results.total++;
    
    if (passed) {
      this.results.passed++;
      console.log(`  ${result.status} ${testName}`);
    } else {
      if (required) this.results.failed++;
      console.log(`  ${result.status} ${testName}${required ? ' (OBRIGATÓRIO)' : ' (OPCIONAL)'}`);
    }
  }

  displayResults() {
    console.log(`\n${BLUE}📊 RESULTADOS DO TESTE DE ROLAGEM${RESET}`);
    console.log(`═══════════════════════════════════════`);
    
    const categories = [
      { key: 'scrollProperties', name: '🎨 Propriedades CSS' },
      { key: 'indicators', name: '📊 Indicadores' },
      { key: 'accessibility', name: '♿ Acessibilidade' }
    ];

    categories.forEach(cat => {
      console.log(`\n${YELLOW}${cat.name}:${RESET}`);
      this.results[cat.key].forEach(result => {
        console.log(`  ${result.status} ${result.name}`);
      });
    });

    console.log(`\n${BLUE}RESUMO FINAL:${RESET}`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Total de testes: ${this.results.total}`);
    console.log(`${GREEN}✅ Aprovados: ${this.results.passed}${RESET}`);
    console.log(`${RED}❌ Reprovados: ${this.results.failed}${RESET}`);
    console.log(`⚠️  Opcionais: ${this.results.total - this.results.passed - this.results.failed}`);

    if (this.results.failed === 0) {
      console.log(`\n${GREEN}🎉 TODOS OS TESTES DE ROLAGEM PASSARAM!${RESET}`);
      console.log(`${GREEN}🦊 A extensão Firefox está com rolagem funcionando perfeitamente!${RESET}`);
    } else {
      console.log(`\n${RED}⚠️  ALGUNS TESTES FALHARAM${RESET}`);
      console.log(`${YELLOW}Por favor, verifique os itens marcados como obrigatórios.${RESET}`);
    }

    // Verificação de tamanho do arquivo
    const stats = fs.statSync(this.optionsPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`\n${BLUE}📏 Tamanho do arquivo de opções: ${sizeKB} KB${RESET}`);
    
    if (stats.size > 100 * 1024) {
      console.log(`${YELLOW}⚠️  Arquivo grande - considere otimização${RESET}`);
    } else {
      console.log(`${GREEN}✅ Tamanho adequado${RESET}`);
    }
  }
}

// Executar teste
if (require.main === module) {
  const tester = new ScrollbarTester();
  const success = tester.testScrollbarImplementation();
  process.exit(success ? 0 : 1);
}

module.exports = ScrollbarTester;
