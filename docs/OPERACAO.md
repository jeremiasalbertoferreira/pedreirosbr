# PedreirosBR — operação e limites desta versão

Responsável informado: JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39, contato@jeafex.com.br.

## Fluxo

1. A consulta à calculadora e a geração de PDF não exigem telefone.
2. Pedidos de cópia por WhatsApp geram um link de confirmação de 30 minutos. O cadastro só se confirma quando a mensagem assinada pela Meta vem do próprio número.
3. Compartilhar telefone e pedido com um profissional exige autorização separada. A demanda comercial considera telefones distintos confirmados, não simples cliques na calculadora.
4. Uma cidade pode ter apenas uma reserva de assinatura. A seleção da fila é serializada por cidade.
5. Mensagens ficam na outbox. `SENT` significa aceitação pela API; `DELIVERED` depende de callback. Callbacks antecipados são persistidos e reconciliados.

## Configuração

Segredos ficam no Coolify, nunca no Git. `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_VERIFY_TOKEN` são independentes. O PIN de registro deve permanecer no cofre do operador, não é usado pela aplicação em runtime.

Callback: `https://pedreirosbr.com.br/api/whatsapp/webhook`, campo `messages`, objeto `whatsapp_business_account`. Assinar o aplicativo na WABA exclusiva do PedreirosBR após validar o callback.

Worker no agendador do Coolify, dentro do container da aplicação, a cada minuto: `node /app/scripts/run-jobs.cjs`. O script lê `INTERNAL_JOB_TOKEN` do ambiente e chama o endpoint local. Não coloque tokens em comandos ou logs.

Health: `/api/health`, com consulta ao banco. Resposta 200 não comprova funcionamento da Meta ou Asaas.

## Cobranças

Modelo confirmado: R$ 97/mês, um profissional por cidade na plataforma. Manter `ASAAS_BILLING_ENABLED=false` até canário real em sandbox, templates aprovados, reconciliação financeira e homologação comercial. `ASAAS_ENV` deve ser explícito. Nunca usar a chave de produção para teste de cobrança.

Falhas financeiras ambíguas permanecem em `CREATING`/`REVIEW`. Não apague esses registros para tentar novamente. Verifique a assinatura no provedor antes de qualquer ajuste.

## Anúncios de lojas

Módulo desligado por padrão (`ADS_ENABLED`). Funcionamento, variáveis, revisão manual e roteiro para ligar estão em `docs/ANUNCIOS.md`. A cobrança de anúncios tem chave própria (`ADS_BILLING_ENABLED`) e segue a mesma regra das assinaturas: falha ambígua fica em `REVIEW` e não é repetida sozinha.

## Atendimento e manutenção

- Cancelamento e pedidos de privacidade são atendidos por e-mail. A página não promete exclusão automática. O operador deve conferir titularidade, cancelar no provedor quando aplicável, atualizar registros locais e responder ao solicitante.
- `SENDING` abandonado e `REVIEW` exigem análise; não reenviar cegamente após timeout. A outbox não prova entrega sem callback.
- O token de sistema foi gerado com validade limitada; programar rotação antes do vencimento e testar novo token antes de substituir o anterior.
- O backup pré-publicação foi restaurado em container isolado em 08/09/2026. Uma restauração comprovada não substitui backup recorrente, retenção e simulação periódica.
- Calculadoras são estimativas preliminares, não cotações locais ou projeto técnico. Coeficientes ainda precisam de homologação técnica antes de alegações de precisão.
- As páginas de privacidade e termos descrevem o funcionamento informado; revisão jurídica e rotina operacional continuam necessárias.

## Validação

`TEST_DATABASE_URL` deve apontar exclusivamente para `127.0.0.1/pedreirosbr_safety`. Aplicar migrations no banco descartável, gerar Prisma Client e executar `node --test tests/safety.test.cjs`. Rede de Meta/Asaas é simulada nesse conjunto; não usar variáveis reais nos testes.

