import type { Oficio } from "./types";

/**
 * Vertical 1: Pedreiro.
 * Todo o conteúdo específico da profissão vive aqui — o motor é genérico.
 */
export const pedreiro: Oficio = {
  slug: "pedreiro",
  nome: "Pedreiro",
  nomePlural: "Pedreiros",
  dominio: "pedreirosbr.com.br",
  cor: {
    primaria: "#C2410C",      // orange-700 — cor de obra, longe do azul-fintech genérico
    primariaEscura: "#9A3412",
    fundo: "#FFFBEB",
  },
  fraseParaProfissional:
    "Você não precisa entender de internet. Cliente aparece no seu WhatsApp. Fim.",
  servicos: [
    {
      slug: "reboco",
      nome: "Reboco de parede",
      perguntaCliente: "Quanto custa rebocar uma parede?",
      perguntaProfissional: "Quanto cobrar por m² de reboco?",
      engine: "reboco",
      dica: "Meça a área total da parede (largura × altura). Para duas faces, some as duas áreas.",
      campos: [
        { id: "area", label: "Área a rebocar", tipo: "numero", unidade: "m²", min: 1, max: 5000, passo: 0.5, padrao: 40 },
        {
          id: "acabamento", label: "Tipo de acabamento", tipo: "selecao", padrao: "liso",
          opcoes: [
            { valor: "liso", label: "Liso (pronto para pintura)", fator: 1 },
            { valor: "rustico", label: "Rústico / chapiscado", fator: 0.85 },
          ],
        },
      ],
    },
    {
      slug: "muro",
      nome: "Construção de muro",
      perguntaCliente: "Quanto custa construir um muro?",
      perguntaProfissional: "Quanto cobrar por m² de muro?",
      engine: "muro",
      dica: "Informe o comprimento total e a altura desejada do muro.",
      campos: [
        { id: "comprimento", label: "Comprimento do muro", tipo: "numero", unidade: "m", min: 1, max: 500, passo: 0.5, padrao: 15 },
        { id: "altura", label: "Altura do muro", tipo: "numero", unidade: "m", min: 0.5, max: 4, passo: 0.1, padrao: 2 },
        {
          id: "material", label: "Material", tipo: "selecao", padrao: "bloco",
          opcoes: [
            { valor: "bloco", label: "Bloco de concreto", fator: 1 },
            { valor: "tijolo", label: "Tijolo cerâmico", fator: 1.15 },
          ],
        },
      ],
    },
    {
      slug: "pintura",
      nome: "Pintura de parede",
      perguntaCliente: "Quanto custa pintar uma parede ou casa?",
      perguntaProfissional: "Quanto cobrar por m² de pintura?",
      engine: "pintura",
      dica: "Some as áreas das paredes (desconte portas e janelas se quiser precisão).",
      campos: [
        { id: "area", label: "Área a pintar", tipo: "numero", unidade: "m²", min: 1, max: 5000, passo: 0.5, padrao: 60 },
        { id: "demaos", label: "Número de demãos", tipo: "numero", unidade: "", min: 1, max: 3, passo: 1, padrao: 2 },
        {
          id: "tipo", label: "Tipo de pintura", tipo: "selecao", padrao: "standard",
          opcoes: [
            { valor: "economica", label: "Econômica", fator: 0.8 },
            { valor: "standard", label: "Standard", fator: 1 },
            { valor: "premium", label: "Premium / acrílica", fator: 1.35 },
          ],
        },
      ],
    },
    {
      slug: "telhado",
      nome: "Telhado",
      perguntaCliente: "Quanto custa fazer ou refazer um telhado?",
      perguntaProfissional: "Quanto cobrar por m² de telhado?",
      engine: "telhado",
      dica: "Área em planta da casa — o motor já aplica a inclinação média do telhado.",
      campos: [
        { id: "area", label: "Área da casa (planta)", tipo: "numero", unidade: "m²", min: 5, max: 2000, passo: 1, padrao: 100 },
        {
          id: "telha", label: "Tipo de telha", tipo: "selecao", padrao: "ceramica",
          opcoes: [
            { valor: "fibrocimento", label: "Fibrocimento (brasilit)", fator: 0.8 },
            { valor: "ceramica", label: "Cerâmica (portuguesa/romana)", fator: 1 },
            { valor: "metalica", label: "Metálica / sanduíche", fator: 1.25 },
          ],
        },
      ],
    },
    {
      slug: "banheiro",
      nome: "Reforma de banheiro",
      perguntaCliente: "Quanto custa reformar um banheiro?",
      perguntaProfissional: "Quanto cobrar por reforma de banheiro?",
      engine: "banheiro",
      dica: "Área do banheiro em m². O padrão define o nível de acabamento.",
      campos: [
        { id: "area", label: "Área do banheiro", tipo: "numero", unidade: "m²", min: 1, max: 30, passo: 0.5, padrao: 4 },
        {
          id: "padrao", label: "Padrão de acabamento", tipo: "selecao", padrao: "medio",
          opcoes: [
            { valor: "simples", label: "Simples", fator: 0.8 },
            { valor: "medio", label: "Médio", fator: 1 },
            { valor: "alto", label: "Alto padrão", fator: 1.6 },
          ],
        },
      ],
    },
  ],
  termosProfissional: [
    { slug: "quanto-cobrar-reboco", titulo: "Quanto cobrar por m² de reboco em 2026" },
    { slug: "quanto-cobrar-muro", titulo: "Quanto cobrar por m² de muro em 2026" },
    { slug: "quanto-cobrar-diaria", titulo: "Quanto cobrar de diária de pedreiro em 2026" },
    { slug: "modelo-orcamento", titulo: "Modelo de orçamento de pedreiro (grátis, em PDF)" },
    { slug: "calcular-material-muro", titulo: "Como calcular material para muro" },
  ],
  afiliados: [
    { nome: "Amazon", categoria: "ferramentas", urlTemplate: "https://www.amazon.com.br/s?k={QUERY}&tag={TAG_AMAZON}" },
    { nome: "Leroy Merlin", categoria: "material-construcao", urlTemplate: "https://www.leroymerlin.com.br/search?term={QUERY}" },
  ],
  limiares: {
    paginaBairro: 10,          // 10 eventos no território → página de bairro nasce
    assinaturaPorTerritorio: 20, // 20 eventos/mês → organismo oferece assinatura a profissionais da região
  },
};
