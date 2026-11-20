/* eslint-disable @typescript-eslint/no-require-imports -- Harness CJS instala transpiler antes de carregar as rotas TS. */
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Nunca carregar credenciais ou banco de produção. Banco descartável exclusivamente local. Todos os dados são fictícios.
const testUrl = new URL(process.env.TEST_DATABASE_URL || 'postgresql://invalid');
if (testUrl.hostname !== '127.0.0.1' || testUrl.pathname !== '/pedreirosbr_safety') {
  throw new Error('TEST_DATABASE_URL deve apontar para 127.0.0.1/pedreirosbr_safety');
}
process.env.DATABASE_URL = testUrl.href;
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, filename);
};
const { NextRequest } = require('next/server');
const { prisma } = require('../src/lib/db.ts');
const ads = require('../src/lib/anuncios.ts');
const email = require('../src/lib/email.ts');
const cadastro = require('../src/app/api/anuncio/route.ts');
const confirmar = require('../src/app/api/anuncio/confirmar/route.ts');
const exibir = require('../src/app/api/anuncio/exibir/route.ts');
const clique = require('../src/app/api/anuncio/clique/route.ts');
const painel = require('../src/app/api/anuncio/painel/route.ts');
const afiliadosRota = require('../src/app/api/anuncio/afiliados/route.ts');
const revisao = require('../src/app/api/internal/anuncios/route.ts');
const asaas = require('../src/app/api/asaas/webhook/route.ts');

const CNPJ = '11222333000181'; // exemplo de documentação, com dígitos verificadores válidos
const base = { cnpj: '11.222.333/0001-81', nome: 'Depósito Exemplo', email: 'loja@exemplo.test', categoria: 'materiais',
  escopo: 'cidade', territorySlug: 'sao-paulo-sp', titulo: 'Cimento e areia com entrega', texto: 'Tudo para a sua obra, do alicerce ao acabamento.',
  destino: 'https://loja.exemplo.com.br/', consent: true, termsVersion: ads.ADS_TERMS_VERSION };

let calls; let mode; let enviados; let ia;
function json(data, status = 200) { return new Response(JSON.stringify(data), { status }); }
async function limpar() {
  await prisma.adStatDaily.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.webhookReceipt.deleteMany();
  await prisma.requestLimit.deleteMany();
}
beforeEach(async () => {
  await limpar();
  for (const k of ['OPENAI_API_KEY', 'ADS_TRIAGE_MODEL', 'ADS_BILLING_ENABLED', 'AFILIADOS_JSON', 'ADS_PRECO_CIDADE', 'ADS_PRECO_ESTADO', 'ADS_PRECO_BRASIL']) delete process.env[k];
  Object.assign(process.env, { ADS_ENABLED: 'true', SMTP_HOST: 'smtp.invalid', EMAIL_FROM: 'PedreirosBR <anuncios@exemplo.test>',
    ASAAS_ENV: 'sandbox', ASAAS_API_KEY: 'test-key', ASAAS_WEBHOOK_TOKEN: 'test-webhook-token', INTERNAL_JOB_TOKEN: 'test-job-token' });
  calls = []; mode = ''; enviados = []; ia = { decisao: 'aprovar', motivo: 'loja de materiais' };
  email.definirTransporteDeTeste(async (m) => { if (mode === 'email-failure') throw new Error('smtp fora do ar'); enviados.push(m); });
  global.fetch = async (url, init) => {
    const u = new URL(url);
    calls.push({ host: u.hostname, path: u.pathname, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    // Nenhuma rede real: toda rota inesperada interrompe o teste.
    if (u.hostname === 'api.openai.com' && u.pathname === '/v1/chat/completions') {
      if (mode === 'ia-500') return json({}, 500);
      if (mode === 'ia-lixo') return json({ choices: [{ message: { content: 'aprovado!' } }] });
      return json({ choices: [{ message: { content: JSON.stringify(ia) } }] });
    }
    assert.equal(u.hostname, 'api-sandbox.asaas.com');
    if (u.pathname === '/v3/customers' && init.method === 'GET') return json({ data: [], hasMore: false });
    if (u.pathname === '/v3/customers' && init.method === 'POST') return json({ id: 'cus_ad' });
    if (u.pathname === '/v3/subscriptions' && init.method === 'GET') return json({ data: mode === 'assinatura-anterior' ? [{ id: 'sub_velha' }] : [], hasMore: false });
    if (u.pathname === '/v3/subscriptions' && init.method === 'POST') {
      if (mode === 'ambiguous') throw new Error('timeout após o provedor aceitar o POST');
      return json({ id: 'sub_ad' });
    }
    if (u.pathname === '/v3/subscriptions/sub_ad/payments') return json({ data: [{ invoiceUrl: 'https://sandbox.asaas.com/i/ad' }] });
    if (u.pathname === '/v3/subscriptions/sub_ad' && init.method === 'GET') {
      return json({ id: 'sub_ad', customer: mode === 'cancel-mismatch' ? 'outro' : 'cus_ad', externalReference: `anuncio:${mode.startsWith('ref:') ? mode.slice(4) : ''}` });
    }
    if (u.pathname === '/v3/subscriptions/sub_ad' && init.method === 'DELETE') {
      if (mode === 'cancel-timeout') throw new Error('timeout após DELETE');
      return json({ deleted: true, id: 'sub_ad' });
    }
    throw new Error(`Rede não permitida no teste: ${u.hostname}${u.pathname}`);
  };
});
after(async () => { email.definirTransporteDeTeste(null); await limpar(); await prisma.$disconnect(); });

const post = (rota, path, body, headers = {}) => rota.POST(new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } }));
const get = (rota, path, headers = {}) => rota.GET(new NextRequest(`http://localhost${path}`, { headers: { 'user-agent': 'Mozilla/5.0 (teste)', ...headers } }));
/** Cria um anúncio direto no estado pedido, sem passar pelo cadastro. */
async function anuncio(dados = {}, anunciante = {}) {
  const a = await prisma.advertiser.upsert({ where: { cnpj: anunciante.cnpj ?? CNPJ }, update: {},
    create: { cnpj: CNPJ, nome: 'Depósito Exemplo', email: 'loja@exemplo.test', emailVerifiedAt: new Date(), ...anunciante } });
  const n = await prisma.adCampaign.count();
  return prisma.adCampaign.create({ data: { advertiserId: a.id, categoria: 'materiais', titulo: 'Cimento e areia com entrega', texto: 'Tudo para a sua obra, do alicerce ao acabamento.',
    destino: 'https://loja.exemplo.com.br/', escopo: 'cidade', territorySlug: 'sao-paulo-sp', uf: 'SP', valorMensal: 3900, status: 'ACTIVE',
    accessToken: `token-de-acesso-do-painel-${n}`, termsVersion: ads.ADS_TERMS_VERSION, consentAt: new Date(), ...dados } });
}
const webhook = (event, id, c, extra = {}) => asaas.POST(new NextRequest('http://localhost/api/asaas/webhook', { method: 'POST', headers: { 'asaas-access-token': 'test-webhook-token' },
  body: JSON.stringify({ id, event, dateCreated: extra.date ?? '2026-11-20 12:00:00',
    payment: { id: extra.pay ?? 'pay_ad', subscription: extra.sub ?? 'sub_ad', customer: extra.customer ?? 'cus_ad', dueDate: '2026-11-21', externalReference: `anuncio:${c.id}` },
    subscription: { id: extra.sub ?? 'sub_ad', customer: extra.customer ?? 'cus_ad', externalReference: `anuncio:${c.id}` } }) }));
