/**
 * Calculadoras de quantidade — só geometria e conversão de unidades.
 *
 * Regras deste módulo:
 * - nenhum preço, nenhum fator por estado e nenhuma chamada de rede;
 * - todo número que depende de produto ou de fabricante é um campo editável,
 *   com um valor usual como ponto de partida, nunca uma constante escondida;
 * - cada calculadora declara suas premissas e a fórmula usada, em texto.
 *
 * Uma calculadora é DADO + uma função pura. Para criar outra, acrescente um
 * item em QUANTIDADES; página, sitemap e listagens saem daqui.
 */

export type ValoresQ = Record<string, number | string>;

export interface CampoQ {
  id: string;
  label: string;
  tipo: "numero" | "selecao";
  unidade?: string;
  min?: number;
  max?: number;
  passo?: number;
  padrao: number | string;
  opcoes?: { valor: string; label: string }[];
  /** texto curto abaixo do campo */
  ajuda?: string;
  /** o campo só aparece (e só é validado) quando outro campo tem um destes valores */
  mostrarSe?: { campo: string; valores: string[] };
}

export interface ResultadoQ {
  /** número que responde à pergunta da página */
  principal: { rotulo: string; valor: string };
  linhas: { rotulo: string; valor: string }[];
  /** itens prontos para pedir cotação */
  lista: string[];
}

export interface CalcQuantidade {
  slug: string;
  /** nome curto para listagens: "Tijolos e blocos" */
  nome: string;
  /** H1 da página, em forma de pergunta */
  pergunta: string;
  /** <title> e descrição para busca */
  titulo: string;
  descricao: string;
  /** parágrafo de abertura */
  intro: string;
  campos: CampoQ[];
  calcular: (v: ValoresQ) => ResultadoQ;
  /** como a conta é feita, passo a passo */
  comoCalculamos: string[];
  /** o que a conta NÃO considera */
  limites: string[];
}

const num = (v: ValoresQ, id: string) => Number(v[id]) || 0;
const txt = (v: ValoresQ, id: string) => String(v[id] ?? "");
/** Número em pt-BR com no máximo `casas` decimais. */
export const fmt = (x: number, casas = 2) =>
  x.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 });
/** Arredonda para cima sem ser enganado por resíduo de ponto flutuante (ex.: 12,000000001). */
const teto = (x: number) => Math.ceil(x - 1e-9);
const comPerda = (x: number, perdaPct: number) => x * (1 + perdaPct / 100);
const plural = (n: number, um: string, varios: string) => `${fmt(n, 0)} ${n === 1 ? um : varios}`;

const perda = (padrao: number, ajuda?: string): CampoQ => ({
  id: "perda", label: "Margem para perdas e recortes", tipo: "numero", unidade: "%", min: 0, max: 50, passo: 1, padrao, ajuda,
});

/** Peças de alvenaria: [espessura da parede, altura da face, comprimento da face], em cm. */
const PECAS: Record<string, { label: string; e: number; h: number; c: number }> = {
  "ceramico-9x19x19": { label: "Bloco cerâmico (tijolo baiano) 9 × 19 × 19 cm", e: 9, h: 19, c: 19 },
  "ceramico-9x19x29": { label: "Bloco cerâmico 9 × 19 × 29 cm", e: 9, h: 19, c: 29 },
  "ceramico-11x19x29": { label: "Bloco cerâmico 11,5 × 19 × 29 cm", e: 11.5, h: 19, c: 29 },
  "ceramico-14x19x29": { label: "Bloco cerâmico 14 × 19 × 29 cm", e: 14, h: 19, c: 29 },
  "concreto-9x19x39": { label: "Bloco de concreto 9 × 19 × 39 cm", e: 9, h: 19, c: 39 },
  "concreto-14x19x39": { label: "Bloco de concreto 14 × 19 × 39 cm", e: 14, h: 19, c: 39 },
  "concreto-19x19x39": { label: "Bloco de concreto 19 × 19 × 39 cm", e: 19, h: 19, c: 39 },
  "macico-meia-vez": { label: "Tijolo maciço 5 × 10 × 20 cm, parede de meia vez (10 cm)", e: 10, h: 5, c: 20 },
  "macico-uma-vez": { label: "Tijolo maciço 5 × 10 × 20 cm, parede de uma vez (20 cm)", e: 20, h: 5, c: 10 },
};

const CHAPAS: Record<string, { label: string; area: number }> = {
  "120x180": { label: "1,20 × 1,80 m", area: 1.2 * 1.8 },
  "120x240": { label: "1,20 × 2,40 m", area: 1.2 * 2.4 },
  "120x300": { label: "1,20 × 3,00 m", area: 1.2 * 3.0 },
};

/** Massa aproximada do material solto, em t/m³. Varia com umidade e granulometria. */
const GRANEIS: Record<string, { label: string; densidade: number }> = {
  areia: { label: "Areia", densidade: 1.5 },
  brita: { label: "Brita", densidade: 1.45 },
  terra: { label: "Terra solta", densidade: 1.2 },
};

