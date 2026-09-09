/* eslint-disable @typescript-eslint/no-require-imports -- Harness CJS instala transpiler antes de carregar as rotas TS. */
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');

// Nunca carregar credenciais/banco de produção. Banco descartável exclusivamente local.
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
const meta = require('../src/app/api/whatsapp/webhook/route.ts');
const asaas = require('../src/app/api/asaas/webhook/route.ts');
const { gerarCobrancaTerritorio, cancelarAssinatura } = require('../src/lib/asaas.ts');
const { processarUmaVez } = require('../src/lib/webhook-receipt.ts');
const { assinaturaMetaValida } = require('../src/lib/webhook-security.ts');

let calls;
let mode;
const billingOptions = { professionalId: 'test-professional', nome: 'Teste', whatsapp: '11900000001', cidadeLabel: 'São Paulo/SP', cpf: '00000000000' };
function json(data) { return new Response(JSON.stringify(data), { status: 200 }); }
beforeEach(async () => {
  await prisma.webhookReceipt.deleteMany();
  await prisma.outboundMessage.deleteMany();
  await prisma.messageDelivery.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.requestLimit.deleteMany();
  await prisma.territorySeat.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.billingPayment.deleteMany();
  await prisma.billingSubscription.deleteMany();
  await prisma.territoryEvent.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.professional.create({ data: { id: billingOptions.professionalId, nome: 'Teste', whatsapp: billingOptions.whatsapp,
    territorySlug: 'sao-paulo-sp', cpf: billingOptions.cpf, status: 'contatado', verifiedAt: new Date() } });
  await prisma.territory.create({ data: { slug: 'sao-paulo-sp', nome: 'São Paulo', tipo: 'cidade', uf: 'SP', assinaturaAtiva: true } });
  Object.assign(process.env, { WHATSAPP_APP_SECRET: 'test-app-secret', WHATSAPP_PHONE_NUMBER_ID: 'test-phone',
    WHATSAPP_VERIFY_TOKEN: 'test-verify', WHATSAPP_TOKEN: 'test-token', WHATSAPP_BILLING_TEMPLATES_ENABLED: 'true', ASAAS_ENV: 'sandbox',
    ASAAS_API_KEY: 'test-key', ASAAS_BILLING_ENABLED: 'true', ASAAS_WEBHOOK_TOKEN: 'test-webhook-token',
    ASAAS_OVERDUE_POLICY: 'pause_cancel_after_7_days', ASAAS_OVERDUE_AUTOCANCEL_ENABLED: 'false' });
  calls = []; mode = '';
  global.fetch = async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    // Nenhuma rede real: toda rota inesperada interrompe o teste.
    if (u.hostname === 'graph.facebook.com' && u.pathname.endsWith('/messages')) {
      if (mode === 'message-failure') return new Response('{}', { status: 500 });
      if (mode === 'message-timeout') throw new Error('timeout depois de aceitar mensagem');
      if (mode === 'message-no-id') return json({ messages: [] });
      return json({ messages: [{ id: 'outbound-test-' + calls.length }] });
    }
    assert.equal(u.hostname, 'api-sandbox.asaas.com');
    if (u.pathname === '/v3/customers' && init.method === 'GET') {
      if (mode === 'customer-get-failure') return new Response('{}', { status: 500 });
      return json({ data: [], hasMore: false });
    }
    if (u.pathname === '/v3/customers' && init.method === 'POST') return json({ id: 'cus_test' });
    if (u.pathname === '/v3/subscriptions' && init.method === 'GET') {
      return json({ data: mode === 'legacy' ? [{ id: 'sub_legacy' }] : [], hasMore: false });
    }
    if (u.pathname === '/v3/subscriptions' && init.method === 'POST') {
      if (mode === 'ambiguous') throw new Error('timeout após provedor aceitar POST');
      return json({ id: 'sub_test' });
    }
    if (u.pathname === '/v3/subscriptions/sub_test/payments') {
      if (mode === 'invoice-failure') throw new Error('consulta de fatura indisponível');
      return json({ data: [{ invoiceUrl: 'https://sandbox.asaas.com/i/test' }] });
    }
    if (u.pathname === '/v3/subscriptions/sub_test' && init.method === 'GET') {
      return json({ id: 'sub_test', customer: mode === 'cancel-mismatch' ? 'other' : 'cus_test', externalReference: billingOptions.professionalId });
    }
    if (u.pathname === '/v3/payments/pay_test' && init.method === 'GET') {
      if (mode === 'overdue-fetch-failure') throw new Error('indisponivel');
      if (mode === 'paid-during-check') await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'paid-during-check', '2026-09-10 12:00:00'));
      return json({ id:'pay_test', customer: mode === 'overdue-wrong-owner' ? 'other' : 'cus_test',
        subscription:'sub_test', dueDate:'2026-09-08', status:mode === 'overdue-already-paid' ? 'RECEIVED' : 'OVERDUE' });
    }
    if (u.pathname === '/v3/subscriptions/sub_test' && init.method === 'DELETE') {
      if (mode === 'cancel-timeout') throw new Error('timeout apos DELETE');
      if (mode === 'cancel-early-webhook') await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED', 'early-delete'));
      return json({ deleted: true, id: 'sub_test' });
    }
    throw new Error(`Rede não permitida no teste: ${u.pathname}`);
  };
});
after(async () => { await prisma.$disconnect(); });
function payload(id = 'wamid.test', text = 'QUERO', phone = 'test-phone', from = '5511900000001') {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: phone }, messages: [{ id, from, type: 'text', text: { body: text } }],
  } }] }] };
}
function request(data, signature) {
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  const sig = signature ?? `sha256=${createHmac('sha256', 'test-app-secret').update(raw).digest('hex')}`;
  return new NextRequest('http://localhost/api/whatsapp/webhook', { method: 'POST', body: raw,
    headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' } });
}
function subscriptionPosts() { return calls.filter(c => c.method === 'POST' && c.path === '/v3/subscriptions'); }
function publicRequest(route, body) {
  return new NextRequest('https://pedreirosbr.com.br/api/' + route, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://pedreirosbr.com.br' }, body: JSON.stringify(body) });
}
function delivery(id, status = 'delivered') {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: 'test-phone' }, statuses: [{ id, status }],
  } }] }] };
}