const ler = (c) => prisma.adCampaign.findUniqueOrThrow({ where: { id: c.id } });

// ---------------------------------------------------------------------------
// Regras fixas
// ---------------------------------------------------------------------------
test('CNPJ: aceita numérico e alfanumérico com dígitos corretos e recusa o resto', () => {
  assert.equal(ads.cnpjValido('11222333000181'), true);
  assert.equal(ads.cnpjValido('12ABC34501DE35'), true); // exemplo público do formato alfanumérico
  assert.equal(ads.cnpjValido('11222333000182'), false);
  assert.equal(ads.cnpjValido('11111111111111'), false);
  assert.equal(ads.cnpjValido('1122233300018'), false);
  assert.equal(ads.cnpjValido('12ABC34501DE3X'), false);
});

test('destino: só https sem encurtador, ou WhatsApp com DDD', () => {
  assert.equal(ads.destinoValido('https://loja.exemplo.com.br/ofertas'), 'https://loja.exemplo.com.br/ofertas');
  assert.equal(ads.destinoValido('(11) 90000-0001'), 'https://wa.me/5511900000001');
  for (const ruim of ['http://loja.exemplo.com.br', 'https://bit.ly/abc', 'https://usuario:senha@loja.exemplo.com.br', 'javascript:alert(1)', 'https://localhost/x', '12345', ''])
    assert.equal(ads.destinoValido(ruim), null, ruim);
});

test('cadastro: normaliza os dados e recusa o que é inválido', () => {
  const ok = ads.validarCadastro(base);
  assert.deepEqual(ok.dados, { cnpj: CNPJ, nome: 'Depósito Exemplo', email: 'loja@exemplo.test', categoria: 'materiais', escopo: 'cidade',
    territorySlug: 'sao-paulo-sp', uf: 'SP', titulo: base.titulo, texto: base.texto, destino: base.destino });
  assert.deepEqual(ads.validarCadastro({ ...base, escopo: 'estado', uf: 'mg' }).dados.uf, 'MG');
  assert.equal(ads.validarCadastro({ ...base, escopo: 'estado', uf: 'mg' }).dados.territorySlug, null);
  assert.equal(ads.validarCadastro({ ...base, escopo: 'brasil' }).dados.uf, null);
  for (const ruim of [{ cnpj: '11.222.333/0001-82' }, { email: 'sem-arroba' }, { categoria: 'pedreiro' }, { escopo: 'bairro' }, { territorySlug: 'cidade-que-nao-existe' },
    { titulo: 'Oi' }, { texto: 'curto' }, { titulo: 'Acesse www.loja.com.br' }, { texto: 'Fale com vendas@loja.com.br agora' }, { destino: 'http://loja.exemplo.com.br' },
    { consent: false }, { termsVersion: '2020-01-01' }, { escopo: 'estado', uf: 'XX' }])
    assert.ok(ads.validarCadastro({ ...base, ...ruim }).erro, JSON.stringify(ruim));
});

test('preços: padrão de 39, 149 e 499 reais, ajustável por variável', () => {
  assert.deepEqual(ads.precos(), { cidade: 3900, estado: 14900, brasil: 49900 });
  Object.assign(process.env, { ADS_PRECO_CIDADE: '59', ADS_PRECO_ESTADO: 'abc', ADS_PRECO_BRASIL: '-1' });
  assert.deepEqual(ads.precos(), { cidade: 5900, estado: 14900, brasil: 49900 });
});

