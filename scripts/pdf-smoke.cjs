/* eslint-disable @typescript-eslint/no-require-imports -- QA do PDF existente em jsPDF. */
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { criarOrcamentoPdf } = require('../src/lib/orcamento-pdf.ts');
fs.mkdirSync('tmp/pdfs', { recursive: true });
const { doc, total } = criarOrcamentoPdf({
  profissional: 'Empresa de Teste - Serviços de Alvenaria e Acabamento', whatsapp: '11 90000-0000', cliente: 'Cliente fictício para controle de qualidade',
  local: 'São Paulo - SP', validade: '15 dias', dominio: 'pedreirosbr.com.br',
  obs: 'Dados fictícios para teste. Materiais e mão de obra discriminados; qualquer alteração precisa de acordo entre as partes. '.repeat(15),
  itens: Array.from({ length: 24 }, (_, i) => ({ descricao: `Item ${i + 1}: preparação e acabamento de parede com descrição longa para validar quebra de linha e paginação, incluindo proteção do ambiente e limpeza após conclusão.`, quantidade: i + 1, unidade: 'm²', valorUnitario: 97.35 })),
});
doc.save('tmp/pdfs/orcamento-qa.pdf');
console.log(JSON.stringify({ total, pages: doc.getNumberOfPages() }));
