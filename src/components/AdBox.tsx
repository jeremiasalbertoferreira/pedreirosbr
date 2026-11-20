"use client";

import { useEffect, useRef, useState } from "react";

interface Anuncio { id: string; titulo: string; texto: string; categoria: string; anunciante: string }
interface Estado { ad: Anuncio | null; anuncie: boolean; desde: string }

/**
 * Box de anúncio local. Só pede o anúncio quando o box está perto de aparecer na tela:
 * a exibição contada fica próxima do que o visitante de fato viu, e o conteúdo acima não se desloca.
 * Com o módulo desligado, ou sem anúncio e sem cadastro aberto, não ocupa espaço.
 */
export function AdBox({ territorio }: { territorio?: string }) {
  const marco = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    const el = marco.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let pedido = false;
    const obs = new IntersectionObserver((entradas) => {
      if (pedido || !entradas.some((e) => e.isIntersecting)) return;
      pedido = true;
      obs.disconnect();
      fetch(`/api/anuncio/exibir${territorio ? `?t=${encodeURIComponent(territorio)}` : ""}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.ok) setEstado({ ad: d.ad ?? null, anuncie: d.anuncie === true, desde: String(d.desde ?? "") }); })
        .catch(() => {});
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [territorio]);

  const ad = estado?.ad;
  return (
    <div ref={marco}>
      {ad && (
        <aside aria-label="Anúncio" className="rounded-2xl border border-ink/15 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Anúncio · {ad.categoria}</p>
          <a href={`/api/anuncio/clique?c=${ad.id}`} target="_blank" rel="sponsored nofollow noopener" className="group mt-2 block">
            <span className="block font-display text-xl font-bold text-ink group-hover:text-accent-dark">{ad.titulo}</span>
            <span className="mt-1 block text-ink-soft">{ad.texto}</span>
            <span className="mt-3 inline-block rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-dark">{ad.anunciante} →</span>
          </a>
          <p className="mt-4 text-xs text-ink-soft">
            Anúncio pago, de responsabilidade do anunciante. <a href="/anuncie" className="underline">Anuncie aqui</a>
          </p>
        </aside>
      )}
      {estado && !ad && estado.anuncie && (
        <aside aria-label="Espaço para anúncio" className="rounded-2xl border border-dashed border-ink/25 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Espaço para anúncio</p>
          <p className="mt-2 font-display text-xl font-bold text-ink">Tem loja de materiais de construção? Anuncie aqui.</p>
          <p className="mt-1 text-ink-soft">Apareça para quem está calculando a obra{territorio ? " nesta região" : ""}. Planos mensais a partir de {estado.desde}.</p>
          <a href="/anuncie" className="mt-3 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-accent-dark">Ver planos</a>
        </aside>
      )}
    </div>
  );
}
