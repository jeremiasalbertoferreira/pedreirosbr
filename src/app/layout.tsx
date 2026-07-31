import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { getOficioAtivo, SITE_URL } from "../oficios";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="pt-BR" className={`${archivo.variable} ${inter.variable}`}>
      <head>
        {adsenseClient && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-screen antialiased">
        <div className="relative z-10">
          <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-display text-xl font-black tracking-tight text-ink">
                PEDREIROS<span className="text-accent">BR</span>
                <span className="ml-1 align-middle text-xs font-medium text-ink-soft">.com.br</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
                <Link href="/calculadoras" className="rounded-lg px-3 py-2 text-ink-soft transition hover:bg-accent-soft hover:text-accent-dark">
                  Calculadoras
                </Link>
                <Link href="/para-pedreiros" className="hidden rounded-lg px-3 py-2 text-ink-soft transition hover:bg-accent-soft hover:text-accent-dark sm:block">
                  Para pedreiros
                </Link>
                <Link
                  href="/orcamento"
                  className="rounded-lg bg-ink px-4 py-2 font-semibold text-paper transition hover:bg-accent-dark"
                >
                  Orçamento em PDF
                </Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4">{children}</main>

          <footer className="mt-24 border-t border-ink/10 bg-paper-deep">
            <div className="mx-auto max-w-6xl px-4 py-12">
              <div className="grid gap-8 sm:grid-cols-3">
                <div>
                  <p className="font-display text-lg font-black text-ink">
                    PEDREIROS<span className="text-accent">BR</span>
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Ferramentas grátis para quem constrói e para quem reforma.
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-ink">Ferramentas</p>
                  <ul className="mt-2 space-y-1.5 text-ink-soft">
                    <li><Link href="/calculadoras" className="hover:text-accent">Calculadoras de obra</Link></li>
                    <li><Link href="/orcamento" className="hover:text-accent">Gerador de orçamento PDF</Link></li>
                    <li><Link href="/quanto-cobrar" className="hover:text-accent">Quanto cobrar em 2026</Link></li>
                  </ul>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-ink">Transparência</p>
                  <p className="mt-2 text-ink-soft">
                    Estimativas baseadas em referências públicas regionais (CUB/Sinduscon) e padrões
                    de consumo de obra. Valores reais variam por profissional e local.
                  </p>
                </div>
              </div>
              <p className="mt-10 border-t border-ink/10 pt-6 text-xs text-ink-soft">
                © {new Date().getFullYear()} {oficio.dominio} — feito no Brasil 🇧🇷
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
