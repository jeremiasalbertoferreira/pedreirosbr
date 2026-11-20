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
global.fetch = () => { throw new Error('Calculadoras de quantidade não podem usar a rede'); };

const { QUANTIDADES, getQuantidade, padroes, validar, campoVisivel } = require('../src/lib/quantidades/index.ts');
const { getOficioAtivo, SITE_URL } = require('../src/oficios/index.ts');

/** Roda a calculadora com os valores iniciais, trocando só o que o teste informar. */
const rodar = (slug, troca = {}) => {
  const calc = getQuantidade(slug);
  const valores = { ...padroes(calc), ...troca };
  assert.equal(validar(calc, valores), null);
  const r = calc.calcular(valores);
  return { principal: r.principal.valor, linhas: Object.fromEntries(r.linhas.map(l => [l.rotulo, l.valor])), lista: r.lista };
};

test('registro: slugs únicos, sem colidir com as calculadoras de preço, e padrões válidos', () => {
  const slugs = QUANTIDADES.map(q => q.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(slugs.length, 12);
  for (const s of getOficioAtivo().servicos) assert.ok(!slugs.includes(s.slug));
  for (const q of QUANTIDADES) {
    assert.match(q.slug, /^[a-z0-9-]+$/);
    assert.equal(validar(q, padroes(q)), null, q.slug);
    const r = q.calcular(padroes(q));
    assert.ok(r.principal.valor && r.linhas.length && r.lista.length, q.slug);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(r)), q.slug);
    assert.ok(q.comoCalculamos.length >= 3 && q.limites.length >= 2, q.slug);
    assert.ok(q.descricao.length <= 170, `${q.slug}: descrição longa demais para a busca`);
  }
});

