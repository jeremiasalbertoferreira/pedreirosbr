/**
 * DNA multi-profissão — um ofício é DADO, não código.
 * Para adicionar "eletricista" ou "encanador" amanhã: criar um novo arquivo
 * em src/oficios/ e registrar no index. Nenhuma rota, componente ou motor
 * de cálculo muda.
 */

export interface ServicoCalc {
  /** slug da URL: /calculadoras/[slug] */
  slug: string;
  /** nome curto do serviço: "Reboco de parede" */
  nome: string;
  /** pergunta do lado do cliente: "Quanto custa rebocar uma parede?" */
  perguntaCliente: string;
  /** pergunta do lado do profissional: "Quanto cobrar pelo reboco?" */
  perguntaProfissional: string;
  /** identificador do motor de cálculo em src/lib/calc/engines.ts */
  engine: "reboco" | "muro" | "pintura" | "telhado" | "banheiro";
  /** campos do formulário */
  campos: CampoCalc[];
  /** dica curta exibida no formulário */
  dica?: string;
}

export interface CampoCalc {
  id: string;
  label: string;
  tipo: "numero" | "selecao";
  unidade?: string;
  min?: number;
  max?: number;
  passo?: number;
  padrao?: number | string;
  opcoes?: { valor: string; label: string; fator: number }[];
}

export interface Afiliado {
  nome: string;
  /** categoria de produto: "cimento", "ferramentas", "tintas"... */
  categoria: string;
  /** URL base — {TAG} é substituído pela tag de afiliado do env */
  urlTemplate: string;
}

export interface Oficio {
  /** slug do ofício no registry: "pedreiro" */
  slug: string;
  /** nome no singular capitalizado: "Pedreiro" */
  nome: string;
  nomePlural: string;
  /** domínio desta vertical */
  dominio: string;
  /** cor principal (tema) */
  cor: {
    primaria: string;   // hex
    primariaEscura: string;
    fundo: string;
  };
  /** frase-produto para o profissional */
  fraseParaProfissional: string;
  /** calculadoras/ferramentas desta vertical */
  servicos: ServicoCalc[];
  /** termos de busca do lado profissional (SEO dupla intenção) */
  termosProfissional: { slug: string; titulo: string }[];
  /** afiliados desta vertical */
  afiliados: Afiliado[];
  /** limiares do organismo: quando uma página de território nasce / quando a assinatura desperta */
  limiares: {
    /** eventos mínimos para a página de bairro nascer */
    paginaBairro: number;
    /** eventos/mês mínimos para oferecer assinatura de leads */
    assinaturaPorTerritorio: number;
  };
}
