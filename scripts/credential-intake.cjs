/* eslint-disable @typescript-eslint/no-require-imports */
// Formulário de uso único, somente loopback. Segredos ficam em memória e seguem por SSH ao Coolify.
const http = require('node:http');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { spawn } = require('node:child_process');
function createCredentialServer({ saveCredentials, nonce = randomBytes(24).toString('hex'), onSaved = () => console.log('CREDENTIALS_CONFIGURED_OK') } = {}) {
if (!/^[a-f0-9]{48}$/.test(nonce)) throw new Error('Invalid form identifier');
const csrf = randomBytes(32).toString('hex');
let busy = false;
let saved = false;
const server = http.createServer(async (req, res) => {
  const base = `http://127.0.0.1:${server.address().port}`;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${csrf}'; connect-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`);
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.url !== `/${nonce}` || req.headers.host !== new URL(base).host) { res.writeHead(404).end(); return; }
  if (saved) { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Credenciais salvas no PedreirosBR. Pode voltar à conversa.'); return; }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Conectar PedreirosBR</title><style>body{font:18px system-ui;max-width:600px;margin:50px auto;padding:24px;background:#faf7f2;color:#27221b}label{display:block;margin:24px 0 8px}input{box-sizing:border-box;width:100%;padding:14px;font:inherit}button{margin-top:28px;padding:16px;background:#964315;color:white;border:0;border-radius:8px;font:inherit}</style><h1>Conectar o WhatsApp PedreirosBR</h1><p>Esta página roda apenas neste computador. Os valores seguem por SSH para o ambiente do PedreirosBR no Coolify, sem passar pela conversa ou pelo Git.</p><form method="post"><input type="hidden" name="csrf" value="${csrf}"><label>Token do usuário pedreirosbr-api</label><input name="token" type="password" autocomplete="off" required minlength="80"><label>Chave secreta do app PedreirosBR (App Secret)</label><input name="appSecret" type="password" autocomplete="off" required pattern="[a-fA-F0-9]{32}"><button>Salvar credenciais no PedreirosBR</button></form><p>As cobranças automáticas continuarão desligadas. Esta ação não publica o site nem envia mensagens.</p><p id="status" role="status" aria-live="polite"></p><script nonce="${csrf}">const f=document.querySelector('form');const s=document.getElementById('status');f.addEventListener('submit',async(e)=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;s.textContent='Salvando na VPS… aguarde.';try{const response=await fetch(location.pathname,{method:'POST',body:new URLSearchParams(new FormData(f)),credentials:'same-origin',cache:'no-store'});s.textContent=await response.text();if(response.ok){f.reset();f.hidden=true;}}catch{s.textContent='Conexão interrompida. Os campos foram mantidos. Tente salvar novamente.';}finally{b.disabled=false;}});</script></html>`);
    return;
  }
  // WebViews podem omitir Origin; formulários também podem enviá-lo como null.
  // O token CSRF aleatório é obrigatório em todos os POSTs, inclusive same-origin.
  const origin = req.headers.origin;
  if (req.method !== 'POST' || (origin && origin !== 'null' && origin !== base) || req.headers['sec-fetch-site'] === 'cross-site' || busy) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Envio bloqueado. Abra novamente o formulário pelo endereço fornecido e tente salvar.');
    return;
  }
  busy = true;
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 8192) throw new Error('size'); }
    const form = new URLSearchParams(body);
    const supplied = Buffer.from(form.get('csrf') || '');
    const expected = Buffer.from(csrf);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      busy = false;
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Formulário antigo ou inválido. Reabra o endereço atualizado.');
      return;
    }
    const input = { token: (form.get('token') || '').trim(), appSecret: (form.get('appSecret') || '').trim() };
    if (!/^[A-Za-z0-9_-]{80,4096}$/.test(input.token) || !/^[a-f0-9]{32}$/i.test(input.appSecret)) throw new Error('invalid');
    if (saveCredentials) { await saveCredentials(input); } else {
    const child = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'forja-01', 'docker exec -i coolify php /tmp/pedreirosbr-configure.php'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { if (output.length < 8192) output += chunk; });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    const timer = setTimeout(() => child.kill('SIGTERM'), 45000);
    let code;
    try {
      const completion = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
      child.stdin.end(JSON.stringify(input));
      code = await completion;
    } finally { clearTimeout(timer); }
    if (code !== 0 || !JSON.parse(output).ok) throw new Error('configure');
    }
    saved = true;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Credenciais salvas no PedreirosBR. Pode voltar à conversa. Nenhuma cobrança ou mensagem foi enviada.');
    onSaved();
  } catch (error) {
    busy = false;
    const message = error.message === 'invalid'
      ? 'Formato inválido: use apenas o token no primeiro campo e a chave App Secret de 32 caracteres no segundo.'
      : 'A gravação na VPS não foi concluída. Seu preenchimento foi mantido; avise na conversa para verificarmos.';
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(message);
  }
});
return { server, nonce };
}
module.exports = { createCredentialServer };
if (require.main === module) {
const { server, nonce } = createCredentialServer();
server.listen(0, '127.0.0.1', () => console.log(`CREDENTIAL_FORM_URL=http://127.0.0.1:${server.address().port}/${nonce}`));
setTimeout(() => server.close(), 30 * 60 * 1000).unref();
}