// ---------------------------------------------------------------------------
// Módulo desligado
// ---------------------------------------------------------------------------
test('com ADS_ENABLED desligado nada é cadastrado, exibido, triado nem cobrado', async () => {
  const c = await anuncio();
  await anuncio({ status: 'PENDING_REVIEW' });
  await anuncio({ status: 'APPROVED' });
  process.env.ADS_ENABLED = 'false';
  process.env.ADS_BILLING_ENABLED = 'true';
  assert.equal((await post(cadastro, '/api/anuncio', base)).status, 503);
  const r = await (await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp')).json();
  assert.deepEqual([r.ad, r.anuncie], [null, false]);
  const ida = await get(clique, `/api/anuncio/clique?c=${c.id}`);
  assert.equal(ida.headers.get('location'), 'https://pedreirosbr.com.br/anuncie');
  assert.deepEqual(await ads.triarPendentes(), { triados: 0 });
  assert.deepEqual(await ads.cobrarAprovados(), { cobrados: 0 });
  assert.deepEqual(await ads.enfileirarRelatoriosMensais(new Date('2026-12-02T10:00:00Z')), { relatorios: 0 });
  assert.equal(calls.length, 0);
  assert.equal(await prisma.adStatDaily.count(), 0);
  assert.equal(await prisma.emailOutbox.count(), 0);
});

test('sem serviço de e-mail configurado o cadastro não abre', async () => {
  delete process.env.SMTP_HOST;
  assert.equal(ads.cadastroDisponivel(), false);
  assert.equal((await post(cadastro, '/api/anuncio', base)).status, 503);
  assert.equal(await prisma.advertiser.count(), 0);
});

// ---------------------------------------------------------------------------
// Cadastro e confirmação do e-mail
// ---------------------------------------------------------------------------
test('cadastro grava o anúncio parado, manda o e-mail e só o clique de confirmação leva à análise', async () => {
  const resp = await post(cadastro, '/api/anuncio', base);
  assert.equal(resp.status, 200);
  const c = await prisma.adCampaign.findFirstOrThrow({ include: { advertiser: true } });
  assert.deepEqual([c.status, c.valorMensal, c.escopo, c.territorySlug, c.uf, c.advertiser.cnpj, c.advertiser.emailVerifiedAt, c.billingState],
    ['PENDING_EMAIL', 3900, 'cidade', 'sao-paulo-sp', 'SP', CNPJ, null, null]);
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp').then(r => r.json())).ad, null);
  assert.deepEqual(await email.processarEmails(), { emails: 1 });
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, 'loja@exemplo.test');
  assert.match(enviados[0].text, new RegExp(`/anuncie/confirmar\\?t=${c.confirmToken}`));
  assert.match(enviados[0].text, /R\$\s39,00 por mês/);
  assert.deepEqual(await email.processarEmails(), { emails: 0 }); // não repete

  assert.equal((await post(confirmar, '/api/anuncio/confirmar', { t: 'token-que-nao-existe-000000' })).status, 400);
  assert.equal((await post(confirmar, '/api/anuncio/confirmar', { t: c.confirmToken })).status, 200);
  const depois = await prisma.adCampaign.findFirstOrThrow({ include: { advertiser: true } });
  assert.deepEqual([depois.status, depois.confirmToken, !!depois.advertiser.emailVerifiedAt], ['PENDING_REVIEW', null, true]);
  assert.equal((await post(confirmar, '/api/anuncio/confirmar', { t: c.confirmToken })).status, 400); // link de uso único
  assert.equal(calls.length, 0);
});