Em 08/09/2026: 30 testes passaram, incluindo confirmação de titularidade, consentimento, concorrência na fila e reserva, duplicação de webhooks, callbacks fora de ordem e bloqueio de cobranças repetidas. O PDF de três páginas foi revisado visualmente e mostra centavos. A Meta confirmou a linha como `CONNECTED/CLOUD_API`; o usuário confirmou o recebimento do template de teste.

Estas evidências não significam que pagamentos, operação comercial, cancelamento e todos os fluxos em produção já estejam homologados.

## Atualização de segurança — 08/09/2026

- Next.js e eslint-config-next atualizados para 16.3.4; sharp 0.35.4 e deepmerge-ts 8.0.0 fixados por override, com Prisma generate/migrate e testes de integração para verificar compatibilidade.
- Dependências transitivas DOMPurify, nanoid, brace-expansion e js-yaml atualizadas dentro das versões compatíveis. Auditoria completa do lockfile: zero vulnerabilidades conhecidas naquele momento; isso não é garantia de ausência de falhas.
- Boletins: https://github.com/advisories/GHSA-2xp9-vwfh-vxw4 e https://github.com/advisories/GHSA-ggr8-5vv4-36mx.
- Outbox consulta o relógio UTC do PostgreSQL para selecionar mensagens vencidas. O 31º teste cobre relógio da aplicação atrasado e preservação de agendamentos futuros.
- DATABASE_URL, ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN devem ser exclusivamente runtime no Coolify, assim como os segredos Meta. Build e Prisma generate foram validados sem DATABASE_URL.
- Imagens e caches antigos podem conter argumentos de build legados. A correção da configuração não apaga cópias históricas; revisar acesso e rotacionar as credenciais afetadas de forma coordenada antes da ativação financeira.

## Atualização da auditoria — 19/11/2026

Correções aplicadas a partir do parecer de auditoria de 19/11/2026. Cada item tem teste em `tests/safety.test.cjs` ou `tests/seo.test.cjs`.

- **Nono dígito.** Telefones são guardados e comparados na forma canônica (DDD + 9 + 8 dígitos). A Meta costuma identificar celulares de fora dos DDDs 11–19, 21, 22, 24, 27 e 28 sem o nono dígito; antes disso a confirmação falhava nesses casos. As respostas continuam indo para o identificador que a Meta enviou.
- **Fila.** Convite sem resposta expira em 48 h (variável opcional `FILA_CONVITE_HORAS`) e o profissional passa a `expirado`; a vez segue para o próximo. Quem já tem cobrança ou vaga reservada não expira por esse prazo. `expirado` e `recusado` voltam ao fim da fila ao se cadastrar de novo, e recebem um novo convite.
- **Recusa.** Só a resposta isolada (SAIR, PARAR, NÃO, NÃO QUERO) tira da fila. Outras frases recebem uma orientação por hora.
- **Outbox.** Recusa temporária declarada pela Meta (HTTP 429 ou 5xx com objeto de erro) é repetida após 1, 5 e 30 minutos; depois disso, `REVIEW`. Timeout, erro de rede e resposta sem identificador continuam indo direto para `REVIEW`, sem repetição.
- **Limites públicos.** `/api/lead` e `/api/profissional`: 20 por hora por origem, além do limite por telefone. `/api/evento`: 120 por hora por origem e 600 por hora por território. A origem é a última entrada de `X-Forwarded-For` (a que o proxy do Coolify acrescenta) e só entra em uma chave gravada como hash. Se um CDN for colocado na frente do site, essa leitura precisa ser revista.
- **Evento.** O nome do território vem da base interna e `meta` aceita apenas os campos que o site envia.
- **Retenção.** Pedido nunca confirmado pelo WhatsApp é apagado em 7 dias pelo worker. O prazo de guarda dos confirmados continua sem definição e depende de decisão do responsável.
- **Diagnóstico.** `/api/internal/operations` passa a listar vaga reservada há mais de 5 dias sem nenhuma fatura registrada.
- **Dependências.** Next.js e eslint-config-next 16.4.6; sharp 0.35.5 por override; `npm audit` sem itens conhecidos naquele momento. O otimizador de imagens foi desligado (`images.unoptimized`), porque o site não usa `next/image`.
- **CI.** `.github/workflows/ci.yml` roda lint, tipos, migrations, testes, build e `npm audit` em todo pull request e em `main`. O Coolify publica a partir de `main`; para o CI valer como trava, alterações devem entrar por pull request.