// Cada valor esperado abaixo foi conferido à mão, a partir da fórmula publicada na página.
test('tijolos e blocos: 25 por m² no 9×19×19 e 12,5 no bloco de 39 cm', () => {
  const r = rodar('tijolos-e-blocos'); // 4 × 2,7 = 10,8 m²; 10,8 × 25 × 1,05 = 283,5
  assert.equal(r.linhas['Peças por m²'], '25');
  assert.equal(r.principal, '284 peças');
  assert.equal(r.linhas['Argamassa de assentamento (volume das juntas)'], '95 litros'); // 10,8 × 0,09 × (1 − 361/400)
  assert.equal(rodar('tijolos-e-blocos', { peca: 'concreto-14x19x39' }).linhas['Peças por m²'], '12,5');
  assert.equal(rodar('tijolos-e-blocos', { peca: 'macico-meia-vez' }).linhas['Peças por m²'], '79,4');
  assert.equal(rodar('tijolos-e-blocos', { vaos: 1.8, perda: 0 }).principal, '225 peças'); // 9 m² × 25
});
test('concreto: placa, peça circular e sacos de cimento', () => {
  const r = rodar('concreto'); // 5 × 4 × 0,10 = 2 m³; +5% = 2,1; 2,1 × 350 ÷ 50 = 14,7
  assert.equal(r.principal, '2,1 m³');
  assert.equal(r.linhas['Cimento estimado'], '15 sacos de 50 kg');
  const broca = rodar('concreto', { forma: 'circular', comprimento: 3, diametro: 25, quantidade: 10, perda: 0 });
  assert.equal(broca.linhas['Volume de cada peça, sem perdas'], '0,147 m³'); // π × 0,125² × 3
  assert.equal(broca.principal, '1,47 m³');
});
test('pisos e azulejos: caixas, peças, rejunte e rodapé', () => {
  const r = rodar('pisos-e-azulejos', { rodape: 18 }); // 20 × 1,10 = 22 m²
  assert.equal(r.principal, '22 m²');
  assert.equal(r.linhas['Caixas'], '9 caixas'); // 22 ÷ 2,5 = 8,8
  assert.equal(r.linhas['Peças'], '62 peças'); // 22 ÷ 0,36 = 61,1
  assert.equal(r.linhas['Rejunte estimado'], '2,5 kg (0,13 kg por m²)'); // 1200 × 8 × 3 × 1,58 ÷ 360000 = 0,1264
  assert.equal(r.linhas['Rodapé'], '18 m (33 peças de 60 cm, com a margem)'); // 19,8 ÷ 0,6
  assert.equal(rodar('pisos-e-azulejos').linhas['Rodapé'], undefined);
});
test('telhas: beiral e inclinação aumentam a área', () => {
  const r = rodar('telhas'); // (10+1) × (8+1) = 99 m²; × 1,04403 = 103,36; × 16 × 1,05 = 1736,4
  assert.equal(r.linhas['Área em planta, com beiral'], '99 m²');
  assert.equal(r.linhas['Área inclinada do telhado'], '103,36 m² (fator 1,044)');
  assert.equal(r.principal, '1.737 telhas');
  assert.equal(r.linhas['Cumeeiras'], '30 peças');
});
test('inclinação de telhado: 30% são 16,7° e 100% são 45°', () => {
  const r = rodar('inclinacao-de-telhado'); // vão 4 m, 30%
  assert.equal(r.principal, '30% (16,7°)');
  assert.equal(r.linhas['Altura da cumeeira'], '1,2 m');
  assert.equal(r.linhas['Comprimento da peça inclinada, sem beiral'], '4,18 m'); // √(16 + 1,44)
  assert.equal(rodar('inclinacao-de-telhado', { inclinacao: 100 }).principal, '100% (45°)');
  assert.equal(rodar('inclinacao-de-telhado', { modo: 'altura', altura: 2 }).principal, '50% (26,6°)');
});
test('escada: degraus iguais e piso pela regra de Blondel', () => {
  const r = rodar('escada'); // 280 ÷ 17,5 = 16; piso = 64 − 35 = 29; 15 × 29 = 435 cm
  assert.equal(r.principal, '16 espelhos de 17,5 cm');
  assert.equal(r.linhas['Profundidade de cada piso'], '29 cm');
  assert.equal(r.linhas['Comprimento ocupado em planta'], '4,35 m');
  assert.equal(rodar('escada', { altura: 300 }).principal, '17 espelhos de 17,6 cm'); // 300 ÷ 17 = 17,65
});
test('metros quadrados: cinco formatos e desconto de vãos', () => {
  assert.equal(rodar('metros-quadrados').principal, '20 m²');
  assert.equal(rodar('metros-quadrados').linhas['Perímetro'], '18 m');
  assert.equal(rodar('metros-quadrados', { vaos: 1.68 }).principal, '18,32 m²');
  assert.equal(rodar('metros-quadrados', { forma: 'l' }).principal, '23 m²'); // 20 + 2 × 1,5
  assert.equal(rodar('metros-quadrados', { forma: 'triangulo' }).principal, '9 m²'); // 6 × 3 ÷ 2
  assert.equal(rodar('metros-quadrados', { forma: 'trapezio' }).principal, '15 m²'); // (6 + 4) ÷ 2 × 3
  assert.equal(rodar('metros-quadrados', { forma: 'circulo' }).principal, '7,07 m²'); // π × 1,5²
});
test('drywall: chapas pelas duas faces, montantes e guias', () => {
  const r = rodar('drywall'); // 10,8 × 2 × 1,10 = 23,76 ÷ 2,88 = 8,25
  assert.equal(r.principal, '9 chapas');
  assert.equal(r.linhas['Montantes, na altura da parede'], '8 peças'); // 4 ÷ 0,6 = 6,67 → 7, mais 1
  assert.equal(r.linhas['Guias de piso e teto'], '3 barras de 3 m'); // 8 ÷ 3
  assert.equal(rodar('drywall', { faces: '1', espacamento: '40' }).linhas['Montantes, na altura da parede'], '11 peças');
});
test('areia, brita e terra: m³, latas, carrinhos e peso', () => {
  const r = rodar('areia-brita-e-terra'); // 5 × 4 × 0,05 = 1 m³; +10% = 1,1
  assert.equal(r.principal, '1,1 m³');
  assert.equal(r.linhas['Em latas de 18 litros'], '62 latas'); // 1100 ÷ 18 = 61,1
  assert.equal(r.linhas['Em carrinhos de 60 litros'], '19 carrinhos');
  assert.equal(r.linhas['Peso aproximado'], '1,7 t'); // 1,1 × 1,5 = 1,65
  assert.equal(rodar('areia-brita-e-terra', { perda: 0, espessura: 100, comprimento: 1, largura: 1 }).linhas['Em latas de 18 litros'], '56 latas');
});
test('contrapiso: caimento aumenta a espessura média', () => {
  assert.equal(rodar('contrapiso').principal, '0,63 m³'); // 20 × 0,03 × 1,05
  const r = rodar('contrapiso', { caimento: 1, distancia: 3 }); // 3 a 6 cm, média 4,5
  assert.equal(r.linhas['Espessura no ponto mais alto'], '6 cm');
  assert.equal(r.linhas['Espessura média'], '4,5 cm');
  assert.equal(r.principal, '0,95 m³'); // 20 × 0,045 × 1,05 = 0,945
});
test('forro de PVC: aproveita a sobra da régua e conta emenda quando a régua é curta', () => {
  const r = rodar('forro-pvc'); // 4 ÷ 0,2 = 20 fileiras de 3 m; régua de 6 m rende 2; 10 × 1,05 = 10,5
  assert.equal(r.principal, '11 réguas de 6 m');
  assert.equal(r.linhas['Rodaforro'], '14 m (3 barras de 6 m)');
  assert.equal(rodar('forro-pvc', { reguaComprimento: 4, perda: 0 }).principal, '20 réguas de 4 m'); // sobra de 1 m não serve
  assert.equal(rodar('forro-pvc', { sentido: 'comprimento', reguaComprimento: 3, perda: 0 }).principal, '20 réguas de 3 m'); // 15 fileiras × 4 m ÷ 3
});
test('cerca: mourões, arame e tela', () => {
  const r = rodar('cerca'); // 50 ÷ 2,5 = 20, mais 1; 50 × 5 × 1,05 = 262,5 m
  assert.equal(r.principal, '21 mourões');
  assert.equal(r.linhas['Arame, com a margem'], '263 m');
  assert.equal(r.linhas['Rolos de 500 m'], '1 rolo');
  const tela = rodar('cerca', { fechamento: 'tela', rolo: 25 }); // 52,5 m
  assert.equal(tela.linhas['Rolos de 25 m'], '3 rolos');
});

