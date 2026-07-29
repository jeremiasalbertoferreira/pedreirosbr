/**
 * Cidades seed — Camada 1 da arquitetura de expansão (páginas legítimas no dia 1).
 * Estrutura pronta para os 5.570 municípios do IBGE: basta expandir esta lista
 * (script de importação IBGE é trabalho futuro).
 * slug = URL: /pedreiro-em/[slug]
 */
export interface CidadeData {
  slug: string;
  nome: string;
  uf: string;
  ibge: string; // código IBGE do município
  populacao: number;
}

export const CIDADES: CidadeData[] = [
  // Capitais
  { slug: "sao-paulo-sp", nome: "São Paulo", uf: "SP", ibge: "3550308", populacao: 12330000 },
  { slug: "rio-de-janeiro-rj", nome: "Rio de Janeiro", uf: "RJ", ibge: "3304557", populacao: 6748000 },
  { slug: "belo-horizonte-mg", nome: "Belo Horizonte", uf: "MG", ibge: "3106200", populacao: 2530000 },
  { slug: "salvador-ba", nome: "Salvador", uf: "BA", ibge: "2927408", populacao: 2900000 },
  { slug: "fortaleza-ce", nome: "Fortaleza", uf: "CE", ibge: "2304400", populacao: 2700000 },
  { slug: "brasilia-df", nome: "Brasília", uf: "DF", ibge: "5300108", populacao: 3094000 },
  { slug: "curitiba-pr", nome: "Curitiba", uf: "PR", ibge: "4106902", populacao: 1963000 },
  { slug: "manaus-am", nome: "Manaus", uf: "AM", ibge: "1302603", populacao: 2256000 },
  { slug: "recife-pe", nome: "Recife", uf: "PE", ibge: "2611606", populacao: 1654000 },
  { slug: "porto-alegre-rs", nome: "Porto Alegre", uf: "RS", ibge: "4314902", populacao: 1493000 },
  { slug: "belem-pa", nome: "Belém", uf: "PA", ibge: "1501402", populacao: 1500000 },
  { slug: "goiania-go", nome: "Goiânia", uf: "GO", ibge: "5208707", populacao: 1556000 },
  { slug: "sao-luis-ma", nome: "São Luís", uf: "MA", ibge: "2111300", populacao: 1115000 },
  { slug: "maceio-al", nome: "Maceió", uf: "AL", ibge: "2704302", populacao: 1026000 },
  { slug: "natal-rn", nome: "Natal", uf: "RN", ibge: "2408102", populacao: 890000 },
  { slug: "teresina-pi", nome: "Teresina", uf: "PI", ibge: "2211001", populacao: 870000 },
  { slug: "campo-grande-ms", nome: "Campo Grande", uf: "MS", ibge: "5002704", populacao: 916000 },
  { slug: "joao-pessoa-pb", nome: "João Pessoa", uf: "PB", ibge: "2507507", populacao: 820000 },
  { slug: "aracaju-se", nome: "Aracaju", uf: "SE", ibge: "2800308", populacao: 665000 },
  { slug: "cuiaba-mt", nome: "Cuiabá", uf: "MT", ibge: "5103403", populacao: 620000 },
  { slug: "florianopolis-sc", nome: "Florianópolis", uf: "SC", ibge: "4205407", populacao: 580000 },
  { slug: "vitoria-es", nome: "Vitória", uf: "ES", ibge: "3205309", populacao: 365000 },
  { slug: "palmas-to", nome: "Palmas", uf: "TO", ibge: "1721000", populacao: 310000 },
  { slug: "macapa-ap", nome: "Macapá", uf: "AP", ibge: "1600303", populacao: 520000 },
  { slug: "porto-velho-ro", nome: "Porto Velho", uf: "RO", ibge: "1100205", populacao: 550000 },
  { slug: "rio-branco-ac", nome: "Rio Branco", uf: "AC", ibge: "1200401", populacao: 415000 },
  { slug: "boa-vista-rr", nome: "Boa Vista", uf: "RR", ibge: "1400100", populacao: 425000 },
  // Interior SP — regiões fortes de obra e renda (inclui Osasco, citada no blueprint)
  { slug: "campinas-sp", nome: "Campinas", uf: "SP", ibge: "3509502", populacao: 1220000 },
  { slug: "osasco-sp", nome: "Osasco", uf: "SP", ibge: "3534401", populacao: 700000 },
  { slug: "guarulhos-sp", nome: "Guarulhos", uf: "SP", ibge: "3518800", populacao: 1400000 },
  { slug: "sao-bernardo-do-campo-sp", nome: "São Bernardo do Campo", uf: "SP", ibge: "3548708", populacao: 845000 },
  { slug: "santo-andre-sp", nome: "Santo André", uf: "SP", ibge: "3547809", populacao: 720000 },
  { slug: "santos-sp", nome: "Santos", uf: "SP", ibge: "3548500", populacao: 435000 },
  { slug: "ribeirao-preto-sp", nome: "Ribeirão Preto", uf: "SP", ibge: "3543402", populacao: 720000 },
  { slug: "sorocaba-sp", nome: "Sorocaba", uf: "SP", ibge: "3552205", populacao: 695000 },
  { slug: "sao-jose-dos-campos-sp", nome: "São José dos Campos", uf: "SP", ibge: "3549904", populacao: 735000 },
  { slug: "jundiai-sp", nome: "Jundiaí", uf: "SP", ibge: "3525904", populacao: 445000 },
  { slug: "barueri-sp", nome: "Barueri", uf: "SP", ibge: "3505708", populacao: 280000 },
  { slug: "moji-das-cruzes-sp", nome: "Mogi das Cruzes", uf: "SP", ibge: "3530607", populacao: 455000 },
  { slug: "diadema-sp", nome: "Diadema", uf: "SP", ibge: "3513801", populacao: 425000 },
  { slug: "carapicuiba-sp", nome: "Carapicuíba", uf: "SP", ibge: "3510609", populacao: 405000 },
  { slug: "itaquaquecetuba-sp", nome: "Itaquaquecetuba", uf: "SP", ibge: "3523107", populacao: 380000 },
  // Outras cidades grandes
  { slug: "duque-de-caxias-rj", nome: "Duque de Caxias", uf: "RJ", ibge: "3301702", populacao: 930000 },
  { slug: "nova-iguacu-rj", nome: "Nova Iguaçu", uf: "RJ", ibge: "3303500", populacao: 825000 },
  { slug: "niteroi-rj", nome: "Niterói", uf: "RJ", ibge: "3303302", populacao: 520000 },
  { slug: "uberlandia-mg", nome: "Uberlândia", uf: "MG", ibge: "3170206", populacao: 710000 },
  { slug: "contagem-mg", nome: "Contagem", uf: "MG", ibge: "3118601", populacao: 670000 },
  { slug: "londrina-pr", nome: "Londrina", uf: "PR", ibge: "4113700", populacao: 580000 },
  { slug: "joinville-sc", nome: "Joinville", uf: "SC", ibge: "4209102", populacao: 600000 },
  { slug: "caxias-do-sul-rs", nome: "Caxias do Sul", uf: "RS", ibge: "4305108", populacao: 520000 },
  { slug: "sorriso-mt", nome: "Sorriso", uf: "MT", ibge: "5107925", populacao: 100000 },
  { slug: "feira-de-santana-ba", nome: "Feira de Santana", uf: "BA", ibge: "2910800", populacao: 625000 },
  { slug: "juazeiro-do-norte-ce", nome: "Juazeiro do Norte", uf: "CE", ibge: "2307304", populacao: 280000 },
  { slug: "anapolis-go", nome: "Anápolis", uf: "GO", ibge: "5201108", populacao: 400000 },
  { slug: "vila-velha-es", nome: "Vila Velha", uf: "ES", ibge: "3205200", populacao: 505000 },
  { slug: "serra-es", nome: "Serra", uf: "ES", ibge: "3205002", populacao: 530000 },
];

export function getCidade(slug: string): CidadeData | undefined {
  return CIDADES.find((c) => c.slug === slug);
}

export function cidadesPorUF(uf: string): CidadeData[] {
  return CIDADES.filter((c) => c.uf === uf);
}
