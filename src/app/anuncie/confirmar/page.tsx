import type { Metadata } from "next";
import { ConfirmarEmailAnuncio } from "../../../components/AcoesAnuncio";

export const metadata: Metadata = { title: "Confirmar e-mail do anunciante", robots: { index: false, follow: false } };

export default async function ConfirmarPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const t = (await searchParams).t;
  const token = typeof t === "string" && /^[\w-]{20,64}$/.test(t) ? t : null;
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <h1 className="font-display text-3xl font-black text-ink">Confirme seu e-mail</h1>
      {token ? (
        <>
          <p className="text-ink-soft">Falta um clique para o seu anúncio seguir para a análise.</p>
          <ConfirmarEmailAnuncio token={token} />
        </>
      ) : (
        <p className="text-ink-soft">Este link está incompleto. Abra de novo o link que enviamos por e-mail ou faça o cadastro em <a className="underline" href="/anuncie">Anuncie</a>.</p>
      )}
    </div>
  );
}
