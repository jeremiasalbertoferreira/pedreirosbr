/**
 * Motores de cálculo de obra — funções puras, testáveis, sem I/O.
 * Preços-base nacionais (2026), regionalizados pelo multiplicador da UF.
 * O flywheel de dados reais vai refinando estes base prices com o tempo.
 */
import type { UFData } from "../data/ufs";

export interface ItemMaterial {
  nome: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotal: number;
}

export interface ResultadoCalc {
  materiais: ItemMaterial[];
  custoMateriais: number;
  maoDeObraM2: number;      // R$/m² de referência (o que o pedreiro cobra)
  custoMaoDeObra: number;
  totalMin: number;         // faixa -10%
  totalMax: number;         // faixa +15%
  areaEfetiva: number;      // m² efetivos calculados
  observacoes: string[];
}

function brl(v: number): number {
  return Math.round(v * 100) / 100;
}

function item(nome: string, quantidade: number, unidade: string, custoUnitario: number): ItemMaterial {
  const q = Math.ceil(quantidade * 100) / 100;
  return { nome, quantidade: q, unidade, custoUnitario, custoTotal: brl(q * custoUnitario) };
}

function finalize(materiais: ItemMaterial[], maoDeObraM2: number, areaEfetiva: number, uf: UFData, observacoes: string[]): ResultadoCalc {
  const custoMateriais = brl(materiais.reduce((s, m) => s + m.custoTotal, 0));
  const moM2Regional = brl(maoDeObraM2 * uf.multiplicadorMaoDeObra);
  const custoMaoDeObra = brl(moM2Regional * areaEfetiva);
  const total = custoMateriais + custoMaoDeObra;
  return {
    materiais,
    custoMateriais,
    maoDeObraM2: moM2Regional,
    custoMaoDeObra,
    totalMin: brl(total * 0.9),
    totalMax: brl(total * 1.15),
    areaEfetiva,
    observacoes,
  };
}

/** Reboco: ~10 kg cimento + 0,06 m³ areia por m² (traço 1:4, esp. 2cm). M.O. base R$ 32/m². */
export function calcReboco(area: number, fatorAcabamento: number, uf: UFData): ResultadoCalc {
  const fatorMaterial = 1 + (uf.cub - 1840) / 1840 * 0.5; // material segue CUB com elasticidade 0.5
  const materiais = [
    item("Cimento CP-II (sacos 50kg)", (area * 10) / 50, "sacos", 34 * fatorMaterial),
    item("Areia média lavada", area * 0.06, "m³", 145 * fatorMaterial),
    item("Cal hidratada (sacos 20kg)", (area * 2) / 20, "sacos", 24 * fatorMaterial),
    item("Aditivo/impermeabilizante", area * 0.05, "L", 18 * fatorMaterial),
  ];
  return finalize(materiais, 32 * fatorAcabamento, area, uf, [
    "Traço considerado: 1:2:8 (cimento, cal, areia), espessura 2 cm.",
    "Parede de alvenaria nova consome ~5% a mais que alvenaria antiga.",
  ]);
}

/** Muro de bloco: ~13 blocos + 0,55 saco cimento + 0,08 m³ areia por m². M.O. base R$ 55/m². */
export function calcMuro(comprimento: number, altura: number, fatorMaterial2: number, uf: UFData): ResultadoCalc {
  const area = comprimento * altura;
  const fm = 1 + (uf.cub - 1840) / 1840 * 0.5;
  const bloco = fatorMaterial2 > 1 ? "Tijolo cerâmico 14x19x29" : "Bloco de concreto 14x19x39";
  const qtdBloco = fatorMaterial2 > 1 ? area * 24 : area * 13;
  const materiais = [
    item(bloco, qtdBloco, "unidades", (fatorMaterial2 > 1 ? 1.1 : 3.2) * fm),
    item("Cimento CP-II (sacos 50kg)", (area * 0.55), "sacos", 34 * fm),
    item("Areia média lavada", area * 0.08, "m³", 145 * fm),
    item("Vergalhão 8mm (barras 12m)", (area * 0.25) / 12, "barras", 42 * fm),
    item("Concreto para cinta/colunas", area * 0.015, "m³", 480 * fm),
  ];
  return finalize(materiais, 55 * fatorMaterial2, area, uf, [
    `Área calculada: ${comprimento} m × ${altura} m = ${area.toFixed(1)} m².`,
    "Inclui fundação corrida simples; terreno acidentado pode exigir sapatas.",
    "Reboco das duas faces NÃO incluído — use a calculadora de reboco.",
  ]);
}

