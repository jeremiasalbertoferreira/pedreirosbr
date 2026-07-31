import type { MetadataRoute } from "next";
import { getOficioAtivo, SITE_URL } from "../oficios";
import { CIDADES } from "../lib/data/cidades";

/**
 * Sitemap dinâmico segmentado por camada (anti-doorway, blueprint §6).
 * Hoje: Camada 1 (cidades seed). Bairros entram aqui automaticamente quando
 * o organismo ativar a página deles (paginaAtiva=true no banco).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const oficio = getOficioAtivo();
  const now = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/calculadoras`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/orcamento`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/quanto-cobrar`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/para-pedreiros`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const calculadoras: MetadataRoute.Sitemap = oficio.servicos.map((s) => ({
    url: `${SITE_URL}/calculadoras/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cidades: MetadataRoute.Sitemap = CIDADES.map((c) => ({
    url: `${SITE_URL}/pedreiro-em/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...estaticas, ...calculadoras, ...cidades];
}
