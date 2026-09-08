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
