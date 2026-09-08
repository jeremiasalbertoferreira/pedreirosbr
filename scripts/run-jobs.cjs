// Executar dentro do container. Não colocar o token na linha de comando ou nos logs.
if (!process.env.INTERNAL_JOB_TOKEN) {
  console.error('PedreirosBR: token do worker ausente'); process.exit(1);
}
fetch('http://127.0.0.1:3000/api/internal/jobs', {
  method: 'POST', headers: { authorization: `Bearer ${process.env.INTERNAL_JOB_TOKEN}` },
  signal: AbortSignal.timeout(55000),
}).then(async response => {
  if (!response.ok) throw new Error('worker_failed');
  const result = await response.json();
  console.log(JSON.stringify({ ok: result.ok === true, processed: result.processed ?? 0 }));
}).catch(() => { console.error('PedreirosBR: worker não concluiu'); process.exitCode = 1; });
