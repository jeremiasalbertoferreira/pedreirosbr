import type { MetadataRoute } from "next";
import { getOficioAtivo, SITE_URL } from "../oficios";
import { CIDADES } from "../lib/data/cidades";

/** URLs públicas canônicas. Sem lastModified artificial a cada build. */
export default function sitemap(): MetadataRoute.Sitemap {
  const oficio = getOficioAtivo();

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/calculadoras`, priority: 0.9 },
    { url: `${SITE_URL}/orcamento`, priority: 0.9 },
    { url: `${SITE_URL}/quanto-cobrar`, priority: 0.8 },
    { url: `${SITE_URL}/para-pedreiros`, priority: 0.8 },
    { url: `${SITE_URL}/metodologia`, lastModified: "2026-09-09", priority: 0.7 },
    { url: `${SITE_URL}/contato`, priority: 0.5 },
    { url: `${SITE_URL}/termos`, priority: 0.3 },
    { url: `${SITE_URL}/politica-de-privacidade`, priority: 0.3 },
    { url: `${SITE_URL}/exclusao-de-dados`, priority: 0.3 },
  ];

  const calculadoras: MetadataRoute.Sitemap = oficio.servicos.map((s) => ({
    url: `${SITE_URL}/calculadoras/${s.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cidades: MetadataRoute.Sitemap = CIDADES.map((c) => ({
    url: `${SITE_URL}/pedreiro-em/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...estaticas, ...calculadoras, ...cidades];
}