export const QUANTIDADES: CalcQuantidade[] = [
  {
    slug: "tijolos-e-blocos",
    nome: "Tijolos e blocos",
    pergunta: "Quantos tijolos ou blocos preciso para a parede?",
    titulo: "Calculadora de tijolos e blocos por m²",
    descricao: "Calcule quantos tijolos baianos, blocos de concreto ou tijolos maciços a parede pede, por m² e no total, com a argamassa de assentamento.",
    intro: "Informe as medidas da parede e escolha a peça. A conta usa o tamanho real da peça mais a junta de argamassa, por isso serve para tijolo baiano, bloco de concreto e tijolo maciço.",
    campos: [
      { id: "comprimento", label: "Comprimento da parede", tipo: "numero", unidade: "m", min: 0.1, max: 1000, passo: 0.1, padrao: 4 },
      { id: "altura", label: "Altura da parede", tipo: "numero", unidade: "m", min: 0.1, max: 20, passo: 0.05, padrao: 2.7 },
      { id: "vaos", label: "Portas e janelas a descontar", tipo: "numero", unidade: "m²", min: 0, max: 5000, passo: 0.1, padrao: 0 },
      { id: "peca", label: "Tipo de peça", tipo: "selecao", padrao: "ceramico-9x19x19", opcoes: Object.entries(PECAS).map(([valor, p]) => ({ valor, label: p.label })), ajuda: "Medidas comerciais comuns. Confira a do seu fornecedor." },
      { id: "junta", label: "Espessura da junta", tipo: "numero", unidade: "cm", min: 0.3, max: 3, passo: 0.1, padrao: 1 },
      perda(5),
    ],
    calcular(v) {
      const p = PECAS[txt(v, "peca")] ?? PECAS["ceramico-9x19x19"];
      const j = num(v, "junta");
      const area = Math.max(0, num(v, "comprimento") * num(v, "altura") - num(v, "vaos"));
      const porM2 = 10000 / ((p.c + j) * (p.h + j));
      const total = teto(comPerda(area * porM2, num(v, "perda")));
      const argamassa = area * (p.e / 100) * (1 - (p.c * p.h) / ((p.c + j) * (p.h + j)));
      return {
        principal: { rotulo: "Peças a comprar", valor: plural(total, "peça", "peças") },
        linhas: [
          { rotulo: "Área de parede", valor: `${fmt(area)} m²` },
          { rotulo: "Peças por m²", valor: fmt(porM2, 1) },
          { rotulo: "Argamassa de assentamento (volume das juntas)", valor: `${fmt(argamassa * 1000, 0)} litros` },
        ],
        lista: [`${p.label}: ${fmt(total, 0)} peças`, `Argamassa de assentamento: cerca de ${fmt(argamassa * 1000, 0)} litros`],
      };
    },
    comoCalculamos: [
      "Área da parede = comprimento × altura − portas e janelas.",
      "Peças por m² = 1 ÷ [(comprimento da peça + junta) × (altura da peça + junta)]. Um bloco de 19 × 19 cm com junta de 1 cm ocupa 20 × 20 cm, então cabem 25 por m².",
      "Total = área × peças por m², mais a margem de perdas, arredondado para cima.",
      "Argamassa = volume da parede menos o volume ocupado pelas peças.",
    ],
    limites: [
      "Não inclui vergas, contravergas, cintas, pilares nem amarrações.",
      "O volume de argamassa é o das juntas cheias; o consumo na obra costuma ser maior por causa das sobras.",
    ],
  },
  {
    slug: "concreto",
    nome: "Concreto",
    pergunta: "Quantos metros cúbicos de concreto eu preciso?",
    titulo: "Calculadora de concreto em m³ para laje, piso, viga e pilar",
    descricao: "Calcule o volume de concreto em m³ para laje, piso, calçada, viga, baldrame, pilar ou broca, com estimativa de sacos de cimento.",
    intro: "Escolha o formato da peça e informe as medidas. O resultado sai em metros cúbicos, que é como o concreto usinado é vendido, e em sacos de cimento para quem vai virar na obra.",
    campos: [
      { id: "forma", label: "Formato da peça", tipo: "selecao", padrao: "retangular", opcoes: [
        { valor: "retangular", label: "Retangular: laje, piso, calçada, viga, baldrame, pilar" },
        { valor: "circular", label: "Circular: broca, tubulão ou pilar redondo" },
      ] },
      { id: "comprimento", label: "Comprimento (ou altura do pilar)", tipo: "numero", unidade: "m", min: 0.05, max: 1000, passo: 0.05, padrao: 5 },
      { id: "largura", label: "Largura", tipo: "numero", unidade: "m", min: 0.05, max: 1000, passo: 0.05, padrao: 4, mostrarSe: { campo: "forma", valores: ["retangular"] } },
      { id: "espessura", label: "Espessura ou altura da seção", tipo: "numero", unidade: "cm", min: 1, max: 500, passo: 0.5, padrao: 10, mostrarSe: { campo: "forma", valores: ["retangular"] } },
      { id: "diametro", label: "Diâmetro", tipo: "numero", unidade: "cm", min: 5, max: 500, passo: 1, padrao: 25, mostrarSe: { campo: "forma", valores: ["circular"] } },
      { id: "quantidade", label: "Quantidade de peças iguais", tipo: "numero", unidade: "un", min: 1, max: 10000, passo: 1, padrao: 1 },
      perda(5),
      { id: "consumo", label: "Consumo de cimento", tipo: "numero", unidade: "kg/m³", min: 100, max: 700, passo: 10, padrao: 350, ajuda: "Valor usual de partida. Muda com o traço e a resistência; siga o projeto ou o responsável técnico." },
    ],
    calcular(v) {
      const c = num(v, "comprimento");
      const unitario = txt(v, "forma") === "circular"
        ? Math.PI * (num(v, "diametro") / 200) ** 2 * c
        : c * num(v, "largura") * (num(v, "espessura") / 100);
      const volume = comPerda(unitario * Math.max(1, num(v, "quantidade")), num(v, "perda"));
      const sacos = teto((volume * num(v, "consumo")) / 50);
      return {
        principal: { rotulo: "Volume de concreto", valor: `${fmt(volume)} m³` },
        linhas: [
          { rotulo: "Volume de cada peça, sem perdas", valor: `${fmt(unitario, 3)} m³` },
          { rotulo: "Em litros", valor: `${fmt(volume * 1000, 0)} litros` },
          { rotulo: "Cimento estimado", valor: plural(sacos, "saco de 50 kg", "sacos de 50 kg") },
        ],
        lista: [`Concreto: ${fmt(volume)} m³`, `Cimento, se for virar na obra: ${fmt(sacos, 0)} sacos de 50 kg`],
      };
    },
    comoCalculamos: [
      "Peça retangular: volume = comprimento × largura × espessura. A espessura entra em centímetros e é convertida para metros.",
      "Peça circular: volume = π × (diâmetro ÷ 2)² × comprimento.",
      "O volume é multiplicado pela quantidade de peças e pela margem de perdas.",
      "Sacos de cimento = volume × consumo de cimento ÷ 50 kg, arredondado para cima.",
    ],
    limites: [
      "Não define traço, resistência nem armadura. Isso é assunto de projeto estrutural.",
      "Areia e brita não entram: a proporção depende do traço escolhido.",
    ],
  },
  {
    slug: "pisos-e-azulejos",
    nome: "Pisos e azulejos",
    pergunta: "Quantos metros de piso ou azulejo devo comprar?",
    titulo: "Calculadora de piso, azulejo, rodapé e rejunte",
    descricao: "Calcule metros quadrados, caixas e peças de piso ou azulejo com margem de recorte, mais o rodapé em metros e o rejunte em quilos.",
    intro: "Informe a área e a peça escolhida. A calculadora soma a margem de recortes, converte em caixas e estima o rejunte pelo tamanho da peça e da junta.",
    campos: [
      { id: "area", label: "Área a revestir", tipo: "numero", unidade: "m²", min: 0.1, max: 100000, passo: 0.1, padrao: 20, ajuda: "Para parede, desconte portas e janelas." },
      perda(10, "Costuma-se usar 10% para assentamento reto e 15% para diagonal."),
      { id: "pecaC", label: "Comprimento da peça", tipo: "numero", unidade: "cm", min: 1, max: 400, passo: 0.5, padrao: 60 },
      { id: "pecaL", label: "Largura da peça", tipo: "numero", unidade: "cm", min: 1, max: 400, passo: 0.5, padrao: 60 },
      { id: "m2Caixa", label: "Metros quadrados por caixa", tipo: "numero", unidade: "m²", min: 0.1, max: 20, passo: 0.01, padrao: 2.5, ajuda: "Está impresso na caixa." },
      { id: "junta", label: "Largura da junta", tipo: "numero", unidade: "mm", min: 0.5, max: 20, passo: 0.5, padrao: 3 },
      { id: "espessura", label: "Espessura da peça", tipo: "numero", unidade: "mm", min: 3, max: 40, passo: 0.5, padrao: 8 },
      { id: "densidade", label: "Densidade do rejunte", tipo: "numero", unidade: "kg/dm³", min: 1, max: 2.5, passo: 0.01, padrao: 1.58, ajuda: "Valor usual. Confira a embalagem do rejunte." },
      { id: "rodape", label: "Rodapé: perímetro do cômodo menos as portas", tipo: "numero", unidade: "m", min: 0, max: 5000, passo: 0.1, padrao: 0 },
    ],
    calcular(v) {
      const area = num(v, "area");
      const c = num(v, "pecaC"), l = num(v, "pecaL");
      const comprar = comPerda(area, num(v, "perda"));
      const caixas = teto(comprar / num(v, "m2Caixa"));
      const pecas = teto(comprar / ((c * l) / 10000));
      // Volume das juntas por m² (mm) × densidade: (C + L) × espessura × junta × densidade ÷ (C × L)
      const rejunteM2 = ((c * 10 + l * 10) * num(v, "espessura") * num(v, "junta") * num(v, "densidade")) / (c * 10 * l * 10);
      const rejunte = area * rejunteM2;
      const rodape = num(v, "rodape");
      const pecasRodape = rodape > 0 ? teto(comPerda(rodape, num(v, "perda")) / (c / 100)) : 0;
      const linhas = [
        { rotulo: "Caixas", valor: plural(caixas, "caixa", "caixas") },
        { rotulo: "Peças", valor: plural(pecas, "peça", "peças") },
        { rotulo: "Rejunte estimado", valor: `${fmt(rejunte, 1)} kg (${fmt(rejunteM2, 2)} kg por m²)` },
      ];
      const lista = [`Revestimento ${fmt(c, 1)} × ${fmt(l, 1)} cm: ${fmt(comprar)} m² (${fmt(caixas, 0)} caixas)`, `Rejunte: ${fmt(rejunte, 1)} kg`];
      if (rodape > 0) {
        linhas.push({ rotulo: "Rodapé", valor: `${fmt(rodape, 1)} m (${plural(pecasRodape, "peça", "peças")} de ${fmt(c, 1)} cm, com a margem)` });
        lista.push(`Rodapé: ${fmt(pecasRodape, 0)} peças de ${fmt(c, 1)} cm`);
      }
      return { principal: { rotulo: "Área a comprar", valor: `${fmt(comprar)} m²` }, linhas, lista };
    },
    comoCalculamos: [
      "Área a comprar = área a revestir × (1 + margem de recortes).",
      "Caixas = área a comprar ÷ m² por caixa, arredondado para cima.",
      "Rejunte por m² = (comprimento + largura) × espessura × junta × densidade ÷ (comprimento × largura), com as medidas em milímetros. É o volume das juntas multiplicado pela densidade do rejunte.",
      "Rodapé = perímetro informado mais a margem, dividido pelo comprimento da peça.",
    ],
    limites: [
      "Não calcula argamassa colante: o consumo depende do produto e da desempenadeira indicada pelo fabricante.",
      "Compre tudo do mesmo lote e tonalidade; a calculadora não considera reposição futura.",
    ],
  },
  {
    slug: "telhas",
    nome: "Telhas",
    pergunta: "Quantas telhas preciso para o telhado?",
    titulo: "Calculadora de telhas por m² com inclinação e beiral",
    descricao: "Calcule a área real do telhado a partir da planta, do beiral e da inclinação, e descubra quantas telhas e cumeeiras comprar.",
    intro: "A área do telhado é maior que a da casa por causa do beiral e da inclinação. Informe a planta e a calculadora chega à área inclinada e à quantidade de telhas.",
    campos: [
      { id: "comprimento", label: "Comprimento da casa", tipo: "numero", unidade: "m", min: 1, max: 500, passo: 0.1, padrao: 10 },
      { id: "largura", label: "Largura da casa", tipo: "numero", unidade: "m", min: 1, max: 500, passo: 0.1, padrao: 8 },
      { id: "beiral", label: "Beiral em cada lado", tipo: "numero", unidade: "cm", min: 0, max: 300, passo: 5, padrao: 50 },
      { id: "inclinacao", label: "Inclinação do telhado", tipo: "numero", unidade: "%", min: 1, max: 200, passo: 1, padrao: 30, ajuda: "30% significa subir 30 cm a cada 1 m na horizontal." },
      { id: "porM2", label: "Telhas por m²", tipo: "numero", unidade: "un/m²", min: 0.2, max: 60, passo: 0.1, padrao: 16, ajuda: "Valores usuais de catálogo: romana e portuguesa cerca de 16, americana cerca de 12, concreto cerca de 10,5, colonial capa e canal cerca de 26. Confira o do fabricante." },
      perda(5),
      { id: "cumeeira", label: "Comprimento de cumeeiras e espigões", tipo: "numero", unidade: "m", min: 0, max: 1000, passo: 0.1, padrao: 10 },
      { id: "cumeeiraPorM", label: "Peças de cumeeira por metro", tipo: "numero", unidade: "un/m", min: 1, max: 10, passo: 0.5, padrao: 3 },
    ],
    calcular(v) {
      const b = num(v, "beiral") / 100;
      const planta = (num(v, "comprimento") + 2 * b) * (num(v, "largura") + 2 * b);
      const fator = Math.sqrt(1 + (num(v, "inclinacao") / 100) ** 2);
      const area = planta * fator;
      const telhas = teto(comPerda(area * num(v, "porM2"), num(v, "perda")));
      const cumeeiras = teto(num(v, "cumeeira") * num(v, "cumeeiraPorM"));
      return {
        principal: { rotulo: "Telhas a comprar", valor: plural(telhas, "telha", "telhas") },
        linhas: [
          { rotulo: "Área em planta, com beiral", valor: `${fmt(planta)} m²` },
          { rotulo: "Área inclinada do telhado", valor: `${fmt(area)} m² (fator ${fmt(fator, 3)})` },
          { rotulo: "Cumeeiras", valor: plural(cumeeiras, "peça", "peças") },
        ],
        lista: [`Telhas: ${fmt(telhas, 0)} unidades (${fmt(area)} m² de telhado)`, `Cumeeiras: ${fmt(cumeeiras, 0)} peças`],
      };
    },
    comoCalculamos: [
      "Área em planta = (comprimento + 2 × beiral) × (largura + 2 × beiral).",
      "Fator de inclinação = raiz de [1 + (inclinação ÷ 100)²]. Com 30%, o fator é 1,044.",
      "Área do telhado = área em planta × fator. Vale para qualquer número de águas, desde que todas tenham a mesma inclinação.",
      "Telhas = área do telhado × telhas por m², mais a margem de perdas.",
    ],
    limites: [
      "Não calcula madeiramento, calhas, rufos nem telhas de ventilação.",
      "Telhado com águas de inclinações diferentes precisa ser calculado parte por parte.",
    ],
  },
  {
    slug: "inclinacao-de-telhado",
    nome: "Inclinação de telhado",
    pergunta: "Como calcular a inclinação do telhado?",
    titulo: "Calculadora de inclinação de telhado em % e graus",
    descricao: "Converta a inclinação do telhado entre porcentagem e graus e descubra a altura da cumeeira e o comprimento do caibro.",
    intro: "Informe o vão coberto por uma água e a inclinação desejada, ou a altura da cumeeira, e veja a inclinação em porcentagem e em graus, a altura e o comprimento da peça inclinada.",
    campos: [
      { id: "vao", label: "Distância horizontal da cumeeira ao beiral", tipo: "numero", unidade: "m", min: 0.1, max: 100, passo: 0.05, padrao: 4, ajuda: "Em telhado de duas águas iguais, é metade da largura coberta." },
      { id: "modo", label: "O que você já sabe", tipo: "selecao", padrao: "inclinacao", opcoes: [
        { valor: "inclinacao", label: "A inclinação, em %" },
        { valor: "altura", label: "A altura da cumeeira" },
      ] },
      { id: "inclinacao", label: "Inclinação", tipo: "numero", unidade: "%", min: 1, max: 300, passo: 1, padrao: 30, mostrarSe: { campo: "modo", valores: ["inclinacao"] } },
      { id: "altura", label: "Altura da cumeeira acima do apoio", tipo: "numero", unidade: "m", min: 0.01, max: 100, passo: 0.01, padrao: 1.2, mostrarSe: { campo: "modo", valores: ["altura"] } },
    ],
    calcular(v) {
      const vao = num(v, "vao");
      const altura = txt(v, "modo") === "altura" ? num(v, "altura") : (vao * num(v, "inclinacao")) / 100;
      const pct = vao > 0 ? (altura / vao) * 100 : 0;
      const graus = (Math.atan(pct / 100) * 180) / Math.PI;
      const caibro = Math.hypot(vao, altura);
      return {
        principal: { rotulo: "Inclinação", valor: `${fmt(pct, 1)}% (${fmt(graus, 1)}°)` },
        linhas: [
          { rotulo: "Altura da cumeeira", valor: `${fmt(altura)} m` },
          { rotulo: "Comprimento da peça inclinada, sem beiral", valor: `${fmt(caibro)} m` },
          { rotulo: "Fator para converter planta em área de telhado", valor: fmt(vao > 0 ? caibro / vao : 1, 3) },
        ],
        lista: [`Telhado com inclinação de ${fmt(pct, 1)}% (${fmt(graus, 1)}°), cumeeira a ${fmt(altura)} m`],
      };
    },
    comoCalculamos: [
      "Inclinação em % = altura ÷ distância horizontal × 100.",
      "Ângulo em graus = arco tangente da inclinação. 30% equivale a 16,7° e 100% equivale a 45°.",
      "Comprimento da peça inclinada = raiz de (distância horizontal² + altura²).",
    ],
    limites: [
      "A inclinação mínima depende do modelo de telha. Siga a recomendação do fabricante.",
      "O comprimento não inclui o trecho do beiral.",
    ],
  },
  {
    slug: "escada",
    nome: "Escada",
    pergunta: "Como calcular os degraus de uma escada?",
    titulo: "Calculadora de escada: degraus, espelho e piso",
    descricao: "Calcule quantos degraus a escada precisa, a altura do espelho, a profundidade do piso e o comprimento que ela ocupa, pela regra prática de Blondel.",
    intro: "Informe a altura entre os dois pisos. A calculadora divide essa altura em degraus iguais e usa a regra prática de conforto de Blondel para chegar à profundidade do piso.",
    campos: [
      { id: "altura", label: "Altura total a vencer, de piso a piso", tipo: "numero", unidade: "cm", min: 20, max: 2000, passo: 0.5, padrao: 280 },
      { id: "espelho", label: "Altura desejada do espelho", tipo: "numero", unidade: "cm", min: 10, max: 25, passo: 0.5, padrao: 17.5 },
      { id: "blondel", label: "Regra de Blondel: 2 espelhos + 1 piso", tipo: "numero", unidade: "cm", min: 58, max: 68, passo: 0.5, padrao: 64, ajuda: "Costuma-se trabalhar entre 63 e 65 cm." },
    ],
    calcular(v) {
      const h = num(v, "altura");
      const n = Math.max(1, Math.round(h / num(v, "espelho")));
      const espelho = h / n;
      const piso = num(v, "blondel") - 2 * espelho;
      const pisos = Math.max(0, n - 1);
      const comprimento = pisos * piso;
      const graus = piso > 0 ? (Math.atan(espelho / piso) * 180) / Math.PI : 90;
      return {
        principal: { rotulo: "Degraus", valor: `${plural(n, "espelho", "espelhos")} de ${fmt(espelho, 1)} cm` },
        linhas: [
          { rotulo: "Profundidade de cada piso", valor: `${fmt(piso, 1)} cm` },
          { rotulo: "Pisos a construir", valor: fmt(pisos, 0) },
          { rotulo: "Comprimento ocupado em planta", valor: `${fmt(comprimento / 100)} m` },
          { rotulo: "Inclinação da escada", valor: `${fmt(graus, 1)}°` },
        ],
        lista: [`Escada com ${fmt(n, 0)} espelhos de ${fmt(espelho, 1)} cm e pisos de ${fmt(piso, 1)} cm`],
      };
    },
    comoCalculamos: [
      "Número de espelhos = altura total ÷ espelho desejado, arredondado para o inteiro mais próximo.",
      "Espelho real = altura total ÷ número de espelhos, para todos os degraus ficarem iguais.",
      "Piso = regra de Blondel − 2 × espelho. Com espelho de 17,5 cm e regra de 64 cm, o piso fica com 29 cm.",
      "Comprimento em planta = (número de espelhos − 1) × piso, porque o último espelho chega ao piso de cima.",
    ],
    limites: [
      "É um pré-dimensionamento de escada reta, sem patamar.",
      "Escadas de uso coletivo, de emergência e com exigência de acessibilidade têm regras próprias. Consulte um profissional habilitado.",
    ],
  },
  {
    slug: "metros-quadrados",
    nome: "Metros quadrados",
    pergunta: "Como calcular os metros quadrados de um cômodo ou terreno?",
    titulo: "Calculadora de metros quadrados (m²) para cômodo, parede e terreno",
    descricao: "Calcule a área em m² de retângulos, cômodos em L, triângulos, trapézios e círculos, com desconto de vãos.",
    intro: "Escolha o formato que mais se parece com o espaço e informe as medidas em metros. Para parede, use o retângulo e desconte portas e janelas.",
    campos: [
      { id: "forma", label: "Formato", tipo: "selecao", padrao: "retangulo", opcoes: [
        { valor: "retangulo", label: "Retângulo ou quadrado" },
        { valor: "l", label: "Em L (dois retângulos)" },
        { valor: "triangulo", label: "Triângulo" },
        { valor: "trapezio", label: "Trapézio" },
        { valor: "circulo", label: "Círculo" },
      ] },
      { id: "a", label: "Comprimento", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 5, mostrarSe: { campo: "forma", valores: ["retangulo", "l"] } },
      { id: "b", label: "Largura (ou altura da parede)", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 4, mostrarSe: { campo: "forma", valores: ["retangulo", "l"] } },
      { id: "a2", label: "Comprimento do segundo retângulo", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 2, mostrarSe: { campo: "forma", valores: ["l"] } },
      { id: "b2", label: "Largura do segundo retângulo", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 1.5, mostrarSe: { campo: "forma", valores: ["l"] } },
      { id: "base", label: "Base", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 6, mostrarSe: { campo: "forma", valores: ["triangulo", "trapezio"] } },
      { id: "baseMenor", label: "Base menor", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 4, mostrarSe: { campo: "forma", valores: ["trapezio"] } },
      { id: "alt", label: "Altura, medida em esquadro com a base", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 3, mostrarSe: { campo: "forma", valores: ["triangulo", "trapezio"] } },
      { id: "diametro", label: "Diâmetro", tipo: "numero", unidade: "m", min: 0.01, max: 100000, passo: 0.01, padrao: 3, mostrarSe: { campo: "forma", valores: ["circulo"] } },
      { id: "vaos", label: "Área a descontar", tipo: "numero", unidade: "m²", min: 0, max: 100000, passo: 0.01, padrao: 0, ajuda: "Portas, janelas ou trechos que não entram na conta." },
    ],
    calcular(v) {
      const forma = txt(v, "forma");
      let bruta = 0;
      let perimetro: number | null = null;
      if (forma === "l") bruta = num(v, "a") * num(v, "b") + num(v, "a2") * num(v, "b2");
      else if (forma === "triangulo") bruta = (num(v, "base") * num(v, "alt")) / 2;
      else if (forma === "trapezio") bruta = ((num(v, "base") + num(v, "baseMenor")) / 2) * num(v, "alt");
      else if (forma === "circulo") { bruta = Math.PI * (num(v, "diametro") / 2) ** 2; perimetro = Math.PI * num(v, "diametro"); }
      else { bruta = num(v, "a") * num(v, "b"); perimetro = 2 * (num(v, "a") + num(v, "b")); }
      const area = Math.max(0, bruta - num(v, "vaos"));
      const linhas = [{ rotulo: "Área sem descontos", valor: `${fmt(bruta)} m²` }];
      if (perimetro !== null) linhas.push({ rotulo: "Perímetro", valor: `${fmt(perimetro)} m` });
      return { principal: { rotulo: "Área", valor: `${fmt(area)} m²` }, linhas, lista: [`Área: ${fmt(area)} m²`] };
    },
    comoCalculamos: [
      "Retângulo: comprimento × largura.",
      "Em L: soma das áreas de dois retângulos.",
      "Triângulo: base × altura ÷ 2. Trapézio: (base maior + base menor) ÷ 2 × altura.",
      "Círculo: π × (diâmetro ÷ 2)².",
    ],
    limites: [
      "Terrenos irregulares precisam ser divididos em formas simples e somados.",
      "A área de escritura ou de matrícula é a que vale em documento; esta conta é para planejar obra e compra de material.",
    ],
  },
  {
    slug: "drywall",
    nome: "Drywall",
    pergunta: "Quantas chapas de drywall preciso para a parede?",
    titulo: "Calculadora de drywall: chapas, montantes e guias",
    descricao: "Calcule chapas de drywall, montantes e guias para uma parede divisória ou revestimento, conforme o tamanho da chapa e o espaçamento.",
    intro: "Informe as medidas da parede e o tamanho da chapa. A calculadora conta as chapas pelas duas faces, os montantes pelo espaçamento e as guias pelo comprimento.",
    campos: [
      { id: "comprimento", label: "Comprimento da parede", tipo: "numero", unidade: "m", min: 0.3, max: 1000, passo: 0.05, padrao: 4 },
      { id: "altura", label: "Altura da parede", tipo: "numero", unidade: "m", min: 0.3, max: 12, passo: 0.05, padrao: 2.7 },
      { id: "vaos", label: "Portas e janelas a descontar", tipo: "numero", unidade: "m²", min: 0, max: 5000, passo: 0.1, padrao: 0 },
      { id: "faces", label: "Faces com chapa", tipo: "selecao", padrao: "2", opcoes: [
        { valor: "2", label: "Duas faces (parede divisória)" },
        { valor: "1", label: "Uma face (revestimento)" },
      ] },
      { id: "chapa", label: "Tamanho da chapa", tipo: "selecao", padrao: "120x240", opcoes: Object.entries(CHAPAS).map(([valor, c]) => ({ valor, label: c.label })) },
      { id: "espacamento", label: "Espaçamento entre montantes", tipo: "selecao", padrao: "60", opcoes: [
        { valor: "60", label: "60 cm" },
        { valor: "40", label: "40 cm" },
      ] },
      { id: "barra", label: "Comprimento da barra de guia", tipo: "numero", unidade: "m", min: 1, max: 6, passo: 0.5, padrao: 3 },
      perda(10),
    ],
    calcular(v) {
      const c = num(v, "comprimento");
      const faces = Number(txt(v, "faces")) || 2;
      const chapa = CHAPAS[txt(v, "chapa")] ?? CHAPAS["120x240"];
      const area = Math.max(0, c * num(v, "altura") - num(v, "vaos"));
      const chapas = teto(comPerda(area * faces, num(v, "perda")) / chapa.area);
      const montantes = teto(c / ((Number(txt(v, "espacamento")) || 60) / 100)) + 1;
      const guias = teto((2 * c) / num(v, "barra"));
      return {
        principal: { rotulo: "Chapas a comprar", valor: plural(chapas, "chapa", "chapas") },
        linhas: [
          { rotulo: "Área de chapa", valor: `${fmt(area * faces)} m² (${fmt(area)} m² por face)` },
          { rotulo: "Montantes, na altura da parede", valor: plural(montantes, "peça", "peças") },
          { rotulo: "Guias de piso e teto", valor: `${plural(guias, "barra", "barras")} de ${fmt(num(v, "barra"), 1)} m` },
        ],
        lista: [`Chapas de drywall ${chapa.label}: ${fmt(chapas, 0)}`, `Montantes: ${fmt(montantes, 0)} peças`, `Guias: ${fmt(guias, 0)} barras de ${fmt(num(v, "barra"), 1)} m`],
      };
    },
    comoCalculamos: [
      "Área por face = comprimento × altura − vãos.",
      "Chapas = área × número de faces, mais a margem de recortes, dividida pela área de uma chapa.",
      "Montantes = comprimento ÷ espaçamento, arredondado para cima, mais um para fechar a ponta.",
      "Guias = 2 × comprimento (piso e teto), dividido pelo comprimento da barra.",
    ],
    limites: [
      "Não inclui parafusos, fita, massa, lã isolante nem reforços de porta.",
      "Paredes altas, com chapa dupla ou em área úmida seguem a especificação do fabricante do sistema.",
    ],
  },
  {
    slug: "areia-brita-e-terra",
    nome: "Areia, brita e terra",
    pergunta: "Quantos metros de areia, brita ou terra eu preciso?",
    titulo: "Calculadora de areia, brita e terra em m³, latas e carrinhos",
    descricao: "Calcule o volume de areia, brita ou terra em m³ e converta para latas de 18 litros, carrinhos de mão e toneladas.",
    intro: "Informe a área e a espessura da camada. O resultado sai em metros cúbicos, como o material é vendido, e também em latas e carrinhos, que é como ele é medido na obra.",
    campos: [
      { id: "material", label: "Material", tipo: "selecao", padrao: "areia", opcoes: Object.entries(GRANEIS).map(([valor, g]) => ({ valor, label: g.label })) },
      { id: "comprimento", label: "Comprimento", tipo: "numero", unidade: "m", min: 0.1, max: 10000, passo: 0.1, padrao: 5 },
      { id: "largura", label: "Largura", tipo: "numero", unidade: "m", min: 0.1, max: 10000, passo: 0.1, padrao: 4 },
      { id: "espessura", label: "Espessura da camada", tipo: "numero", unidade: "cm", min: 0.5, max: 1000, passo: 0.5, padrao: 5 },
      perda(10, "Cobre sobras e, em aterro, a acomodação do material."),
      { id: "carrinho", label: "Capacidade do carrinho de mão", tipo: "numero", unidade: "litros", min: 20, max: 200, passo: 5, padrao: 60 },
    ],
    calcular(v) {
      const g = GRANEIS[txt(v, "material")] ?? GRANEIS.areia;
      const volume = comPerda(num(v, "comprimento") * num(v, "largura") * (num(v, "espessura") / 100), num(v, "perda"));
      const latas = teto((volume * 1000) / 18);
      const carrinhos = teto((volume * 1000) / num(v, "carrinho"));
      return {
        principal: { rotulo: `${g.label} a comprar`, valor: `${fmt(volume)} m³` },
        linhas: [
          { rotulo: "Em latas de 18 litros", valor: plural(latas, "lata", "latas") },
          { rotulo: `Em carrinhos de ${fmt(num(v, "carrinho"), 0)} litros`, valor: plural(carrinhos, "carrinho", "carrinhos") },
          { rotulo: "Peso aproximado", valor: `${fmt(volume * g.densidade, 1)} t` },
        ],
        lista: [`${g.label}: ${fmt(volume)} m³ (cerca de ${fmt(volume * g.densidade, 1)} t)`],
      };
    },
    comoCalculamos: [
      "Volume = comprimento × largura × espessura, com a espessura convertida de centímetros para metros, mais a margem.",
      "1 m³ tem 1.000 litros, o que dá 55,6 latas de 18 litros.",
      "Peso = volume × massa do material solto: cerca de 1,5 t/m³ para areia, 1,45 para brita e 1,2 para terra.",
    ],
    limites: [
      "O peso varia bastante com a umidade e o tipo do material. Use só como ordem de grandeza para o frete.",
      "Aterro compactado pede mais material do que o volume medido; ajuste a margem conforme a orientação de quem vai executar.",
    ],
  },
  {
    slug: "contrapiso",
    nome: "Contrapiso",
    pergunta: "Quanto de argamassa vai no contrapiso?",
    titulo: "Calculadora de contrapiso com caimento: espessura e volume",
    descricao: "Calcule o volume de argamassa do contrapiso, com a espessura média quando há caimento para o ralo ou para fora.",
    intro: "Informe a área e a espessura mínima. Se o piso tiver caimento, a calculadora encontra a espessura no ponto mais alto, a média e o volume de argamassa.",
    campos: [
      { id: "area", label: "Área do contrapiso", tipo: "numero", unidade: "m²", min: 0.1, max: 100000, passo: 0.1, padrao: 20 },
      { id: "espessura", label: "Espessura mínima", tipo: "numero", unidade: "cm", min: 1, max: 30, passo: 0.5, padrao: 3 },
      { id: "caimento", label: "Caimento", tipo: "numero", unidade: "%", min: 0, max: 10, passo: 0.1, padrao: 0, ajuda: "1% significa descer 1 cm a cada metro. Deixe 0 para piso nivelado." },
      { id: "distancia", label: "Distância do ponto alto até o ponto baixo", tipo: "numero", unidade: "m", min: 0, max: 200, passo: 0.1, padrao: 0 },
      perda(5),
    ],
    calcular(v) {
      const min = num(v, "espessura");
      const max = min + num(v, "caimento") * num(v, "distancia");
      const media = (min + max) / 2;
      const volume = comPerda(num(v, "area") * (media / 100), num(v, "perda"));
      return {
        principal: { rotulo: "Volume de argamassa", valor: `${fmt(volume)} m³` },
        linhas: [
          { rotulo: "Espessura no ponto mais alto", valor: `${fmt(max, 1)} cm` },
          { rotulo: "Espessura média", valor: `${fmt(media, 1)} cm` },
          { rotulo: "Em litros", valor: `${fmt(volume * 1000, 0)} litros` },
          { rotulo: "Em latas de 18 litros", valor: plural(teto((volume * 1000) / 18), "lata", "latas") },
        ],
        lista: [`Argamassa para contrapiso: ${fmt(volume)} m³ (espessura média de ${fmt(media, 1)} cm)`],
      };
    },
    comoCalculamos: [
      "Desnível = caimento em % × distância em metros, em centímetros. Com 1% em 3 m, o desnível é de 3 cm.",
      "Espessura no ponto mais alto = espessura mínima + desnível.",
      "Espessura média = (mínima + máxima) ÷ 2, válida quando o caimento é uniforme em uma direção.",
      "Volume = área × espessura média, mais a margem de perdas.",
    ],
    limites: [
      "Não define o traço nem a quantidade de cimento e areia.",
      "Caimento para ralo central, em quatro direções, dá um volume um pouco menor que o desta conta.",
    ],
  },
  {
    slug: "forro-pvc",
    nome: "Forro de PVC",
    pergunta: "Quantas réguas de forro de PVC preciso?",
    titulo: "Calculadora de forro de PVC: réguas e rodaforro",
    descricao: "Calcule quantas réguas de forro de PVC e quantas barras de rodaforro comprar, conforme o tamanho do cômodo e o sentido da instalação.",
    intro: "Informe as medidas do cômodo, o tamanho da régua e o sentido em que ela vai correr. A calculadora considera o aproveitamento das sobras quando a régua é maior que o vão.",
    campos: [
      { id: "comprimento", label: "Comprimento do cômodo", tipo: "numero", unidade: "m", min: 0.3, max: 200, passo: 0.05, padrao: 4 },
      { id: "largura", label: "Largura do cômodo", tipo: "numero", unidade: "m", min: 0.3, max: 200, passo: 0.05, padrao: 3 },
      { id: "sentido", label: "As réguas correm no sentido", tipo: "selecao", padrao: "largura", opcoes: [
        { valor: "largura", label: "Da largura (vão menor)" },
        { valor: "comprimento", label: "Do comprimento" },
      ] },
      { id: "reguaLargura", label: "Largura útil da régua", tipo: "numero", unidade: "cm", min: 5, max: 60, passo: 0.5, padrao: 20 },
      { id: "reguaComprimento", label: "Comprimento da régua", tipo: "numero", unidade: "m", min: 1, max: 12, passo: 0.5, padrao: 6 },
      { id: "barra", label: "Comprimento da barra de rodaforro", tipo: "numero", unidade: "m", min: 1, max: 12, passo: 0.5, padrao: 6 },
      perda(5),
    ],
    calcular(v) {
      const c = num(v, "comprimento"), l = num(v, "largura");
      const vao = txt(v, "sentido") === "comprimento" ? c : l;
      const outro = txt(v, "sentido") === "comprimento" ? l : c;
      const regua = num(v, "reguaComprimento");
      const fileiras = teto(outro / (num(v, "reguaLargura") / 100));
      // Régua maior que o vão: cada régua rende um número inteiro de pedaços. Menor: há emenda.
      const base = regua >= vao ? fileiras / Math.floor(regua / vao + 1e-9) : (fileiras * vao) / regua;
      const reguas = teto(comPerda(base, num(v, "perda")));
      const perimetro = 2 * (c + l);
      const barras = teto(perimetro / num(v, "barra"));
      return {
        principal: { rotulo: "Réguas a comprar", valor: `${plural(reguas, "régua", "réguas")} de ${fmt(regua, 1)} m` },
        linhas: [
          { rotulo: "Área do forro", valor: `${fmt(c * l)} m²` },
          { rotulo: "Fileiras de régua", valor: `${fmt(fileiras, 0)}, cada uma com ${fmt(vao)} m` },
          { rotulo: "Rodaforro", valor: `${fmt(perimetro)} m (${plural(barras, "barra", "barras")} de ${fmt(num(v, "barra"), 1)} m)` },
        ],
        lista: [`Forro de PVC, régua de ${fmt(num(v, "reguaLargura"), 1)} cm × ${fmt(regua, 1)} m: ${fmt(reguas, 0)} réguas`, `Rodaforro: ${fmt(barras, 0)} barras de ${fmt(num(v, "barra"), 1)} m`],
      };
    },
    comoCalculamos: [
      "Fileiras = dimensão perpendicular às réguas ÷ largura útil da régua, arredondado para cima.",
      "Se a régua é maior que o vão, cada régua rende um número inteiro de pedaços e a sobra menor que o vão é descartada.",
      "Se a régua é menor que o vão, a conta é pelo comprimento total, com emenda.",
      "Rodaforro = perímetro do cômodo ÷ comprimento da barra.",
    ],
    limites: [
      "Não inclui a estrutura de sustentação, emendas, cantoneiras nem parafusos.",
      "Cômodos fora de esquadro ou com recortes pedem margem maior.",
    ],
  },
  {
    slug: "cerca",
    nome: "Cerca",
    pergunta: "Quantos mourões e quanto arame ou tela a cerca precisa?",
    titulo: "Calculadora de cerca: mourões, arame e tela",
    descricao: "Calcule a quantidade de mourões, os metros e rolos de arame ou os rolos de tela para cercar um terreno.",
    intro: "Informe o comprimento total da cerca e o espaçamento entre mourões. Escolha arame ou tela e a calculadora converte tudo em rolos.",
    campos: [
      { id: "comprimento", label: "Comprimento total da cerca", tipo: "numero", unidade: "m", min: 1, max: 100000, passo: 0.5, padrao: 50 },
      { id: "espacamento", label: "Distância entre mourões", tipo: "numero", unidade: "m", min: 0.5, max: 20, passo: 0.1, padrao: 2.5 },
      { id: "fechamento", label: "Fechamento", tipo: "selecao", padrao: "arame", opcoes: [
        { valor: "arame", label: "Fios de arame" },
        { valor: "tela", label: "Tela" },
      ] },
      { id: "fios", label: "Número de fios", tipo: "numero", unidade: "fios", min: 1, max: 20, passo: 1, padrao: 5, mostrarSe: { campo: "fechamento", valores: ["arame"] } },
      { id: "rolo", label: "Comprimento do rolo", tipo: "numero", unidade: "m", min: 5, max: 2000, passo: 5, padrao: 500, ajuda: "Arame costuma vir em rolos de 250 ou 500 m; tela, em rolos de 25 m. Confira o produto." },
      perda(5),
    ],
    calcular(v) {
      const c = num(v, "comprimento");
      const mouroes = teto(c / num(v, "espacamento")) + 1;
      const tela = txt(v, "fechamento") === "tela";
      const metros = comPerda(c * (tela ? 1 : num(v, "fios")), num(v, "perda"));
      const rolos = teto(metros / num(v, "rolo"));
      const nome = tela ? "Tela" : "Arame";
      return {
        principal: { rotulo: "Mourões", valor: plural(mouroes, "mourão", "mourões") },
        linhas: [
          { rotulo: `${nome}, com a margem`, valor: `${fmt(metros, 0)} m` },
          { rotulo: `Rolos de ${fmt(num(v, "rolo"), 0)} m`, valor: plural(rolos, "rolo", "rolos") },
        ],
        lista: [`Mourões: ${fmt(mouroes, 0)}`, `${nome}: ${fmt(metros, 0)} m (${fmt(rolos, 0)} rolos de ${fmt(num(v, "rolo"), 0)} m)`],
      };
    },
    comoCalculamos: [
      "Mourões = comprimento ÷ distância entre mourões, arredondado para cima, mais um para fechar a ponta.",
      "Arame = comprimento × número de fios, mais a margem. Tela = comprimento, mais a margem.",
      "Rolos = metros ÷ comprimento do rolo, arredondado para cima.",
    ],
    limites: [
      "Não inclui esticadores, escoras de canto, grampos, portão nem concreto dos mourões.",
      "Em cerca fechada, que volta ao ponto de partida, o mourão extra da ponta sobra.",
    ],
  },
];

export const getQuantidade = (slug: string) => QUANTIDADES.find((q) => q.slug === slug);

/** Valores iniciais do formulário. */
export function padroes(calc: CalcQuantidade): ValoresQ {
  return Object.fromEntries(calc.campos.map((c) => [c.id, c.padrao]));
}

/** Um campo condicional só vale quando o campo de que depende tem um dos valores esperados. */
export const campoVisivel = (campo: CampoQ, v: ValoresQ) =>
  !campo.mostrarSe || campo.mostrarSe.valores.includes(String(v[campo.mostrarSe.campo]));

/** Devolve a mensagem do primeiro campo numérico visível fora da faixa, ou null. */
export function validar(calc: CalcQuantidade, v: ValoresQ): string | null {
  for (const campo of calc.campos) {
    if (campo.tipo !== "numero" || !campoVisivel(campo, v)) continue;
    const valor = Number(v[campo.id]);
    const min = campo.min ?? 0, max = campo.max ?? 1e9;
    if (v[campo.id] === "" || !Number.isFinite(valor) || valor < min || valor > max) {
      return `Confira "${campo.label}": informe um valor entre ${fmt(min)} e ${fmt(max)}${campo.unidade ? " " + campo.unidade : ""}.`;
    }
  }
  return null;
}