Não alterado nesta rodada, por depender de decisão do responsável ou de acesso que a aplicação não tem: backup recorrente do banco fora da VPS, alerta automático para itens em revisão, retorno de assinante cancelado à fila, prazo de guarda dos cadastros confirmados e visibilidade do repositório.

## Calculadoras de quantidade — lote 1 (19/11/2026)

Doze calculadoras em `/calculadoras/<slug>`, definidas em `src/lib/quantidades/index.ts`: tijolos e blocos, concreto, pisos e azulejos, telhas, inclinação de telhado, escada, metros quadrados, drywall, areia/brita/terra, contrapiso, forro de PVC e cerca.

- São contas geométricas, sem preço, sem fator por estado, sem rede e sem coleta de telefone.
- Todo número que depende de produto (telhas por m², consumo de cimento, densidade do rejunte, tamanho de rolo) é campo editável com um valor usual de partida. Nenhum é apresentado como norma.
- Cada página publica a fórmula, um exemplo calculado no servidor e o que a conta não considera.
- O botão "Enviar lista pelo WhatsApp" abre o WhatsApp do próprio visitante, sem número de destino, com a lista e o endereço da calculadora.
- Para criar outra: acrescentar um item em `QUANTIDADES` e um teste com valor conferido à mão em `tests/quantidades.test.cjs`. Página, sitemap, listagens e `llms.txt` saem do registro.

No mesmo lote, o pedido por WhatsApp das calculadoras de preço passou a oferecer a escolha da cidade para quem calculou só com a referência do estado. A cidade continua opcional, porque a base tem 851 municípios.

## Páginas de cidade: título, descrição e calculadora no lugar (19/11/2026)

Motivo, pelos dados do Search Console (propriedade `https://pedreirosbr.com.br/`, ativa desde julho):

| Linha de base | Últimos 28 dias até 17/11/2026 | 28 dias anteriores |
|---|---|---|
| Cliques | 481 | 298 |
| Impressões | 39,1 mil | 23,1 mil |
| CTR | 1,2% | 1,3% |
| Posição média | 5,6 | 5,7 |

- Quase todo o tráfego entra pelas páginas `/pedreiro-em/<cidade>`; 860 páginas indexadas, sem ação manual.
- As buscas visíveis são de dois tipos: contratar ("pedreiro fortaleza", "pedreiros perto de mim") e preço ("valor da diária de um pedreiro em curitiba"). Nas de preço o site aparecia entre a 4ª e a 8ª posição com CTR perto de 0,5%.

O que mudou:

- Título: `Pedreiro em <cidade> (<UF>): diária estimada de R$ X a R$ Y`, sem o sufixo do site. O começo do título foi mantido.
- Descrição: começa por "Valor da diária de pedreiro em <cidade>: estimativa de R$ X a R$ Y, referência de <UF>".
- Os números são os mesmos da página e seguem marcados como estimativa estadual. Os avisos da página não mudaram.
- A calculadora passou a ficar dentro da página de cidade, com a cidade já escolhida, o que torna o pedido por WhatsApp encaminhável sem passo extra.
- Bloco para o profissional da cidade entrar na fila.

Como medir: comparar CTR e cliques das páginas de cidade no Search Console três a quatro semanas depois da publicação, contra a linha de base acima. Se a posição média piorar de forma clara, o título anterior está no histórico do Git.