test('link de confirmação vencido não confirma; cadastro sem confirmação some em 7 dias', async () => {
  await post(cadastro, '/api/anuncio', base);
  const c = await prisma.adCampaign.findFirstOrThrow();
  await prisma.adCampaign.update({ where: { id: c.id }, data: { confirmExpiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await post(confirmar, '/api/anuncio/confirmar', { t: c.confirmToken })).status, 400);
  assert.equal((await ler(c)).status, 'PENDING_EMAIL');
  await ads.limparAnuncios();
  assert.equal(await prisma.adCampaign.count(), 1);
  await prisma.$executeRaw`UPDATE "AdCampaign" SET "createdAt" = (now() AT TIME ZONE 'UTC') - interval '8 days'`;
  await prisma.$executeRaw`UPDATE "Advertiser" SET "createdAt" = (now() AT TIME ZONE 'UTC') - interval '8 days'`;
  await ads.limparAnuncios();
  assert.deepEqual([await prisma.adCampaign.count(), await prisma.advertiser.count()], [0, 0]);
});

test('cadastro recusa dado inválido, origem estranha, CNPJ com outro e-mail e excesso de anúncios', async () => {
  assert.equal((await post(cadastro, '/api/anuncio', { ...base, cnpj: '11.222.333/0001-82' })).status, 400);
  assert.equal((await post(cadastro, '/api/anuncio', base, { origin: 'https://outro-site.example' })).status, 400);
  assert.equal(await prisma.advertiser.count(), 0);
  assert.equal((await post(cadastro, '/api/anuncio', base)).status, 200);
  const outro = await post(cadastro, '/api/anuncio', { ...base, email: 'outra@exemplo.test' });
  assert.equal(outro.status, 409);
  assert.equal(await prisma.advertiser.count(), 1);
  for (let i = 0; i < 4; i++) await anuncio({ status: 'ACTIVE' });
  await prisma.requestLimit.deleteMany();
  assert.equal((await post(cadastro, '/api/anuncio', base)).status, 409); // já são cinco em andamento
  assert.equal(await prisma.adCampaign.count(), 5);
});

test('cadastro tem limite de tentativas por CNPJ', async () => {
  for (let i = 0; i < 5; i++) await post(cadastro, '/api/anuncio', { ...base, titulo: `Oferta número ${i}` });
  assert.equal((await post(cadastro, '/api/anuncio', base)).status, 429);
});

test('cadastro tem limite por e-mail, mesmo com CNPJs diferentes', async () => {
  const dv = (b) => { let soma = 0; for (let i = b.length - 1, p = 2; i >= 0; i--, p = p === 9 ? 2 : p + 1) soma += Number(b[i]) * p; return soma % 11 < 2 ? 0 : 11 - (soma % 11); };
  const cnpjFicticio = (n) => { const b = `9000000${n}0001`; const d1 = dv(b); return `${b}${d1}${dv(b + d1)}`; };
  for (let i = 0; i < 5; i++) assert.equal((await post(cadastro, '/api/anuncio', { ...base, cnpj: cnpjFicticio(i) })).status, 200);
  assert.equal((await post(cadastro, '/api/anuncio', { ...base, cnpj: cnpjFicticio(5) })).status, 429);
  assert.equal(await prisma.emailOutbox.count(), 5);
});

// ---------------------------------------------------------------------------
// Triagem
// ---------------------------------------------------------------------------
test('triagem: setor proibido é recusado pelas regras, sem consultar a IA', async () => {
  Object.assign(process.env, { OPENAI_API_KEY: 'test-openai', ADS_TRIAGE_MODEL: 'modelo-de-teste' });
  const c = await anuncio({ status: 'PENDING_REVIEW', titulo: 'Empréstimo fácil para sua obra' });
  await ads.triarPendentes();
  const d = await ler(c);
  assert.deepEqual([d.status, d.triageDecision, d.triageSource], ['REJECTED', 'reject', 'regras']);
  assert.equal(calls.length, 0);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-rejected:${c.id}` } }), 1);
});

test('triagem: texto com cara de prestação de serviço fica para revisão humana, sem IA e sem cobrança', async () => {
  Object.assign(process.env, { OPENAI_API_KEY: 'test-openai', ADS_TRIAGE_MODEL: 'modelo-de-teste', ADS_BILLING_ENABLED: 'true' });
  const c = await anuncio({ status: 'PENDING_REVIEW', texto: 'Fazemos reformas e instalação de pisos em toda a cidade.' });
  await ads.triarPendentes();
  const d = await ler(c);
  assert.deepEqual([d.status, d.triageDecision, d.triageSource, !!d.triagedAt], ['PENDING_REVIEW', 'review', 'regras', true]);
  await ads.triarPendentes(); // não volta para a fila automática
  await ads.cobrarAprovados();
  assert.equal(calls.length, 0);
  assert.equal(await prisma.emailOutbox.count(), 0);
});

test('triagem: sem chave da IA tudo vai para revisão humana', async () => {
  const c = await anuncio({ status: 'PENDING_REVIEW' });
  await ads.triarPendentes();
  assert.deepEqual([(await ler(c)).status, (await ler(c)).triageReason], ['PENDING_REVIEW', 'triagem por IA não configurada']);
  assert.equal(calls.length, 0);
});

test('triagem por IA: aprova, recusa ou pede revisão; nunca recebe CNPJ nem e-mail', async () => {
  Object.assign(process.env, { OPENAI_API_KEY: 'test-openai', ADS_TRIAGE_MODEL: 'modelo-de-teste' });
  const aprovado = await anuncio({ status: 'PENDING_REVIEW' });
  await ads.triarPendentes();
  assert.deepEqual([(await ler(aprovado)).status, (await ler(aprovado)).triageSource], ['APPROVED', 'ia']);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-approved:${aprovado.id}` } }), 1);
  const pedido = calls[0];
  assert.deepEqual([pedido.host, pedido.body.model, pedido.body.response_format.type], ['api.openai.com', 'modelo-de-teste', 'json_object']);
  const enviado = JSON.stringify(pedido.body);
  assert.ok(!enviado.includes(CNPJ) && !enviado.includes('loja@exemplo.test') && !enviado.includes(aprovado.accessToken));
  assert.deepEqual(JSON.parse(pedido.body.messages[1].content).anuncio, { loja: 'Depósito Exemplo', categoria: 'Loja de materiais de construção',
    titulo: aprovado.titulo, texto: aprovado.texto, destino: 'loja.exemplo.com.br' });

  ia = { decisao: 'rejeitar', motivo: 'outro setor' };
  const recusado = await anuncio({ status: 'PENDING_REVIEW' });
  await ads.triarPendentes();
  assert.deepEqual([(await ler(recusado)).status, (await ler(recusado)).triageReason], ['REJECTED', 'outro setor']);

  for (const [m, resposta] of [['', { decisao: 'revisar', motivo: 'dúvida' }], ['', { decisao: 'aprovar tudo' }], ['ia-500', null], ['ia-lixo', null]]) {
    mode = m; ia = resposta;
    const duvida = await anuncio({ status: 'PENDING_REVIEW' });
    await ads.triarPendentes();
    const d = await ler(duvida);
    assert.deepEqual([d.status, d.triageDecision, !!d.triagedAt], ['PENDING_REVIEW', 'review', true], m || JSON.stringify(resposta));
  }
});

