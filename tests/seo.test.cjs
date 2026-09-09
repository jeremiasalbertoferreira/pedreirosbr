/* eslint-disable @typescript-eslint/no-require-imports -- Local TS/TSX render harness, no external I/O. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, file) => {
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, file);
};
process.env.OFICIO_SLUG = 'pedreiro';
global.fetch = () => { throw new Error('SEO render tests must not make network requests'); };
const render = component => renderToStaticMarkup(component);
const { SITE_URL } = require('../src/oficios/index.ts');
const { CIDADES } = require('../src/lib/data/cidades.ts');
const { UFS } = require('../src/lib/data/ufs.ts');

test('all existing city URLs stay in the sitemap; dates are not fabricated at build time', () => {
  const sitemap = require('../src/app/sitemap.ts').default();
  assert.equal(sitemap.length, 866);
  assert.equal(new Set(sitemap.map(x => x.url)).size, sitemap.length);
  for (const c of CIDADES) assert.ok(sitemap.some(x => x.url === `${SITE_URL}/pedreiro-em/${c.slug}`));
  for (const path of ['metodologia', 'contato', 'termos', 'politica-de-privacidade', 'exclusao-de-dados']) {
    assert.ok(sitemap.some(x => x.url === `${SITE_URL}/${path}`));
  }
  assert.equal(sitemap.filter(x => x.lastModified).length, 1);
  assert.equal(sitemap.find(x => x.lastModified).lastModified, '2026-09-09');
});

test('public static pages have their own canonical, not an inherited home canonical', () => {
  for (const path of ['', 'calculadoras', 'contato', 'termos', 'politica-de-privacidade', 'exclusao-de-dados', 'metodologia', 'para-pedreiros', 'quanto-cobrar', 'orcamento']) {
    const page = require(`../src/app/${path ? path + '/' : ''}page.tsx`);
    assert.equal(new URL(page.metadata.alternates.canonical, SITE_URL).href.replace(/\/$/, ''), `${SITE_URL}${path ? '/' + path : ''}`);
  }
});

test('city page communicates state estimates and does not publish hidden FAQs or pretend to be a local provider', async () => {
  const page = require('../src/app/pedreiro-em/[cidade]/page.tsx');
  for (const slug of ['sao-paulo-sp', 'osasco-sp', 'curitiba-pr', 'brasilia-df']) {
    const params = Promise.resolve({ cidade: slug });
    const html = render(await page.default({ params }));
    assert.match(html, /Não é uma pesquisa de preços/);
    assert.match(html, /mesmos fatores internos/);
    assert.match(html, /metodologia/);
    assert.match(html, /"@type":"WebPage"/);
    assert.doesNotMatch(html, /"@type":"(?:FAQPage|Service)"/);
    assert.doesNotMatch(html, /Sinduscon|50–60%/);
    assert.equal((await page.generateMetadata({ params })).alternates.canonical, `${SITE_URL}/pedreiro-em/${slug}`);
  }
});

test('calculator schema describes the visible tool, not a hidden FAQ', async () => {
  const page = require('../src/app/calculadoras/[slug]/page.tsx');
  for (const slug of ['reboco', 'muro', 'pintura', 'telhado', 'banheiro']) {
    const html = render(await page.default({ params: Promise.resolve({ slug }) }));
    assert.match(html, /"@type":"WebApplication"/);
    assert.doesNotMatch(html, /FAQPage/);
    assert.match(html, /sem cotação local/);
  }
});

test('AI summary matches the actual methodology, without unsupported official-price claims', async () => {
  const text = await require('../src/app/llms.txt/route.ts').GET().text();
  assert.match(text, /Não há pesquisa municipal comprovada/);
  assert.match(text, /metodologia/);
  assert.doesNotMatch(text, /com base em dados públicos regionais|e orçamentos reais da plataforma/);
});

test('professional form keeps visible labels and explains consent without changing billing consent', () => {
  const { CadastroProfissional } = require('../src/components/CadastroProfissional.tsx');
  const html = render(React.createElement(CadastroProfissional, { ufs: UFS, cidades: CIDADES }));
  assert.equal((html.match(/<label/g) || []).length, 5);
  assert.match(html, /Entrar na fila não inicia cobrança/);
  assert.match(html, /R\$ 97\/mês apenas após minha confirmação/);
  assert.match(html, /cadastro-proximo-passo/);
  assert.doesNotMatch(html, /Trabalhe numa cidade vizinha/);
});

test('home and professional guide no longer promise multiple providers or a universal profit margin', () => {
  const home = render(React.createElement(require('../src/app/page.tsx').default));
  assert.match(home, /único profissional ativo/);
  assert.doesNotMatch(home, /orçamentos reais para comparar|Cliente aparece|Descubra em 30 segundos/);
  const guide = render(React.createElement(require('../src/app/quanto-cobrar/page.tsx').default));
  assert.doesNotMatch(guide, /FAQPage|Cobre entre|10–20%|paga mais e reclama menos/);
});

test('mobile navigation stays visible and www redirect excludes APIs and Next assets', () => {
  const layout = fs.readFileSync(require('node:path').join(__dirname, '../src/app/layout.tsx'), 'utf8');
  assert.doesNotMatch(layout, /hidden rounded-lg/);
  assert.match(layout, /Pular para o conteúdo/);
  const config = require('../next.config.ts').default;
  const [rule] = config.redirects();
  assert.equal(rule.permanent, true);
  assert.equal(rule.has[0].value, 'www.pedreirosbr.com.br');
  assert.match(rule.source, /api/);
  assert.match(rule.source, /_next/);
});
