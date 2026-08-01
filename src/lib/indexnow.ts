/**
 * IndexNow — aviso instantâneo de páginas novas/atualizadas para
 * Bing, DuckDuckGo, Yandex, Naver e Seznam (protocolo aberto da Microsoft).
 *
 * A chave é pública por desenho: ela vive em /4464b176d9b90831806b751bc64339f4.txt
 * e prova que somos donos do domínio. Sem segredos aqui.
 *
 * Fire-and-forget: falha de IndexNow nunca pode quebrar o organismo.
 */

const INDEXNOW_KEY = "4464b176d9b90831806b751bc64339f4";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "pedreirosbr.com.br";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls.slice(0, 10000), // limite do protocolo
      }),
    });
    if (!res.ok) {
      console.warn(`[indexnow] resposta ${res.status} para ${urls.length} URL(s)`);
    } else {
      console.log(`[indexnow] ${urls.length} URL(s) submetida(s)`);
    }
  } catch (err) {
    console.warn("[indexnow] falha ao submeter (ignorada):", err);
  }
}