test('revisão humana: exige o token interno e decide só o que está em análise', async () => {
  const c = await anuncio({ status: 'PENDING_REVIEW', triagedAt: new Date(), triageDecision: 'review' });
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: c.id, acao: 'aprovar' })).status, 403);
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: c.id, acao: 'aprovar' }, { authorization: 'Bearer errado' })).status, 403);
  const auth = { authorization: 'Bearer test-job-token' };
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: c.id, acao: 'publicar' }, auth)).status, 400);
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: c.id, acao: 'aprovar' }, auth)).status, 200);
  assert.deepEqual([(await ler(c)).status, (await ler(c)).triageSource], ['APPROVED', 'manual']);
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: c.id, acao: 'rejeitar', motivo: 'mudei de ideia' }, auth)).status, 409);
  const outro = await anuncio({ status: 'PENDING_REVIEW' });
  assert.equal((await post(revisao, '/api/internal/anuncios', { id: outro.id, acao: 'rejeitar', motivo: 'é serviço' }, auth)).status, 200);
  assert.deepEqual([(await ler(outro)).status, (await ler(outro)).triageReason], ['REJECTED', 'é serviço']);
});

// ---------------------------------------------------------------------------
// Cobrança
// ---------------------------------------------------------------------------
test('cobrança: sem ADS_BILLING_ENABLED o anúncio aprovado espera, sem chamar o Asaas', async () => {
  const c = await anuncio({ status: 'APPROVED' });
  assert.deepEqual(await ads.cobrarAprovados(), { cobrados: 0 });
  assert.equal(calls.length, 0);
  assert.equal((await ler(c)).billingState, null);
});

test('cobrança: cria cliente e assinatura mensal com a referência do anúncio e envia o link', async () => {
  process.env.ADS_BILLING_ENABLED = 'true';
  const c = await anuncio({ status: 'APPROVED', escopo: 'estado', territorySlug: null, valorMensal: 14900 });
  assert.deepEqual(await ads.cobrarAprovados(), { cobrados: 1 });
  const d = await prisma.adCampaign.findUniqueOrThrow({ where: { id: c.id }, include: { advertiser: true } });
  assert.deepEqual([d.status, d.billingState, d.subscriptionId, d.environment, d.advertiser.customerId], ['APPROVED', 'AWAITING_PAYMENT', 'sub_ad', 'sandbox', 'cus_ad']);
  const cliente = calls.find(x => x.path === '/v3/customers' && x.method === 'POST').body;
  assert.deepEqual([cliente.cpfCnpj, cliente.externalReference], [CNPJ, `anunciante:${d.advertiserId}`]);
  const assinatura = calls.find(x => x.path === '/v3/subscriptions' && x.method === 'POST').body;
  assert.deepEqual([assinatura.customer, assinatura.value, assinatura.cycle, assinatura.externalReference], ['cus_ad', 149, 'MONTHLY', `anuncio:${c.id}`]);
  assert.match(assinatura.description, /São Paulo/);
  await email.processarEmails();
  assert.match(enviados.find(m => /Pagamento/.test(m.subject)).text, /https:\/\/sandbox\.asaas\.com\/i\/ad/);
  // Ainda fora do ar: só o pagamento confirmado publica.
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp').then(r => r.json())).ad, null);
  const antes = calls.length;
  assert.deepEqual(await ads.cobrarAprovados(), { cobrados: 0 });
  assert.equal(calls.length, antes);
});

