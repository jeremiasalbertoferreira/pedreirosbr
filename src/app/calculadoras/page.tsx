import type { Metadata } from "next";
import Link from "next/link";
import { getOficioAtivo, SITE_URL } from "../../oficios";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  title: "Calculadoras de obra grátis",
  description: "Simule reboco, muro, pintura, telhado e banheiro com fatores internos por estado e lista de materiais. Consulte grátis, sem cadastro para calcular.",
  alternates: { canonical: `${SITE_URL}/calculadoras` },
};

export default function CalculadorasPage() {
  return (
    <div className="space-y-6 py-8 sm:py-10">
      <h1 className="text-3xl font-extrabold text-neutral-900">Calculadoras de obra</h1>
      <p className="text-neutral-600">
        Estimativas preliminares de materiais e mão de obra com fatores por estado, não cotações locais.
        Consulte grátis na página; para receber uma cópia no WhatsApp, confirme seu número.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {oficio.servicos.map((s) => (
          <Link
            key={s.slug}
            href={`/calculadoras/${s.slug}`}
            className="rounded-xl border border-orange-200 bg-white p-6 transition hover:border-orange-400 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-neutral-900">{s.nome}</h2>
            <p className="mt-1 text-sm text-neutral-500">{s.perguntaCliente}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
