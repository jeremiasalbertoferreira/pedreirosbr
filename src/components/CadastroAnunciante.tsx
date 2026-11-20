"use client";

import { useMemo, useState } from "react";

interface Props {
  ufs: { uf: string; nome: string }[];
  cidades: { slug: string; nome: string; uf: string }[];
  categorias: { slug: string; nome: string }[];
  /** preços já formatados, vindos do servidor */
  precos: { cidade: string; estado: string; brasil: string };
  termsVersion: string;
}

const campo = "mt-1.5 w-full rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const rotulo = "block text-sm font-semibold text-ink";
const FALHA = "Não conseguimos registrar agora. Tente de novo em instantes.";

/** Cadastro self-service de anúncio. O envio só começa a confirmação do e-mail: nada é publicado nem cobrado aqui. */
export function CadastroAnunciante({ ufs, cidades, categorias, precos, termsVersion }: Props) {
  const [cnpj, setCnpj] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [categoria, setCategoria] = useState("");
  const [escopo, setEscopo] = useState<"cidade" | "estado" | "brasil">("cidade");
  const [uf, setUf] = useState("SP");
  const [cidade, setCidade] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("");
  const [consent, setConsent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  const cidadesDaUF = useMemo(() => cidades.filter((c) => c.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome)), [cidades, uf]);
  const planos = [
    { id: "cidade" as const, nome: "Uma cidade", preco: precos.cidade, detalhe: "Aparece na página da cidade escolhida." },
    { id: "estado" as const, nome: "Um estado", preco: precos.estado, detalhe: "Aparece nas páginas de todas as cidades do estado." },
    { id: "brasil" as const, nome: "Brasil", preco: precos.brasil, detalhe: "Aparece em todas as cidades e nas calculadoras." },
  ];

  async function enviar() {
    if (cnpj.replace(/[^0-9A-Za-z]/g, "").length !== 14) { setErro("Confira o CNPJ."); return; }
    if (nome.trim().length < 2) { setErro("Informe o nome da loja."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErro("Confira o e-mail."); return; }
    if (!categoria) { setErro("Escolha a categoria da loja."); return; }
    if (escopo === "cidade" && !cidade) { setErro("Escolha a cidade."); return; }
    if (titulo.trim().length < 3) { setErro("Escreva o título do anúncio."); return; }
    if (texto.trim().length < 10) { setErro("Escreva o texto do anúncio, com pelo menos 10 caracteres."); return; }
    if (!destino.trim()) { setErro("Informe o site ou o WhatsApp da loja."); return; }
    if (!consent) { setErro("Aceite os termos para continuar."); return; }
    setErro("");
    setEnviando(true);
    try {
      const resp = await fetch("/api/anuncio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj, nome, email, categoria, escopo, uf, territorySlug: cidade, titulo, texto, destino, consent, termsVersion }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) setErro(data?.error ?? FALHA);
      else setEnviado(true);
    } catch {
      setErro(FALHA);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div role="status" className="rounded-2xl border-2 border-green-600/30 bg-green-50 p-6 sm:p-8">
        <p className="font-display text-2xl font-black text-green-900">Falta confirmar o e-mail</p>
        <p className="mt-2 text-green-900/80">
          Enviamos uma mensagem para <strong>{email.trim()}</strong>. Abra e confirme em até 24 horas. Depois disso o anúncio passa pela análise.
          Nada é cobrado antes da aprovação.
        </p>
        <p className="mt-3 text-sm text-green-900/70">Não chegou em alguns minutos? Veja a caixa de spam.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_2px_0_0_rgba(28,25,23,0.06)] sm:p-8">
      <fieldset>
        <legend className={rotulo}>Onde o anúncio deve aparecer</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {planos.map((p) => (
            <label key={p.id} className={`block cursor-pointer rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${escopo === p.id ? "border-accent bg-accent-soft" : "border-ink/10 bg-paper hover:border-ink/30"}`}>
              <input type="radio" name="escopo" className="sr-only" checked={escopo === p.id} onChange={() => setEscopo(p.id)} />
              <span className="block font-display font-bold text-ink">{p.nome}</span>
              <span className="mt-1 block font-display text-2xl font-black text-accent-dark">{p.preco}<span className="text-sm font-medium text-ink-soft"> por mês</span></span>
              <span className="mt-1 block text-xs text-ink-soft">{p.detalhe}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {escopo !== "brasil" && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block"><span className={rotulo}>Estado</span>
            <select aria-label="Estado" className={campo} value={uf} onChange={(e) => { setUf(e.target.value); setCidade(""); }}>
              {ufs.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
            </select>
          </label>
          {escopo === "cidade" && (
            <label className="block"><span className={rotulo}>Cidade</span>
              <select aria-label="Cidade" className={campo} value={cidade} onChange={(e) => setCidade(e.target.value)}>
                <option value="">— escolha a cidade —</option>
                {cidadesDaUF.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block"><span className={rotulo}>CNPJ da loja</span>
          <input className={campo} inputMode="text" autoComplete="off" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </label>
        <label className="block"><span className={rotulo}>Nome da loja</span>
          <input className={campo} maxLength={80} autoComplete="organization" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block"><span className={rotulo}>E-mail</span>
          <input className={campo} type="email" autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="mt-2 block text-xs text-ink-soft">Recebe a confirmação, a cobrança e o relatório mensal.</span>
        </label>
        <label className="block"><span className={rotulo}>Categoria</span>
          <select aria-label="Categoria" className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">— escolha —</option>
            {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
          </select>
        </label>
        <label className="block"><span className={rotulo}>Título do anúncio <span className="font-normal text-ink-soft">({titulo.length}/40)</span></span>
          <input className={campo} maxLength={40} placeholder="Ex.: Cimento e areia com entrega" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label className="block"><span className={rotulo}>Site ou WhatsApp da loja</span>
          <input className={campo} maxLength={200} placeholder="https://sualoja.com.br ou (11) 99999-9999" value={destino} onChange={(e) => setDestino(e.target.value)} />
          <span className="mt-2 block text-xs text-ink-soft">É para onde vai quem clicar no anúncio.</span>
        </label>
        <label className="block sm:col-span-2"><span className={rotulo}>Texto do anúncio <span className="font-normal text-ink-soft">({texto.length}/100)</span></span>
          <textarea className={campo} rows={2} maxLength={100} placeholder="Ex.: Tudo para a sua obra, do alicerce ao acabamento. Entrega no mesmo dia." value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      </div>

      <div className="mt-6">
        <p className={rotulo}>Como vai aparecer</p>
        <div className="mt-2 rounded-2xl border border-ink/15 bg-paper p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Anúncio{categoria ? ` · ${categorias.find((c) => c.slug === categoria)?.nome}` : ""}</p>
          <p className="mt-2 font-display text-xl font-bold text-ink">{titulo.trim() || "Título do anúncio"}</p>
          <p className="mt-1 text-ink-soft">{texto.trim() || "Texto do anúncio."}</p>
          <p className="mt-3 inline-block rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-dark">{nome.trim() || "Nome da loja"} →</p>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 py-2 text-sm text-ink-soft">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Li e aceito os <a className="underline" href="/anuncie/termos" target="_blank" rel="noopener">termos para anunciantes</a> e a{" "}
          <a className="underline" href="/politica-de-privacidade" target="_blank" rel="noopener">política de privacidade</a>. Declaro que represento a empresa
          e que ela vende produtos para construção.
        </span>
      </label>
      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-4 w-full rounded-xl bg-accent px-6 py-4 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#9A3412] transition hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar para análise"}
      </button>
      {erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}
      <p className="mt-3 text-sm text-ink-soft">Próximos passos: confirmação do e-mail, análise do anúncio e pagamento da primeira mensalidade. O anúncio entra no ar depois do pagamento.</p>
    </div>
  );
}