test('cobrança: falha ambígua vai para conferência e nunca é repetida sozinha', async () => {
  process.env.ADS_BILLING_ENABLED = 'true';
  const c = await anuncio({ status: 'APPROVED' });
  mode = 'ambiguous';
  await ads.cobrarAprovados();
  assert.deepEqual([(await ler(c)).billingState, (await ler(c)).subscriptionId], ['REVIEW', null]);
  mode = '';
  const antes = calls.length;
  await ads.cobrarAprovados();
  await ads.cobrarAprovados();
  assert.equal(calls.length, antes);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-pay:${c.id}` } }), 0);
  // O pagamento dessa assinatura sem vínculo local não é confirmado ao Asaas até alguém conciliar.
  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-sem-vinculo', c)).status, 503);
  assert.equal((await ler(c)).status, 'APPROVED');
});

test('cobrança: assinatura anterior com a mesma referência bloqueia nova emissão', async () => {
  process.env.ADS_BILLING_ENABLED = 'true';
  const c = await anuncio({ status: 'APPROVED' });
  mode = 'assinatura-anterior';
  await ads.cobrarAprovados();
  assert.equal((await ler(c)).billingState, 'REVIEW');
  assert.equal(calls.filter(x => x.path === '/v3/subscriptions' && x.method === 'POST').length, 0);
});

test('webhook do Asaas: pagamento publica, atraso suspende, novo pagamento volta, exclusão encerra', async () => {
  await anuncio({}, { customerId: 'cus_ad' }).then(c => prisma.adCampaign.delete({ where: { id: c.id } }));
  const c = await anuncio({ status: 'APPROVED', billingState: 'AWAITING_PAYMENT', subscriptionId: 'sub_ad', environment: 'sandbox' });
  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-1', c)).status, 200);
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState, (await ler(c)).activePaymentId], ['ACTIVE', 'PAID', 'pay_ad']);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-active:${c.id}` } }), 1);
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp').then(r => r.json())).ad.id, c.id);

  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-1', c)).status, 200); // duplicata
  // Atraso de fatura antiga não derruba o período pago.
  await webhook('PAYMENT_OVERDUE', 'evt-2', c, { pay: 'pay_antiga', date: '2026-11-21 12:00:00' });
  assert.equal((await ler(c)).status, 'ACTIVE');
  // Evento mais antigo que o último processado é ignorado.
  await webhook('PAYMENT_OVERDUE', 'evt-3', c, { date: '2026-11-19 12:00:00' });
  assert.equal((await ler(c)).status, 'ACTIVE');
  // Estorno da fatura que mantém o anúncio no ar suspende.
  await webhook('PAYMENT_REFUNDED', 'evt-4', c, { date: '2026-11-22 12:00:00' });
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState], ['SUSPENDED', 'AWAITING_PAYMENT']);
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp').then(r => r.json())).ad, null);
  await webhook('PAYMENT_CONFIRMED', 'evt-5', c, { pay: 'pay_dezembro', date: '2026-12-21 12:00:00' });
  assert.deepEqual([(await ler(c)).status, (await ler(c)).activePaymentId], ['ACTIVE', 'pay_dezembro']);
  await webhook('PAYMENT_OVERDUE', 'evt-6', c, { pay: 'pay_dezembro', date: '2026-12-22 12:00:00' });
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState], ['SUSPENDED', 'OVERDUE']);
  await webhook('SUBSCRIPTION_DELETED', 'evt-7', c, { date: '2026-12-23 12:00:00' });
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState], ['CANCELLED', 'CANCELLED']);
  // Pagamento tardio não ressuscita anúncio cancelado.
  await webhook('PAYMENT_RECEIVED', 'evt-8', c, { date: '2026-12-24 12:00:00' });
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState, (await ler(c)).activePaymentId], ['CANCELLED', 'CANCELLED', null]);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-active:${c.id}` } }), 1);
});

test('webhook do Asaas: cliente ou ambiente divergente não muda nada e pede nova entrega', async () => {
  await anuncio({}, { customerId: 'cus_ad' }).then(c => prisma.adCampaign.delete({ where: { id: c.id } }));
  const c = await anuncio({ status: 'APPROVED', billingState: 'AWAITING_PAYMENT', subscriptionId: 'sub_ad', environment: 'sandbox' });
  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-outro-cliente', c, { customer: 'cus_de_outro' })).status, 503);
  process.env.ASAAS_ENV = 'production';
  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-outro-ambiente', c)).status, 503);
  process.env.ASAAS_ENV = 'sandbox';
  assert.equal((await ler(c)).status, 'APPROVED');
  assert.equal(await prisma.webhookReceipt.count({ where: { state: 'FAILED' } }), 2);
  // Referência de anúncio que não existe neste banco é de outro ambiente: confirmada sem efeito.
  assert.equal((await webhook('PAYMENT_RECEIVED', 'evt-desconhecido', { id: 'c0000000000000000000000000' }, { sub: 'sub_de_fora' })).status, 200);
});

// ---------------------------------------------------------------------------
// Exibição, contagem e clique
// ---------------------------------------------------------------------------
test('exibição: respeita a região e dá peso 4 à cidade, 2 ao estado e 1 ao Brasil', async () => {
  const cidade = await anuncio({ titulo: 'Anúncio da cidade' });
  const estado = await anuncio({ titulo: 'Anúncio do estado', escopo: 'estado', territorySlug: null });
  const brasil = await anuncio({ titulo: 'Anúncio nacional', escopo: 'brasil', territorySlug: null, uf: null });
  await anuncio({ titulo: 'Outra cidade', territorySlug: 'campinas-sp' });
  await anuncio({ titulo: 'Outro estado', escopo: 'estado', territorySlug: null, uf: 'MG' });
  await anuncio({ titulo: 'Suspenso', status: 'SUSPENDED' });
  await anuncio({ titulo: 'Em análise', status: 'PENDING_REVIEW' });
  const contagem = {};
  for (let i = 0; i < 70; i++) {
    const ad = await ads.escolherAnuncio('sao-paulo-sp', () => (i + 0.5) / 70);
    contagem[ad.id] = (contagem[ad.id] ?? 0) + 1;
  }
  assert.deepEqual([contagem[cidade.id], contagem[estado.id], contagem[brasil.id]], [40, 20, 10]);
  assert.equal(Object.keys(contagem).length, 3);
  // Página sem região (calculadoras): só o anúncio nacional.
  for (const s of [0, 0.5, 0.99]) assert.equal((await ads.escolherAnuncio(null, () => s)).id, brasil.id);
  // O que vai para o navegador não inclui destino, CNPJ, e-mail nem token.
  const ad = await ads.escolherAnuncio('sao-paulo-sp', () => 0);
  assert.deepEqual(Object.keys(ad).sort(), ['anunciante', 'categoria', 'id', 'texto', 'titulo']);
});

test('exibição conta por dia; robô e origem em excesso não entram na conta', async () => {
  const c = await anuncio();
  const r = await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp', { 'x-forwarded-for': '203.0.113.7' });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const corpo = await r.json();
  assert.deepEqual([corpo.ad.id, corpo.anuncie, corpo.ad.destino], [c.id, true, undefined]);
  assert.match(corpo.desde, /39,00/);
  await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' });
  const dia = new Date().toISOString().slice(0, 10);
  assert.deepEqual(await prisma.adStatDaily.findMany(), [{ campaignId: c.id, day: dia, impressions: 1, clicks: 0 }]);
  for (let i = 0; i < 205; i++) await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp', { 'x-forwarded-for': '203.0.113.7' });
  assert.equal((await prisma.adStatDaily.findFirstOrThrow()).impressions, 200);
  // Região inválida não quebra: vale como página sem região.
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=%27%3B--').then(x => x.json())).ad, null);
});

test('clique: só anúncio ativo redireciona para o destino gravado, e o clique é contado', async () => {
  const c = await anuncio();
  const ida = await get(clique, `/api/anuncio/clique?c=${c.id}`);
  assert.deepEqual([ida.status, ida.headers.get('location')], [302, 'https://loja.exemplo.com.br/']);
  await get(clique, `/api/anuncio/clique?c=${c.id}`, { 'user-agent': 'facebookexternalhit/1.1' });
  assert.equal((await prisma.adStatDaily.findFirstOrThrow()).clicks, 1);
  const parado = await anuncio({ status: 'SUSPENDED', destino: 'https://parado.exemplo.com.br/' });
  for (const id of [parado.id, 'nao-existe', "x' OR 1=1", '']) {
    const r = await get(clique, `/api/anuncio/clique?c=${encodeURIComponent(id)}`);
    assert.deepEqual([r.status, r.headers.get('location')], [302, 'https://pedreirosbr.com.br/anuncie'], id);
  }
  assert.equal(await prisma.adStatDaily.count(), 1);
});

// ---------------------------------------------------------------------------
// Painel, cancelamento e relatório
// ---------------------------------------------------------------------------
test('painel: mostra os números por mês para quem tem o link e nada para quem não tem', async () => {
  const c = await anuncio();
  await prisma.adStatDaily.createMany({ data: [
    { campaignId: c.id, day: '2026-10-30', impressions: 100, clicks: 4 }, { campaignId: c.id, day: '2026-11-01', impressions: 50, clicks: 1 },
    { campaignId: c.id, day: '2026-11-02', impressions: 25, clicks: 2 } ] });
  const d = await ads.dadosDoPainel(c.accessToken);
  assert.deepEqual([d.status, d.regiao, d.valor.replace(/\s/g, ' ')], ['ACTIVE', 'São Paulo/SP', 'R$ 39,00']);
  assert.deepEqual(d.meses, [{ mes: '2026-11', impressions: 75, clicks: 3 }, { mes: '2026-10', impressions: 100, clicks: 4 }]);
  assert.ok(!JSON.stringify(d).includes(CNPJ) && !JSON.stringify(d).includes('loja@exemplo.test'));
  assert.equal(await ads.dadosDoPainel('token-que-nao-existe-0000000'), null);
  assert.equal(await ads.dadosDoPainel(''), null);
});

test('cancelamento pelo painel: sai do ar na hora e encerra a recorrência depois de conferir o vínculo', async () => {
  await anuncio({}, { customerId: 'cus_ad' }).then(c => prisma.adCampaign.delete({ where: { id: c.id } }));
  const c = await anuncio({ billingState: 'PAID', subscriptionId: 'sub_ad', environment: 'sandbox', activePaymentId: 'pay_ad' });
  assert.equal((await post(painel, '/api/anuncio/painel', { t: 'token-que-nao-existe-0000000', acao: 'cancelar' })).status, 404);
  assert.equal((await post(painel, '/api/anuncio/painel', { t: c.accessToken, acao: 'apagar' })).status, 400);
  mode = `ref:${c.id}`;
  const r = await post(painel, '/api/anuncio/painel', { t: c.accessToken, acao: 'cancelar' });
  assert.deepEqual([r.status, (await r.json()).resultado], [200, 'cancelado']);
  assert.deepEqual([(await ler(c)).status, (await ler(c)).billingState], ['CANCELLED', 'CANCEL_SUBMITTED']);
  assert.deepEqual(calls.map(x => x.method), ['GET', 'DELETE']);
  assert.equal((await get(exibir, '/api/anuncio/exibir?t=sao-paulo-sp').then(x => x.json())).ad, null);
  const de_novo = await post(painel, '/api/anuncio/painel', { t: c.accessToken, acao: 'cancelar' });
  assert.equal((await de_novo.json()).resultado, 'ja_cancelado');
  assert.equal(calls.length, 2);
  await webhook('SUBSCRIPTION_DELETED', 'evt-fim', c);
  assert.equal((await ler(c)).billingState, 'CANCELLED');
});

test('cancelamento: vínculo divergente ou resposta ambígua vão para conferência, sem repetir', async () => {
  await anuncio({}, { customerId: 'cus_ad' }).then(c => prisma.adCampaign.delete({ where: { id: c.id } }));
  const a = await anuncio({ billingState: 'PAID', subscriptionId: 'sub_ad', environment: 'sandbox' });
  mode = 'cancel-mismatch';
  assert.equal(await ads.cancelarAnuncio(a.accessToken), 'cancelado');
  assert.deepEqual([(await ler(a)).status, (await ler(a)).billingState], ['CANCELLED', 'REVIEW']);
  assert.equal(calls.filter(x => x.method === 'DELETE').length, 0);
  await prisma.adCampaign.delete({ where: { id: a.id } });
  const b = await anuncio({ billingState: 'PAID', subscriptionId: 'sub_ad', environment: 'sandbox' });
  mode = `ref:${b.id}`;
  const original = global.fetch;
  global.fetch = async (url, init) => { if (init.method === 'DELETE') { calls.push({ method: 'DELETE' }); throw new Error('timeout após DELETE'); } return original(url, init); };
  assert.equal(await ads.cancelarAnuncio(b.accessToken), 'cancelado');
  assert.deepEqual([(await ler(b)).status, (await ler(b)).billingState], ['CANCELLED', 'REVIEW']);
  assert.equal(await ads.cancelarAnuncio(b.accessToken), 'ja_cancelado');
  assert.equal(calls.filter(x => x.method === 'DELETE').length, 1);
});

test('cancelamento antes da cobrança não chama o Asaas; cancelar durante a criação da cobrança não pede pagamento', async () => {
  const c = await anuncio({ status: 'PENDING_REVIEW' });
  assert.equal(await ads.cancelarAnuncio(c.accessToken), 'cancelado');
  assert.equal(calls.length, 0);
  process.env.ADS_BILLING_ENABLED = 'true';
  const d = await anuncio({ status: 'APPROVED' });
  const original = global.fetch;
  global.fetch = async (url, init) => {
    if (new URL(url).pathname === '/v3/subscriptions' && init.method === 'POST') await ads.cancelarAnuncio(d.accessToken);
    return original(url, init);
  };
  assert.deepEqual(await ads.cobrarAprovados(), { cobrados: 0 });
  assert.deepEqual([(await ler(d)).status, (await ler(d)).billingState, (await ler(d)).subscriptionId], ['CANCELLED', 'REVIEW', 'sub_ad']);
  assert.equal(await prisma.emailOutbox.count({ where: { key: `ad-pay:${d.id}` } }), 0);
});

test('relatório mensal: um e-mail por anúncio e por mês, só nos primeiros dias, com os números do mês anterior', async () => {
  const c = await anuncio({ createdAt: new Date('2026-10-15T12:00:00Z') });
  const novo = await anuncio({ titulo: 'Criado em dezembro', createdAt: new Date('2026-12-01T12:00:00Z') });
  const antigo = await anuncio({ titulo: 'Cancelado em novembro', status: 'CANCELLED', createdAt: new Date('2026-10-01T12:00:00Z') });
  await prisma.adStatDaily.createMany({ data: [
    { campaignId: c.id, day: '2026-10-31', impressions: 999, clicks: 99 }, { campaignId: c.id, day: '2026-11-01', impressions: 1200, clicks: 30 },
    { campaignId: c.id, day: '2026-11-30', impressions: 300, clicks: 6 }, { campaignId: c.id, day: '2026-12-01', impressions: 777, clicks: 77 },
    { campaignId: antigo.id, day: '2026-11-10', impressions: 10, clicks: 0 } ] });
  assert.deepEqual(await ads.enfileirarRelatoriosMensais(new Date('2026-12-06T10:00:00Z')), { relatorios: 0 });
  assert.deepEqual(await ads.enfileirarRelatoriosMensais(new Date('2026-12-02T10:00:00Z')), { relatorios: 2 });
  assert.deepEqual(await ads.enfileirarRelatoriosMensais(new Date('2026-12-03T10:00:00Z')), { relatorios: 0 });
  const chaves = (await prisma.emailOutbox.findMany({ orderBy: { key: 'asc' } })).map(e => e.key);
  assert.deepEqual(chaves, [`ad-report:${antigo.id}:2026-11`, `ad-report:${c.id}:2026-11`].sort());
  assert.ok(!chaves.some(k => k.includes(novo.id)));
  const corpo = (await prisma.emailOutbox.findUniqueOrThrow({ where: { key: `ad-report:${c.id}:2026-11` } })).body;
  assert.match(corpo, /Exibições: 1\.500/);
  assert.match(corpo, /Cliques: 36/);
  assert.match(corpo, /Taxa de clique: 2,4%/);
  assert.match(corpo, new RegExp(`/anuncie/painel\\?t=${c.accessToken}`));
  // Em janeiro sai o relatório de dezembro, outro e-mail.
  assert.equal((await ads.enfileirarRelatoriosMensais(new Date('2027-01-01T10:00:00Z'))).relatorios, 2);
});

test('e-mail: falha de envio tem duas novas tentativas e depois vai para conferência', async () => {
  await prisma.$transaction(tx => email.enfileirarEmail(tx, { key: 'teste:1', recipient: 'loja@exemplo.test', subject: 'Assunto', body: 'Corpo' }));
  await prisma.$transaction(tx => email.enfileirarEmail(tx, { key: 'teste:1', recipient: 'loja@exemplo.test', subject: 'Assunto', body: 'Repetido' }));
  assert.equal(await prisma.emailOutbox.count(), 1);
  await assert.rejects(prisma.$transaction(tx => email.enfileirarEmail(tx, { key: 'teste:2', recipient: 'a@b.c\r\nBcc: x@y.z', subject: 's', body: 'b' })));
  mode = 'email-failure';
  for (const esperado of ['PENDING', 'PENDING', 'REVIEW']) {
    await prisma.emailOutbox.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    assert.deepEqual(await email.processarEmails(), { emails: 0 });
    assert.equal((await prisma.emailOutbox.findUniqueOrThrow({ where: { key: 'teste:1' } })).state, esperado);
  }
  mode = '';
  assert.deepEqual(await email.processarEmails(), { emails: 0 });
  assert.equal(enviados.length, 0);
});

// ---------------------------------------------------------------------------
// Afiliados
// ---------------------------------------------------------------------------
test('afiliados: só entram links https com o marcador de busca; sem configuração, lista vazia', async () => {
  assert.deepEqual(await (await afiliadosRota.GET()).json(), { ok: true, afiliados: [] });
  process.env.AFILIADOS_JSON = JSON.stringify([
    { nome: 'Loja A', url: 'https://loja-a.exemplo.com/busca?q={q}&tag=id-ficticio' }, { nome: 'Sem marcador', url: 'https://loja-b.exemplo.com/' },
    { nome: 'Sem https', url: 'http://loja-c.exemplo.com/?q={q}' }, { url: 'https://sem-nome.exemplo.com/?q={q}' }, 'texto solto',
  ]);
  assert.deepEqual(ads.afiliados(), [{ nome: 'Loja A', url: 'https://loja-a.exemplo.com/busca?q={q}&tag=id-ficticio' }]);
  process.env.AFILIADOS_JSON = '{quebrado';
  assert.deepEqual(ads.afiliados(), []);
});