test('validação: recusa valor fora da faixa e ignora campo escondido', () => {
  const concreto = getQuantidade('concreto');
  assert.match(validar(concreto, { ...padroes(concreto), comprimento: 0 }), /Comprimento/);
  assert.match(validar(concreto, { ...padroes(concreto), espessura: '' }), /Espessura/);
  // Diâmetro inválido não importa enquanto a peça é retangular…
  assert.equal(validar(concreto, { ...padroes(concreto), diametro: 0 }), null);
  // …e passa a importar quando a peça é circular.
  assert.match(validar(concreto, { ...padroes(concreto), forma: 'circular', diametro: 0 }), /Diâmetro/);
  const diametro = concreto.campos.find(c => c.id === 'diametro');
  assert.equal(campoVisivel(diametro, { forma: 'retangular' }), false);
  assert.equal(campoVisivel(diametro, { forma: 'circular' }), true);
});

test('página: título, fórmula, exemplo e limites saem no HTML do servidor', async () => {
  const page = require('../src/app/calculadoras/[slug]/page.tsx');
  const params = page.generateStaticParams().map(p => p.slug);
  for (const q of QUANTIDADES) assert.ok(params.includes(q.slug));
  for (const s of getOficioAtivo().servicos) assert.ok(params.includes(s.slug));
  for (const q of QUANTIDADES) {
    const meta = await page.generateMetadata({ params: Promise.resolve({ slug: q.slug }) });
    assert.equal(meta.alternates.canonical, `${SITE_URL}/calculadoras/${q.slug}`);
    assert.equal(meta.title, q.titulo);
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: q.slug }) }));
    assert.equal(html.match(/<h1/g).length, 1, q.slug);
    assert.ok(html.includes('Como a conta é feita') && html.includes('O que esta conta não considera'), q.slug);
    assert.ok(html.includes(q.calcular(padroes(q)).principal.valor.replace(/&/g, '&amp;')), `${q.slug}: exemplo ausente`);
    assert.ok(!/R\$/.test(html), `${q.slug}: página de quantidade não mostra preço`);
    assert.ok(!html.includes('api/lead') && !/type="tel"/.test(html), `${q.slug}: não coleta telefone`);
  }
  // A calculadora de preço continua sendo servida pela mesma rota.
  const reboco = renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: 'reboco' }) }));
  assert.ok(reboco.includes('Quanto custa rebocar uma parede?'));
});

test('listagens e sitemap incluem as calculadoras de quantidade', () => {
  const sitemap = require('../src/app/sitemap.ts').default();
  const lista = renderToStaticMarkup(React.createElement(require('../src/app/calculadoras/page.tsx').default));
  const home = renderToStaticMarkup(React.createElement(require('../src/app/page.tsx').default));
  for (const q of QUANTIDADES) {
    assert.ok(sitemap.some(x => x.url === `${SITE_URL}/calculadoras/${q.slug}`), q.slug);
    assert.ok(lista.includes(`href="/calculadoras/${q.slug}"`), q.slug);
    assert.ok(home.includes(`href="/calculadoras/${q.slug}"`), q.slug);
  }
});

test('pedido por WhatsApp: quem calculou sem cidade pode informá-la ali mesmo', () => {
  const { WhatsappCapture } = require('../src/components/WhatsappCapture.tsx');
  const servico = getOficioAtivo().servicos[0];
  const base = { servico, resumo: 'Reboco de parede em São Paulo: R$ 1–R$ 2 (40 m²)', resultadoSnapshot: {} };
  const cidades = [{ slug: 'osasco-sp', nome: 'Osasco' }, { slug: 'campinas-sp', nome: 'Campinas' }];
  const semCidade = renderToStaticMarkup(React.createElement(WhatsappCapture, { ...base, territorio: { slug: 'uf-sp', nome: 'São Paulo', uf: 'SP' }, cidadesDaUF: cidades }));
  assert.ok(semCidade.includes('aria-label="Cidade da obra"'));
  assert.ok(semCidade.includes('Osasco') && semCidade.includes('Minha cidade não está na lista'));
  const comCidade = renderToStaticMarkup(React.createElement(WhatsappCapture, { ...base, territorio: { slug: 'osasco-sp', nome: 'Osasco', uf: 'SP' }, cidadesDaUF: cidades }));
  assert.ok(!comCidade.includes('aria-label="Cidade da obra"'));
});
