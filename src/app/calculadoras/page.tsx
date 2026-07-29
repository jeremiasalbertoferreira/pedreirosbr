import type { Metadata } from "next";
import Link from "next/link";
import { getOficioAtivo } from "../../oficios";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  title: "Calculadoras de obra grátis",
  description: "Todas as calculadoras de obra: reboco, muro, pintura, telhado e reforma de banheiro com preços regionalizados e lista de materiais.",
};

export default function CalculadorasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-neutral-900">Calculadoras de obra</h1>
      <p className="text-neutral-600">
        Estimativas de materiais e mão de obra com preços da sua região. Resultado completo no seu WhatsApp, sem cadastro.
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
