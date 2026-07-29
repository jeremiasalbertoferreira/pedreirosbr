import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getOficioAtivo, SITE_URL } from "../oficios";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${oficio.nomePlural}BR — Calculadoras de obra e preços de ${oficio.nome.toLowerCase()} na sua cidade`,
    template: `%s | ${oficio.nomePlural}BR`,
  },
  description:
    "Calculadoras de obra grátis: reboco, muro, pintura, telhado e reforma de banheiro. Preços de pedreiro por cidade, gerador de orçamento em PDF e materiais detalhados — direto no seu WhatsApp.",
  openGraph: { siteName: `${oficio.nomePlural}BR`, locale: "pt_BR", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <html lang="pt-BR">
      <head>
        {adsenseClient && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-screen bg-amber-50 text-neutral-900 antialiased">
        <header className="border-b border-orange-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-extrabold text-orange-700">
              {oficio.nomePlural}BR<span className="text-neutral-400">.com.br</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-neutral-700">
              <Link href="/calculadoras" className="hover:text-orange-700">Calculadoras</Link>
              <Link href="/quanto-cobrar" className="hover:text-orange-700">Para pedreiros</Link>
              <Link
                href="/orcamento"
                className="rounded-lg bg-orange-700 px-3 py-1.5 text-white hover:bg-orange-800"
              >
                Orçamento em PDF
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-orange-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-500">
            <p className="font-semibold text-neutral-700">{oficio.nomePlural}BR — ferramentas grátis para quem constrói e para quem reforma.</p>
            <p className="mt-2">
              Estimativas baseadas em referências públicas regionais (CUB/Sinduscon) e padrões de consumo de obra.
              Valores reais variam conforme profissional, acesso e condições do local.
            </p>
            <p className="mt-4">© {new Date().getFullYear()} {oficio.dominio}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