/** Pintura: 1L rende ~5 m²/demão (com selador). M.O. base R$ 18/m² por demão. */
export function calcPintura(area: number, demaos: number, fatorTipo: number, uf: UFData): ResultadoCalc {
  const fm = 1 + (uf.cub - 1840) / 1840 * 0.5;
  const litrosTinta = (area * demaos) / 5;
  const latas = Math.ceil(litrosTinta / 18);
  const materiais = [
    item("Tinta (latas 18L)", latas, "latas", 480 * fatorTipo * fm),
    item("Selador acrílico (galões 3,6L)", Math.ceil(area / 120), "galões", 110 * fm),
    item("Massa corrida/acrílica (sacos 25kg)", Math.ceil(area / 40), "sacos", 65 * fm),
    item("Lixas, fita, lonas e rolos", 1, "kit", Math.max(60, area * 1.2)),
  ];
  const mo = 18 * demaos * (0.8 + fatorTipo * 0.2);
  return finalize(materiais, mo, area, uf, [
    "Rendimento médio: 5 m²/L por demão já com diluição.",
    "Parede nova ou com muitas correções pode exigir +1 demão.",
  ]);
}

/** Telhado: área × 1,35 (inclinação média). M.O. base R$ 45/m² efetivo. */
export function calcTelhado(areaPlanta: number, fatorTelha: number, uf: UFData): ResultadoCalc {
  const area = Math.round(areaPlanta * 1.35 * 100) / 100;
  const fm = 1 + (uf.cub - 1840) / 1840 * 0.5;
  const telha = fatorTelha < 0.9 ? "Telha fibrocimento 6mm" : fatorTelha > 1.1 ? "Telha metálica/sanduíche" : "Telha cerâmica";
  const qtdTelha = fatorTelha < 0.9 ? area / 1.68 : fatorTelha > 1.1 ? area / 0.95 : area * 16;
  const materiais = [
    item(telha, qtdTelha, fatorTelha < 0.9 ? "chapas" : fatorTelha > 1.1 ? "m²" : "unidades", (fatorTelha < 0.9 ? 55 : fatorTelha > 1.1 ? 75 : 2.2) * fm),
    item("Madeiramento (caibros/ripas)", area * 0.9, "m", 14 * fm),
    item("Manta subcobertura", area, "m²", 9 * fm),
    item("Parafusos, pregos e fixadores", 1, "kit", area * 3.5),
  ];
  return finalize(materiais, 45 * (0.85 + fatorTelha * 0.15), area, uf, [
    `Área de telhado com inclinação média (35%): ${area.toFixed(0)} m².`,
    "Estrutura considerada em madeira; estrutura metálica altera o custo.",
  ]);
}

/** Reforma de banheiro: pacote por m². M.O. base R$ 850/m² de banheiro (padrão médio). */
export function calcBanheiro(area: number, fatorPadrao: number, uf: UFData): ResultadoCalc {
  const fm = 1 + (uf.cub - 1840) / 1840 * 0.5;
  const materiais = [
    item("Revestimentos (piso + parede)", area * 3.2, "m²", 55 * fatorPadrao * fm),
    item("Louças e metais (kit)", 1, "kit", 1800 * fatorPadrao * fm),
    item("Tubulações e conexões", 1, "kit", 650 * fatorPadrao * fm),
    item("Impermeabilizante", area * 1.2, "kg", 38 * fm),
    item("Argamassa, rejunte e cimento", area * 4, "kg", 3.2 * fm),
  ];
  return finalize(materiais, 850 * fatorPadrao, area, uf, [
    "Reforma completa: demolição, hidráulica, impermeabilização, revestimento e louças.",
    "Elétrica e box de vidro NÃO incluídos.",
    `Padrão ${fatorPadrao < 0.9 ? "simples" : fatorPadrao > 1.2 ? "alto" : "médio"} considerado.`,
  ]);
}
