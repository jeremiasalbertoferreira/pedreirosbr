/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CJS smoke test. */
// Read-only smoke test. No form submissions, credentials, charges or messages.
const assert = require('node:assert/strict');
const origin = process.argv[2];
if (!['http://127.0.0.1:3157', 'https://pedreirosbr.com.br'].includes(origin)) throw new Error('Use the fixed local preview or production origin');
const pages = ['', '/calculadoras', '/metodologia', '/contato', '/termos', '/politica-de-privacidade', '/exclusao-de-dados', '/para-pedreiros', '/quanto-cobrar', '/orcamento', ...['reboco', 'muro', 'pintura', 'telhado', 'banheiro'].map(s=>'/calculadoras/'+s), ...['sao-paulo-sp', 'osasco-sp', 'curitiba-pr', 'brasilia-df', 'fortaleza-ce'].map(c=>'/pedreiro-em/'+c)];
async function get(path, options={}) {
  return fetch(origin+path, { redirect:'manual', signal:AbortSignal.timeout(20000), ...options });
}
(async()=>{
  for (const path of pages) {
    const r = await get(path || '/'); assert.equal(r.status,200,path);
    const html = await r.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical,path+' canonical missing');
    assert.equal(canonical[1].replace(/\/$/,''),'https://pedreirosbr.com.br'+path,path);
    assert.doesNotMatch(html, /"@type":"FAQPage"/,path+' hidden FAQ');
    assert.match(html,/Como calculamos as estimativas/,path+' methodology navigation');
    if (path.startsWith('/pedreiro-em/')) {
      assert.match(html,/Não é uma pesquisa de preços/);
      assert.doesNotMatch(html,/"@type":"Service"/);
    }
  }
  const sitemap = await (await get('/sitemap.xml')).text();
  assert.equal((sitemap.match(/<loc>/g)||[]).length,866);
  assert.equal((sitemap.match(/<lastmod>/g)||[]).length,1);
  const llms = await (await get('/llms.txt')).text(); assert.match(llms,/Não há pesquisa municipal comprovada/);
  assert.equal((await get('/pedreiro-em/nao-existe-auditoria')).status,404);
  const redirectUrl = '/calculadoras/reboco?origem=seo-check';
  // Node fetch can ignore a custom Host header; use HTTP explicitly for local host routing.
  const www = origin.startsWith('http:') ? await new Promise((resolve,reject)=>{
    const req=require('node:http').get(origin+redirectUrl,{headers:{host:'www.pedreirosbr.com.br'}},res=>{
      res.resume();resolve({status:res.statusCode,headers:new Headers(res.headers)});
    });
    req.setTimeout(20000,()=>req.destroy(new Error('timeout')));req.on('error',reject);
  }) : await fetch('https://www.pedreirosbr.com.br'+redirectUrl,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  assert.equal(www.status,308);assert.equal(www.headers.get('location'),'https://pedreirosbr.com.br'+redirectUrl);
  const health=await get('/api/health');assert.equal(health.status,200);
  console.log(JSON.stringify({ok:true,origin,pagesChecked:pages.length,sitemapUrls:866,wwwRedirect:308,unknownCity:404,health:200,noExternalWrites:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
