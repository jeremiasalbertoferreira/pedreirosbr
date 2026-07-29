import type { Oficio } from "./types";
import { pedreiro } from "./pedreiro";

/**
 * Registry de ofícios — o motor multi-profissão.
 * Hoje: pedreiro. Amanhã: eletricista, encanador, gesseiro...
 * cada um como um arquivo de dados registrado aqui.
 */
export const OFICIO_REGISTRY: Record<string, Oficio> = {
  pedreiro,
};

/** Ofício ativo desta instância (vertical). Configurável por env para domínios-irmãos. */
export function getOficioAtivo(): Oficio {
  const slug = process.env.OFICIO_SLUG ?? "pedreiro";
  return OFICIO_REGISTRY[slug] ?? pedreiro;
}

export const SITE_URL = `https://${getOficioAtivo().dominio}`;
