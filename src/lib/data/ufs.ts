/**
 * Dados regionais por UF.
 * cub: CUB/m² (Custo Unitário Básico, Sinduscon) — referência pública de custo.
 *   IMPORTANTE: CUB mede obra nova de incorporação, não reforma residencial.
 *   Usamos como PONTE até o flywheel de dados próprios amadurecer (ver blueprint).
 * multiplicadorMaoDeObra: fator regional sobre o preço-base nacional de mão de obra.
 * Valores seed — revisar mensalmente contra publicação dos Sinduscons.
 */
export interface UFData {
  uf: string;
  nome: string;
  cub: number; // R$/m² (aprox., padrão normal)
  multiplicadorMaoDeObra: number;
}

export const UFS: UFData[] = [
  { uf: "AC", nome: "Acre", cub: 1950, multiplicadorMaoDeObra: 0.9 },
  { uf: "AL", nome: "Alagoas", cub: 1720, multiplicadorMaoDeObra: 0.78 },
  { uf: "AP", nome: "Amapá", cub: 1900, multiplicadorMaoDeObra: 0.88 },
  { uf: "AM", nome: "Amazonas", cub: 1980, multiplicadorMaoDeObra: 0.92 },
  { uf: "BA", nome: "Bahia", cub: 1760, multiplicadorMaoDeObra: 0.8 },
  { uf: "CE", nome: "Ceará", cub: 1740, multiplicadorMaoDeObra: 0.78 },
  { uf: "DF", nome: "Distrito Federal", cub: 1950, multiplicadorMaoDeObra: 1.05 },
  { uf: "ES", nome: "Espírito Santo", cub: 1830, multiplicadorMaoDeObra: 0.95 },
  { uf: "GO", nome: "Goiás", cub: 1800, multiplicadorMaoDeObra: 0.9 },
  { uf: "MA", nome: "Maranhão", cub: 1700, multiplicadorMaoDeObra: 0.75 },
  { uf: "MT", nome: "Mato Grosso", cub: 1850, multiplicadorMaoDeObra: 0.95 },
  { uf: "MS", nome: "Mato Grosso do Sul", cub: 1840, multiplicadorMaoDeObra: 0.92 },
  { uf: "MG", nome: "Minas Gerais", cub: 1820, multiplicadorMaoDeObra: 0.88 },
  { uf: "PA", nome: "Pará", cub: 1880, multiplicadorMaoDeObra: 0.85 },
  { uf: "PB", nome: "Paraíba", cub: 1730, multiplicadorMaoDeObra: 0.76 },
  { uf: "PR", nome: "Paraná", cub: 1860, multiplicadorMaoDeObra: 0.95 },
  { uf: "PE", nome: "Pernambuco", cub: 1780, multiplicadorMaoDeObra: 0.82 },
  { uf: "PI", nome: "Piauí", cub: 1710, multiplicadorMaoDeObra: 0.75 },
  { uf: "RJ", nome: "Rio de Janeiro", cub: 1920, multiplicadorMaoDeObra: 1.08 },
  { uf: "RN", nome: "Rio Grande do Norte", cub: 1750, multiplicadorMaoDeObra: 0.78 },
  { uf: "RS", nome: "Rio Grande do Sul", cub: 1870, multiplicadorMaoDeObra: 0.95 },
  { uf: "RO", nome: "Rondônia", cub: 1890, multiplicadorMaoDeObra: 0.88 },
  { uf: "RR", nome: "Roraima", cub: 1940, multiplicadorMaoDeObra: 0.9 },
  { uf: "SC", nome: "Santa Catarina", cub: 1880, multiplicadorMaoDeObra: 0.98 },
  { uf: "SP", nome: "São Paulo", cub: 1960, multiplicadorMaoDeObra: 1.15 },
  { uf: "SE", nome: "Sergipe", cub: 1720, multiplicadorMaoDeObra: 0.76 },
  { uf: "TO", nome: "Tocantins", cub: 1810, multiplicadorMaoDeObra: 0.85 },
];

export const UF_PADRAO: UFData = { uf: "BR", nome: "Brasil (média nacional)", cub: 1840, multiplicadorMaoDeObra: 1 };

export function getUF(uf?: string | null): UFData {
  if (!uf) return UF_PADRAO;
  return UFS.find((u) => u.uf === uf.toUpperCase()) ?? UF_PADRAO;
}