test('cadastro público não altera profissional antes de confirmar telefone', async () => {
  const route = require('../src/app/api/profissional/route.ts');
  const input = { nome: 'Nome adulterado', whatsapp: billingOptions.whatsapp, territorySlug: 'sao-paulo-sp', consent: true, consentVersion: '2026-09-08' };
  const response = await route.POST(publicRequest('profissional', input));
  assert.equal(response.status, 200);
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).nome, 'Teste');
  const url = new URL((await response.json()).verificationUrl);
  assert.equal(calls.length, 0);
  const command = url.searchParams.get('text');
  await meta.POST(request(payload('wrong-owner', command, 'test-phone', '5511900000002')));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).nome, 'Teste');
  await meta.POST(request(payload('right-owner', command)));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).nome, 'Nome adulterado');
  assert.equal(subscriptionPosts().length, 0);
  const count = await prisma.outboundMessage.count();
  await meta.POST(request(payload('same-confirmation-new-id', command)));
  assert.equal(await prisma.outboundMessage.count(), count);
});
test('cadastro sem consentimento e excesso de tentativas são bloqueados', async () => {
  const route = require('../src/app/api/profissional/route.ts');
  const input = { nome: 'Teste', whatsapp: '11900000002', territorySlug: 'sao-paulo-sp', consentVersion: '2026-09-08' };
  assert.equal((await route.POST(publicRequest('profissional', input))).status, 400);
  for (let i = 0; i < 5; i++) assert.equal((await route.POST(publicRequest('profissional', {...input, consent: true}))).status, 200);
  assert.equal((await route.POST(publicRequest('profissional', {...input, consent: true}))).status, 429);
  assert.equal(calls.length, 0);
});
test('confirmação vencida orienta sem validar lead e um novo link continua funcionando', async () => {
  const route = require('../src/app/api/lead/route.ts');
  const input = { whatsapp: '11900000002', territorySlug: 'sao-paulo-sp', uf: 'SP', servico: 'reboco', resumo: 'Resumo privado', materials: '1 saco', consentVersion: '2026-09-08', quoteConsent: true };
  const response = await route.POST(publicRequest('lead', input));
  const command = new URL((await response.json()).verificationUrl).searchParams.get('text');
  await prisma.verificationRequest.updateMany({ data: { expiresAt: new Date(Date.now() - 60000) } });
  await meta.POST(request(payload('expired', command, 'test-phone', '5511900000002')));
  await meta.POST(request(payload('expired-retry', command, 'test-phone', '5511900000002')));
  const expired = await prisma.verificationRequest.findFirst();
  assert.equal(expired.consumedAt, null);
  assert.equal((await prisma.lead.findFirst()).verifiedAt, null);
  assert.equal((await prisma.territory.findUnique({ where: { slug: 'sao-paulo-sp' } })).leads, 0);
  assert.equal(await prisma.outboundMessage.count(), 1);
  assert.ok(calls.some(c => c.body?.text?.body.includes('validade de 30 minutos')));
  assert.equal(calls.some(c => c.body?.text?.body.includes('Resumo privado')), false);
  assert.equal(subscriptionPosts().length, 0);
  const renewed = await route.POST(publicRequest('lead', input));
  const newCommand = new URL((await renewed.json()).verificationUrl).searchParams.get('text');
  await meta.POST(request(payload('renewed', newCommand, 'test-phone', '5511900000002')));
  assert.equal(await prisma.lead.count({ where: { verifiedAt: { not: null } } }), 1);
});
test('confirmações inválidas e de outro titular recebem aviso genérico limitado e sem dados privados', async () => {
  const { criarVerificacao, confirmarWhatsApp } = require('../src/lib/verification.ts');
  const url = await criarVerificacao('PROFESSIONAL', billingOptions.whatsapp, { nome: 'Nome privado', territorySlug: 'sao-paulo-sp' });
  const command = new URL(url).searchParams.get('text');
  await Promise.all([
    confirmarWhatsApp('5511900000002', command),
    confirmarWhatsApp('5511900000002', 'CONFIRMAR ' + 'a'.repeat(48)),
    confirmarWhatsApp('5511900000002', 'CONFIRMAR incompleto'),
  ]);
  assert.equal(await prisma.outboundMessage.count(), 1);
  const warning = await prisma.outboundMessage.findFirst();
  assert.equal(warning.recipient, '5511900000002');
  assert.equal(JSON.stringify(warning).includes('Nome privado'), false);
  assert.equal(JSON.stringify(warning).includes(billingOptions.whatsapp), false);
  assert.equal((await prisma.verificationRequest.findFirst()).consumedAt, null);
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).nome, 'Teste');
  assert.equal(await prisma.billingSubscription.count(), 0);
  assert.equal(calls.length, 0);
  assert.equal(await confirmarWhatsApp('5511900000002', 'QUERO'), false);
});
test('lead só conta como demanda após confirmação e autorização de compartilhamento', async () => {
  const route = require('../src/app/api/lead/route.ts');
  const input = { whatsapp: '11900000002', territorySlug: 'sao-paulo-sp', uf: 'SP', servico: 'reboco', resumo: 'Teste', materials: '1 saco', consentVersion: '2026-09-08', quoteConsent: true };
  const response = await route.POST(publicRequest('lead', input));
  assert.equal(response.status, 200);
  assert.equal((await prisma.lead.findFirst()).verifiedAt, null);
  assert.equal((await prisma.territory.findUnique({where:{slug:'sao-paulo-sp'}})).leads, 0);
  const command = new URL((await response.json()).verificationUrl).searchParams.get('text');
  await meta.POST(request(payload('lead-confirm', command, 'test-phone', '5511900000002')));
  assert.ok((await prisma.lead.findFirst()).verifiedAt);
  assert.equal((await prisma.lead.findFirst()).distribuido, false);
  assert.equal((await prisma.territory.findUnique({where:{slug:'sao-paulo-sp'}})).leads, 1);
  assert.ok(calls.some(c => c.body?.text?.body.includes('1 saco')));
});
test('dois profissionais concorrendo pela mesma cidade não geram duas assinaturas', async () => {
  await prisma.professional.create({ data: { id: 'other', nome: 'Outro', whatsapp: '11900000002', territorySlug: 'sao-paulo-sp', status: 'contatado', verifiedAt: new Date(), cpf: '00000000000' } });
  await Promise.all([gerarCobrancaTerritorio(billingOptions), gerarCobrancaTerritorio({...billingOptions, professionalId: 'other', whatsapp: '11900000002'})]);
  assert.equal(await prisma.territorySeat.count(), 1);
  assert.equal(subscriptionPosts().length, 1);
});
test('fila simultânea convida somente um profissional por cidade', async () => {
  const {notificarFilaCidade} = require('../src/lib/fila.ts');
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{status:'capturado'}});
  await prisma.professional.create({ data: { id:'other',nome:'Outro',whatsapp:'11900000002',territorySlug:'sao-paulo-sp',verifiedAt:new Date() } });
  await Promise.all(Array.from({length:10},()=>notificarFilaCidade('sao-paulo-sp')));
  assert.equal(await prisma.outboundMessage.count({where:{kind:'INVITE'}}), 1);
  assert.equal(await prisma.professional.count({where:{status:'contatado'}}), 1);
});
test('callback antecipado é reconciliado após envio e falha posterior não regride entrega', async () => {
  const {registrarEntregas,processarOutbox}=require('../src/lib/outbox.ts');
  await registrarEntregas(delivery('outbound-test-1'));
  await prisma.outboundMessage.create({data:{key:'early',recipient:'5511900000002',kind:'TEXT',payload:{text:'Teste'}}});
  await processarOutbox();
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:'early'}})).state,'DELIVERED');
  await registrarEntregas(delivery('outbound-test-1','failed'));
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:'early'}})).state,'DELIVERED');
});
test('outbox usa relógio do banco e preserva mensagens agendadas para o futuro', async () => {
  const {processarOutbox}=require('../src/lib/outbox.ts');
  await prisma.outboundMessage.create({data:{key:'due',recipient:'5511900000002',kind:'TEXT',payload:{text:'Agora'}}});
  await prisma.outboundMessage.create({data:{key:'future',recipient:'5511900000002',kind:'TEXT',payload:{text:'Depois'},nextAttemptAt:new Date(Date.now()+3600000)}});
  const RealDate=Date;
  const behind=RealDate.now()-3600000;
  global.Date=class extends RealDate { constructor(...args){super(...(args.length?args:[behind]));} static now(){return behind;} };
  try { assert.equal((await processarOutbox()).processed,1); } finally { global.Date=RealDate; }
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:'due'}})).state,'SENT');
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:'future'}})).state,'PENDING');
  assert.equal(calls.length,1);
});
test('lead só é distribuído após callback; cancelamento antes do envio bloqueia entrega', async () => {
  const {distribuirLead}=require('../src/lib/distribuicao.ts');
  const {processarOutbox,registrarEntregas}=require('../src/lib/outbox.ts');
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{status:'assinante'}});
  await prisma.territorySeat.create({data:{territorySlug:'sao-paulo-sp',professionalId:billingOptions.professionalId}});
  const lead=await prisma.lead.create({data:{whatsapp:'11900000002',territorySlug:'sao-paulo-sp',servico:'reboco',origem:'calculadora',verifiedAt:new Date(),consentAt:new Date(),deliveryState:'WAITING_PROFESSIONAL'}});
  await distribuirLead({leadId:lead.id});await processarOutbox();
  assert.equal((await prisma.lead.findUnique({where:{id:lead.id}})).distribuido,false);
  await registrarEntregas(delivery('outbound-test-1'));
  assert.equal((await prisma.lead.findUnique({where:{id:lead.id}})).distribuido,true);
  const second=await prisma.lead.create({data:{whatsapp:'11900000003',territorySlug:'sao-paulo-sp',servico:'reboco',origem:'calculadora',verifiedAt:new Date(),consentAt:new Date()}});
  await distribuirLead({leadId:second.id});
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{status:'inadimplente'}});
  const count=calls.length;await processarOutbox();assert.equal(calls.length,count);
});
test('job interno exige token correto antes de executar', async () => {
  const job=require('../src/app/api/internal/jobs/route.ts');
  process.env.INTERNAL_JOB_TOKEN='internal-test';
  assert.equal((await job.POST(new NextRequest('https://pedreirosbr.com.br/api/internal/jobs',{method:'POST'}))).status,403);
  assert.equal(calls.length,0);
});
function asaasRequest(event, id, date = '2026-09-08 12:00:00', overrides = {}) {
  return new NextRequest('http://localhost/api/asaas/webhook', { method: 'POST', headers: { 'asaas-access-token': 'test-webhook-token' },
    body: JSON.stringify({ id, event, dateCreated: date,
      payment: { id: 'pay_test', subscription: 'sub_test', customer: 'cus_test', dueDate: '2026-09-08', externalReference: billingOptions.professionalId },
      subscription: { id: 'sub_test', customer: 'cus_test' }, ...overrides }) });
}

test('renovação mantém ciclo mais recente mesmo com confirmação antiga entregue depois', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','cycle-september'));
  await asaas.POST(asaasRequest('PAYMENT_CONFIRMED','cycle-october','2026-10-08 12:00:00',{
    payment:{id:'pay_october',subscription:'sub_test',customer:'cus_test',dueDate:'2026-10-08'},
  }));
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','september-late','2026-10-09 12:00:00'));
  const b=await prisma.billingSubscription.findFirst();
  assert.equal(b.activePaymentId,'pay_october');
  assert.equal(b.latestPaymentDueDate,'2026-10-08');
  assert.equal(await prisma.billingPayment.count(),2);
  assert.equal(await prisma.outboundMessage.count({where:{kind:'BILLING'}}),1);
});
test('atraso pausa pedidos, preserva cidade e pagamento do ciclo correto reativa', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','paid-before-overdue'));
  const october={id:'pay_october',subscription:'sub_test',customer:'cus_test',dueDate:'2026-10-08'};
  await asaas.POST(asaasRequest('PAYMENT_OVERDUE','october-overdue','2026-10-09 12:00:00',{payment:october}));
  const since=(await prisma.billingSubscription.findFirst()).overdueSince;
  assert.equal((await prisma.professional.findFirst()).status,'inadimplente');
  assert.equal(await prisma.territorySeat.count(),1);
  await asaas.POST(asaasRequest('PAYMENT_OVERDUE','october-overdue-again','2026-10-10 12:00:00',{payment:october}));
  assert.equal((await prisma.billingSubscription.findFirst()).overdueSince,since);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','september-late-overdue','2026-10-11 12:00:00'));
  assert.equal((await prisma.professional.findFirst()).status,'inadimplente');
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','october-paid','2026-10-12 12:00:00',{payment:october}));
  assert.equal((await prisma.professional.findFirst()).status,'assinante');
  assert.equal((await prisma.billingSubscription.findFirst()).overdueSince,null);
});
test('aviso de atraso atrasado não desfaz fatura paga e estorno é terminal por fatura', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','paid-for-late-overdue'));
  await asaas.POST(asaasRequest('PAYMENT_OVERDUE','late-overdue','2026-09-09 12:00:00'));
  assert.equal((await prisma.professional.findFirst()).status,'assinante');
  await asaas.POST(asaasRequest('PAYMENT_REFUNDED','terminal-refund','2026-09-10 12:00:00'));
  await asaas.POST(asaasRequest('PAYMENT_CONFIRMED','late-after-refund','2026-09-11 12:00:00'));
  assert.equal((await prisma.billingPayment.findFirst()).state,'REFUNDED');
  assert.equal((await prisma.professional.findFirst()).status,'interessado');
});
test('fatura sem vencimento válido, ciclo duplicado ou política ausente exige revisão sem commit', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  for (const dueDate of [undefined,'2026-02-30','bad']) {
    assert.equal((await asaas.POST(asaasRequest('PAYMENT_RECEIVED','invalid-'+dueDate,undefined,{
      payment:{id:'pay_test',subscription:'sub_test',customer:'cus_test',dueDate},
    }))).status,503);
  }
  delete process.env.ASAAS_OVERDUE_POLICY;
  assert.equal((await asaas.POST(asaasRequest('PAYMENT_OVERDUE','policy-unset'))).status,503);
  assert.equal(await prisma.billingPayment.count(),0);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED','correct-payment'));
  assert.equal((await asaas.POST(asaasRequest('PAYMENT_RECEIVED','duplicate-cycle',undefined,{
    payment:{id:'pay_duplicate',subscription:'sub_test',customer:'cus_test',dueDate:'2026-09-08'},
  }))).status,503);
  assert.equal(await prisma.billingPayment.count(),1);
});
async function overdueCandidate(ageDays=8) {
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_OVERDUE','overdue-candidate'));
  await prisma.billingSubscription.updateMany({data:{overdueSince:new Date(Date.now()-ageDays*86400000).toISOString()}});
}
test('cancelamento automático respeita trava e sete dias completos', async () => {
  const {processarInadimplencia}=require('../src/lib/asaas.ts');
  await overdueCandidate(6.99);
  assert.equal((await processarInadimplencia()).evaluated,0);
  process.env.ASAAS_OVERDUE_AUTOCANCEL_ENABLED='true';
  assert.equal((await processarInadimplencia()).evaluated,0);
  assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
});
test('worker concorrente cancela atraso uma vez e só webhook libera cidade', async () => {
  const {processarInadimplencia}=require('../src/lib/asaas.ts');
  await overdueCandidate();
  process.env.ASAAS_OVERDUE_AUTOCANCEL_ENABLED='true';
  await Promise.all(Array.from({length:10},()=>processarInadimplencia()));
  assert.equal(calls.filter(c=>c.method==='DELETE').length,1);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState,'SUBMITTED');
  assert.equal(await prisma.territorySeat.count(),1);
  await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED','overdue-cancelled'));
  assert.equal(await prisma.territorySeat.count(),0);
  assert.equal((await prisma.billingSubscription.findFirst()).state,'CANCELLED');
});
for (const scenario of ['overdue-already-paid','overdue-wrong-owner','overdue-fetch-failure','paid-during-check','cancel-timeout']) {
  test(`cancelamento automático ${scenario} fica para conciliação sem repetição`,async()=>{
    const {processarInadimplencia}=require('../src/lib/asaas.ts');
    await overdueCandidate();
    process.env.ASAAS_OVERDUE_AUTOCANCEL_ENABLED='true'; mode=scenario;
    await processarInadimplencia(); await processarInadimplencia();
    assert.equal((await prisma.billingSubscription.findFirst()).cancellationState,'REVIEW');
    assert.equal(calls.filter(c=>c.method==='DELETE').length,scenario==='cancel-timeout'?1:0);
    assert.equal(await prisma.territorySeat.count(),1);
  });
}
test('diagnóstico operacional é protegido, somente leitura e não contém dados pessoais',async()=>{
  const ops=require('../src/app/api/internal/operations/route.ts');
  process.env.INTERNAL_JOB_TOKEN='test-internal';
  assert.equal((await ops.GET(new NextRequest('http://localhost/api/internal/operations'))).status,403);
  await prisma.outboundMessage.create({data:{key:'ops-test',recipient:'11900000001',kind:'TEXT',state:'REVIEW',payload:{text:'CONTEUDO PRIVADO'}}});
  const r=await ops.GET(new NextRequest('http://localhost/api/internal/operations',{headers:{authorization:'Bearer test-internal'}}));
  const data=await r.json();
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal(data.attentionRequired,true);assert.equal(data.outbox[0].key,'ops-test');
  assert.equal(JSON.stringify(data).includes('CONTEUDO PRIVADO'),false);
  assert.equal(JSON.stringify(data).includes('11900000001'),false);
  assert.equal(calls.length,0);
  assert.equal((await prisma.outboundMessage.findFirst()).state,'REVIEW');
});
test('evento Asaas com falha fica visível e pode ser retomado uma única vez',async()=>{
  assert.equal((await asaas.POST(asaasRequest('PAYMENT_RECEIVED','retry-after-link'))).status,503);
  assert.equal((await prisma.webhookReceipt.findFirst()).state,'FAILED');
  await gerarCobrancaTerritorio(billingOptions);
  const result=await Promise.all(Array.from({length:10},()=>asaas.POST(asaasRequest('PAYMENT_RECEIVED','retry-after-link'))));
  assert.ok(result.every(r=>r.status===200));
  assert.equal((await prisma.webhookReceipt.findFirst()).state,'DONE');
  assert.equal(await prisma.territoryEvent.count(),1);
  assert.equal(await prisma.outboundMessage.count(),1);
});
test('HMAC valida bytes originais, rejeita segredo errado, formato inválido e alteração de espaços', () => {
  const raw = Buffer.from('{"a":1}');
  const signature = `sha256=${createHmac('sha256', 'key').update(raw).digest('hex')}`;
  assert.equal(assinaturaMetaValida(raw, signature, 'key'), true);
  assert.equal(assinaturaMetaValida(raw, signature, 'other'), false);
  assert.equal(assinaturaMetaValida(Buffer.from('{"a": 1}'), signature, 'key'), false);
  for (const invalid of [null, '', 'sha256=zz', 'sha1=' + 'a'.repeat(40)]) assert.equal(assinaturaMetaValida(raw, invalid, 'key'), false);
});
test('GET usa verify token separado; POST falha fechado sem app secret', async () => {
  const good = new NextRequest('http://localhost/?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=123');
  assert.equal(await (await meta.GET(good)).text(), '123');
  assert.equal((await meta.GET(new NextRequest('http://localhost/?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=123'))).status, 403);
  delete process.env.WHATSAPP_APP_SECRET;
  assert.equal((await meta.POST(request(payload()))).status, 503);
  assert.equal(await prisma.webhookReceipt.count(), 0);
});
test('assinatura inválida, JSON inválido e corpo excessivo não produzem efeitos', async () => {
  assert.equal((await meta.POST(request(payload(), 'sha256=' + '0'.repeat(64)))).status, 403);
  assert.equal((await meta.POST(request('{'))).status, 400);
  assert.equal((await meta.POST(request('x'.repeat(1024 * 1024 + 1)))).status, 413);
  assert.equal(calls.length, 0);
  assert.equal(await prisma.webhookReceipt.count(), 0);
});
test('outro telefone e status de entrega são ignorados; texto sem ID é rejeitado', async () => {
  assert.equal((await meta.POST(request(payload('foreign', 'QUERO', 'outro-phone')))).status, 200);
  const status = payload(); delete status.entry[0].changes[0].value.messages;
  assert.equal((await meta.POST(request(status))).status, 200);
  const missing = payload(); delete missing.entry[0].changes[0].value.messages[0].id;
  assert.equal((await meta.POST(request(missing))).status, 400);
  assert.equal(calls.length, 0);
});
test('reentrega do mesmo message ID não repete resposta nem assinatura', async () => {
  assert.equal((await meta.POST(request(payload()))).status, 200);
  const firstCalls = calls.length;
  assert.equal((await meta.POST(request(payload()))).status, 200);
  assert.equal(calls.length, firstCalls);
  assert.equal(subscriptionPosts().length, 1);
});
test('20 QUERO simultâneos com IDs diferentes emitem apenas uma assinatura', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => meta.POST(request(payload(`concurrent-${i}`)))));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(subscriptionPosts().length, 1);
  assert.equal(await prisma.billingSubscription.count(), 1);
});
test('concorrência no mesmo ID não executa dois handlers', async () => {
  let runs = 0;
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => processarUmaVez('test', 'same', async () => {
    runs++; await new Promise(resolve => setTimeout(resolve, 20));
  })));
  assert.equal(runs, 1);
  assert.ok(results.some(r => r.status === 'fulfilled'));
  await processarUmaVez('test', 'same', async () => { runs++; });
  assert.equal(runs, 1);
});
test('timeout após POST permanece bloqueado mesmo com novo pedido', async () => {
  mode = 'ambiguous';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'assinatura_requer_revisao');
  mode = '';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'assinatura_requer_revisao');
  assert.equal(subscriptionPosts().length, 1);
  assert.equal((await prisma.billingSubscription.findUnique({ where: { professionalId: billingOptions.professionalId } })).state, 'REVIEW');
});
test('crash persistido em CREATING não permite nova emissão', async () => {
  await prisma.billingSubscription.create({ data: { professionalId: billingOptions.professionalId, territorySlug: 'sao-paulo-sp', environment: 'sandbox' } });
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'assinatura_requer_revisao');
  assert.equal(calls.length, 0);
});
test('falha de consulta da fatura reutiliza subscriptionId já salvo', async () => {
  mode = 'invoice-failure';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).subscriptionId, 'sub_test');
  mode = '';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).ok, true);
  assert.equal(subscriptionPosts().length, 1);
});
test('assinatura legada e falha na consulta de cliente bloqueiam criação', async () => {
  mode = 'legacy';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'assinatura_requer_revisao');
  assert.equal(subscriptionPosts().length, 0);
});
test('falha ao consultar cliente não é interpretada como ausência', async () => {
  mode = 'customer-get-failure';
  await gerarCobrancaTerritorio(billingOptions);
  assert.equal(calls.filter(c => c.method === 'POST').length, 0);
});
test('billing desativado e ambiente indefinido impedem requisições financeiras', async () => {
  process.env.ASAAS_BILLING_ENABLED = 'false';
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'cobranca_desabilitada');
  process.env.ASAAS_BILLING_ENABLED = 'true'; delete process.env.ASAAS_ENV;
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).motivo, 'cobranca_desabilitada');
  assert.equal(calls.length, 0);
});
test('primeiro CPF recebido é utilizado na mesma tentativa', async () => {
  await prisma.professional.update({ where: { id: billingOptions.professionalId }, data: { cpf: null, status: 'interessado' } });
  assert.equal((await meta.POST(request(payload('cpf-first', '000.000.000-00')))).status, 200);
  assert.equal(calls.find(c => c.path === '/v3/customers' && c.method === 'POST').body.cpfCnpj, '00000000000');
  assert.equal(subscriptionPosts().length, 1);
});
test('falha de resposta WhatsApp permite retry sem nova assinatura', async () => {
  mode = 'message-failure';
  assert.equal((await meta.POST(request(payload()))).status, 503);
  mode = '';
  assert.equal((await meta.POST(request(payload()))).status, 200);
  assert.equal(subscriptionPosts().length, 1);
});
test('Asaas rejeita autenticação errada e assinatura sem vínculo', async () => {
  const bad = asaasRequest('PAYMENT_RECEIVED', 'e1'); bad.headers.set('asaas-access-token', 'bad');
  assert.equal((await asaas.POST(bad)).status, 403);
  assert.equal((await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'e2'))).status, 503);
  assert.equal(await prisma.webhookReceipt.count({where:{provider:'asaas',eventId:'e2',state:'FAILED'}}), 1);
});
test('cobranças de outros sistemas não bloqueiam fila Asaas nem alteram profissionais', async () => {
  const standalone = asaasRequest('PAYMENT_RECEIVED', 'standalone', undefined, {
    payment: { id: 'pay_other', customer: 'other' },
  });
  assert.equal((await asaas.POST(standalone)).status, 200);
  assert.equal((await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED', 'foreign-sub', undefined, {
    subscription: { id: 'sub_other', customer: 'other' },
  }))).status, 200);
  assert.equal(await prisma.territoryEvent.count(), 0);
});
test('CPF não é coletado pelo webhook enquanto cobrança estiver desabilitada', async () => {
  process.env.ASAAS_BILLING_ENABLED = 'false';
  await prisma.professional.update({ where: { id: billingOptions.professionalId }, data: { cpf: null, status: 'interessado' } });
  await meta.POST(request(payload('disabled-cpf', '00000000000')));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).cpf, null);
  assert.equal(calls.length, 0);
});
test('não quero não gera cobrança; pedido de informação também não', async () => {
  await meta.POST(request(payload('question', 'quero saber os preços')));
  assert.equal(calls.length, 0);
  await meta.POST(request(payload('optout', 'não quero')));
  assert.equal(subscriptionPosts().length, 0);
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'recusado');
});
test('cadastros ambíguos com e sem DDI são bloqueados antes de cobrar', async () => {
  await prisma.professional.create({ data: { nome: 'Outro cadastro', whatsapp: '55' + billingOptions.whatsapp,
    territorySlug: 'sao-paulo-sp', cpf: billingOptions.cpf, status: 'contatado' } });
  assert.equal((await meta.POST(request(payload('ambiguous-sender')))).status, 503);
  assert.equal(calls.length, 0);
});
test('evento Asaas duplicado aplica alteração uma vez, cancelamento usa objeto subscription', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  const results = await Promise.all(Array.from({ length: 10 }, () => asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'paid'))));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(await prisma.territoryEvent.count(), 1);
  assert.equal(calls.filter(c => c.path.endsWith('/messages')).length, 0);
  assert.equal(await prisma.outboundMessage.count({where:{kind:'BILLING'}}), 1);
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'assinante');
  assert.equal((await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED', 'cancelled', '2026-09-08 12:01:00', { payment: undefined }))).status, 200);
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'cancelado');
  await asaas.POST(asaasRequest('PAYMENT_CONFIRMED', 'late', '2026-09-08 12:02:00'));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'cancelado');
});
test('exclusão de fatura diferente e pagamento antigo não alteram período atual', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'paid', '2026-09-08 12:02:00'));
  await asaas.POST(asaasRequest('PAYMENT_DELETED', 'deleted-other', '2026-09-08 12:03:00', {
    payment: { id: 'pay_other', subscription: 'sub_test', customer: 'cus_test', dueDate: '2026-10-08' },
  }));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'assinante');
  await asaas.POST(asaasRequest('PAYMENT_REFUNDED', 'refunded', '2026-09-08 12:04:00'));
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'old', '2026-09-08 12:01:00'));
  assert.equal((await prisma.professional.findUnique({ where: { id: billingOptions.professionalId } })).status, 'interessado');
});

test('pagamento é commitado com aviso durável; falha Meta fica em revisão sem envio duplicado', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  mode = 'message-failure';
  assert.equal((await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'durable-paid'))).status, 200);
  const job = await prisma.outboundMessage.findFirst();
  assert.equal(job.state, 'PENDING');
  assert.equal(calls.filter(c => c.path.endsWith('/messages')).length, 0);
  await processarOutbox();
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:job.key}})).state, 'REVIEW');
  mode = '';
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'durable-paid'));
  await processarOutbox();
  assert.equal(calls.filter(c => c.path.endsWith('/messages')).length, 1);
  assert.equal(await prisma.outboundMessage.count(), 1);
});
test('avisos financeiros recebem callback de entrega pela outbox', async () => {
  const { processarOutbox, registrarEntregas } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'delivery-paid'));
  await processarOutbox();
  const job = await prisma.outboundMessage.findFirst();
  assert.equal(job.state, 'SENT');
  await registrarEntregas(delivery(job.messageId));
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:job.key}})).state, 'DELIVERED');
});
test('cancelamento fora de ordem é terminal e bloqueia aviso de ativação ainda pendente', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'paid-newer', '2026-09-08 12:03:00'));
  await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED', 'cancel-older', '2026-09-08 12:01:00'));
  await processarOutbox();
  const sent = calls.filter(c => c.path.endsWith('/messages'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.type, 'template');
  assert.equal(sent[0].body.template.name, 'assinatura_cancelada');
  assert.equal(sent[0].body.text, undefined);
  assert.equal(await prisma.territorySeat.count(), 0);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'CONFIRMED');
  assert.equal(await prisma.outboundMessage.count({where:{state:'REVIEW'}}), 1);
});
test('aviso financeiro usa template pt_BR e cidade da assinatura, nunca texto legado', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'template-paid'));
  const job = await prisma.outboundMessage.findFirst();
  await prisma.outboundMessage.update({ where: { key: job.key }, data: {
    payload: { ...job.payload, text: 'Texto legado que nao deve ser enviado', city: 'Cidade incorreta' },
  } });
  await Promise.all([processarOutbox(), processarOutbox(), processarOutbox()]);
  const sent = calls.filter(c => c.path.endsWith('/messages'));
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].body, {
    messaging_product: 'whatsapp', to: '5511900000001', type: 'template',
    template: { name: 'pagamento_confirmado', language: { code: 'pt_BR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'São Paulo/SP' }] }] },
  });
  assert.equal((await prisma.outboundMessage.findUnique({where:{key:job.key}})).attempts, 1);
});
test('trava financeira ausente ou falsa preserva fila sem tentativas nem bloqueio de outros avisos', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  const { enviarAvisoFinanceiro } = require('../src/lib/whatsapp.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'gated-paid'));
  const job = await prisma.outboundMessage.findFirst();
  await prisma.outboundMessage.createMany({ data: Array.from({ length: 12 }, (_, i) => ({
    key: 'gated-extra-' + i, kind: 'BILLING', recipient: job.recipient, payload: job.payload,
    createdAt: new Date('2020-01-01'),
  })) });
  await prisma.outboundMessage.create({ data: { key: 'unblocked-text', kind: 'TEXT',
    recipient: job.recipient, payload: { text: 'Resposta solicitada de teste' } } });
  delete process.env.WHATSAPP_BILLING_TEMPLATES_ENABLED;
  assert.equal((await enviarAvisoFinanceiro(job.recipient, 'PAID', 'São Paulo/SP')).ok, false);
  assert.equal((await processarOutbox()).processed, 1);
  for (const value of ['false', 'TRUE', '1']) {
    process.env.WHATSAPP_BILLING_TEMPLATES_ENABLED = value;
    assert.equal((await processarOutbox()).processed, 0);
  }
  assert.equal(await prisma.outboundMessage.count({where:{kind:'BILLING',state:'PENDING',attempts:0}}), 13);
  assert.equal(calls.filter(c => c.path.endsWith('/messages')).length, 1);
  assert.equal(calls.find(c => c.path.endsWith('/messages')).body.type, 'text');
});
test('aviso financeiro pendente pode retomar após liberação sem depender de habilitar cobranças', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'resume-paid'));
  process.env.WHATSAPP_BILLING_TEMPLATES_ENABLED = 'false';
  assert.equal((await processarOutbox()).processed, 0);
  process.env.ASAAS_BILLING_ENABLED = 'false';
  process.env.WHATSAPP_BILLING_TEMPLATES_ENABLED = 'true';
  assert.equal((await processarOutbox()).processed, 1);
  assert.equal((await prisma.outboundMessage.findFirst()).state, 'SENT');
  assert.equal(subscriptionPosts().length, 1); // somente criação fictícia anterior à trava
});
for (const failureMode of ['message-timeout', 'message-no-id']) {
  test(`template financeiro ${failureMode} exige revisão sem repetição ou fallback em texto`, async () => {
    const { processarOutbox } = require('../src/lib/outbox.ts');
    await gerarCobrancaTerritorio(billingOptions);
    await asaas.POST(asaasRequest('PAYMENT_RECEIVED', failureMode));
    mode = failureMode;
    await processarOutbox();
    await processarOutbox();
    const job = await prisma.outboundMessage.findFirst();
    assert.equal(job.state, 'REVIEW');
    assert.equal(job.attempts, 1);
    assert.equal(job.messageId, null);
    const sent = calls.filter(c => c.path.endsWith('/messages'));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.type, 'template');
  });
}
test('template financeiro com destinatário divergente não é enviado', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await gerarCobrancaTerritorio(billingOptions);
  await asaas.POST(asaasRequest('PAYMENT_RECEIVED', 'wrong-recipient'));
  await prisma.outboundMessage.updateMany({data:{recipient:'11900000002'}});
  await processarOutbox();
  assert.equal((await prisma.outboundMessage.findFirst()).state, 'REVIEW');
  assert.equal(calls.filter(c => c.path.endsWith('/messages')).length, 0);
});
test('remetente financeiro recusa ação ou cidade inválida sem rede', async () => {
  const { enviarAvisoFinanceiro } = require('../src/lib/whatsapp.ts');
  for (const [action, city] of [['OTHER', 'São Paulo/SP'], ['PAID', '  '], ['CANCELLED', 'x'.repeat(201)]]) {
    assert.equal((await enviarAvisoFinanceiro(billingOptions.whatsapp, action, city)).ok, false);
  }
  assert.equal(calls.length, 0);
});
test('kind desconhecido da outbox não é tratado como convite', async () => {
  const { processarOutbox } = require('../src/lib/outbox.ts');
  await prisma.outboundMessage.create({data:{key:'unknown-kind',kind:'UNKNOWN',recipient:billingOptions.whatsapp,payload:{}}});
  await processarOutbox();
  assert.equal((await prisma.outboundMessage.findFirst()).state, 'REVIEW');
  assert.equal(calls.length, 0);
});
test('cancelamento exige pedido prévio e confirmação do mesmo titular pelo webhook autenticado', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{status:'assinante'}});
  await meta.POST(request(payload('cancel-no-request', 'CONFIRMAR CANCELAMENTO')));
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 0);
  await meta.POST(request(payload('cancel-request', 'CANCELAR ASSINATURA')));
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'REQUESTED');
  await meta.POST(request(payload('cancel-foreign', 'CONFIRMAR CANCELAMENTO', 'test-phone', '5511900000002')));
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 0);
  await meta.POST(request(payload('cancel-confirm', 'CONFIRMAR CANCELAMENTO')));
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'SUBMITTED');
  assert.equal(await prisma.territorySeat.count(), 1); // só liberar no evento confirmado
  await asaas.POST(asaasRequest('SUBSCRIPTION_DELETED', 'cancel-confirmed'));
  assert.equal((await prisma.professional.findFirst()).status, 'cancelado');
  assert.equal(await prisma.territorySeat.count(), 0);
  await meta.POST(request(payload('cancel-again', 'CONFIRMAR CANCELAMENTO')));
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
});
test('pedido de cancelamento vencido não chama DELETE', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await cancelarAssinatura(billingOptions.professionalId, false);
  await prisma.billingSubscription.update({where:{professionalId:billingOptions.professionalId},data:{cancellationRequestedAt:new Date(Date.now()-31*60_000)}});
  assert.match(await cancelarAssinatura(billingOptions.professionalId, true), /Nada foi cancelado/);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 0);
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).ok, true);
  assert.equal(subscriptionPosts().length, 1);
});
test('dez confirmações concorrentes emitem somente um DELETE', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await cancelarAssinatura(billingOptions.professionalId, false);
  await Promise.all(Array.from({length:10},()=>cancelarAssinatura(billingOptions.professionalId,true)));
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'SUBMITTED');
});
test('timeout de cancelamento exige revisão, não reemite DELETE nem libera cidade', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await cancelarAssinatura(billingOptions.professionalId, false);
  mode = 'cancel-timeout';
  await cancelarAssinatura(billingOptions.professionalId,true);
  mode = '';
  await cancelarAssinatura(billingOptions.professionalId,false);
  await cancelarAssinatura(billingOptions.professionalId,true);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'REVIEW');
  assert.equal(await prisma.territorySeat.count(), 1);
});
test('cancelamento confere vínculo remoto antes de apagar assinatura', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await cancelarAssinatura(billingOptions.professionalId, false);
  mode = 'cancel-mismatch';
  await cancelarAssinatura(billingOptions.professionalId,true);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 0);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, 'REVIEW');
});
test('callback durante DELETE não regride cancelamento confirmado para submetido', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await cancelarAssinatura(billingOptions.professionalId, false);
  mode = 'cancel-early-webhook';
  await cancelarAssinatura(billingOptions.professionalId,true);
  const billing = await prisma.billingSubscription.findFirst();
  assert.equal(billing.state, 'CANCELLED');
  assert.equal(billing.cancellationState, 'CONFIRMED');
});
test('desativar novas cobranças não impede cancelamento de contrato já existente', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  process.env.ASAAS_BILLING_ENABLED = 'false';
  await cancelarAssinatura(billingOptions.professionalId,false);
  await cancelarAssinatura(billingOptions.professionalId,true);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
});
test('titular não verificado e ambiente divergente não iniciam cancelamento', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{verifiedAt:null}});
  await cancelarAssinatura(billingOptions.professionalId,false);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, null);
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{verifiedAt:new Date()}});
  process.env.ASAAS_ENV='production';
  await cancelarAssinatura(billingOptions.professionalId,false);
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState, null);
  assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
});
test('não quero e cancelar genérico não encerram contrato; cancelamento pendente não reenvia fatura', async () => {
  await gerarCobrancaTerritorio(billingOptions);
  await prisma.professional.update({where:{id:billingOptions.professionalId},data:{status:'assinante'}});
  await meta.POST(request(payload('not-cancel', 'não quero')));
  await meta.POST(request(payload('generic-cancel', 'cancelar')));
  assert.equal((await prisma.billingSubscription.findFirst()).cancellationState,null);
  assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
  await cancelarAssinatura(billingOptions.professionalId,false);
  assert.equal((await gerarCobrancaTerritorio(billingOptions)).ok,false);
  assert.equal(subscriptionPosts().length,1);
});
