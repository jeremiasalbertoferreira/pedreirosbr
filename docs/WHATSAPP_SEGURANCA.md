# WhatsApp e cobrança — implementação de segurança

08/09/2026. Alterações locais; publicação na VPS não executada.

## O que mudou

- POST da Meta verifica HMAC-SHA256 sobre bytes originais usando `WHATSAPP_APP_SECRET`; rejeita assinatura ausente/inválida antes de acessar o banco. GET continua usando um verify token separado.
- Payload limitado a 1 MiB, validado antes de produzir efeitos, restrito ao `WHATSAPP_PHONE_NUMBER_ID`. Mensagens de texto precisam de ID e remetente completo. Status de entrega não dispara resposta.
- `WebhookReceipt` deduplica por provedor + ID. WhatsApp retorna 503 em falhas/in-flight, 200 após sucesso; IDs concluídos não reexecutam. Não armazena conteúdo ou CPF.
- `BillingSubscription` tem chave única por profissional e é gravado antes de POST financeiro. Repetições reutilizam `subscriptionId`. Concorrência entre instâncias também é protegida pela chave no Postgres.
- Timeout/resultado ambíguo durante emissão deixa `REVIEW`. Crash pode deixar `CREATING`. Nenhum deles permite novo POST automático: exige reconciliação administrativa. Falha de consulta da fatura não emite nova assinatura.
- Assinaturas legadas detectadas na consulta ao Asaas bloqueiam emissão até reconciliar. Ambiente/território divergentes também bloqueiam reuso.
- CPF recebido é usado imediatamente. Não é solicitado/coletado pelo webhook quando cobrança está desabilitada. Só `QUERO` isolado (com pontuação final opcional) inicia o fluxo; negativas e perguntas não cobram. Cadastros duplicados com/sem DDI bloqueiam processamento.
- Asaas: autenticação com comparação de tempo constante, recibo e alterações na mesma transação, vínculo por `subscriptionId` + cliente + ambiente, serialização por assinatura, cancelamento via `subscription`, rejeição de eventos antigos e de exclusão de fatura diferente do período ativo.
- A confirmação via webhook Asaas atualiza estado e telemetria transacionalmente. O aviso de boas-vindas é enviado fora da transação, apenas na transição para assinante, sem prometer exclusividade ainda não garantida. Continua best-effort; precisa de outbox para garantia de entrega.
- Chamadas de saída têm timeout de 10 segundos. Erros financeiros não registram corpo de resposta, CPF ou tokens.

## Configuração de publicação

1. Backup consistente e confirmação de recuperação antes de migrar. A migration 0003 é aditiva: duas tabelas, índices e FK, sem apagar dados existentes. Dockerfile já aplica migrations antes de iniciar.
2. Publicar o código, migration e schema juntos; gerar Prisma Client no build.
3. Configurar `WHATSAPP_APP_SECRET` (segredo do app PedreirosBR), `WHATSAPP_VERIFY_TOKEN` (valor aleatório próprio), `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_TOKEN` como segredos de runtime no Coolify. Nunca usar prefixo `NEXT_PUBLIC_` ou gravar os valores no Git.
4. Manter `ASAAS_BILLING_ENABLED=false`. `ASAAS_ENV` deve ser explícito; não mudar uma chave de produção para sandbox sem trocar por uma chave sandbox correspondente.
5. Conferir o estado do número e a aprovação do nome/modelos na Meta, concluir registro da Cloud API se necessário e cadastrar callback `https://pedreirosbr.com.br/api/whatsapp/webhook`, assinatura do campo `messages`.
6. Testar primeiro com número próprio autorizado: verificação GET, rejeição de POST sem assinatura e uma mensagem legítima. Registrar ID/status de entrega sem expor conteúdo ou credenciais.
7. Renovar a credencial antes da validade selecionada de 60 dias. Datas exatas e revogação devem ser conferidas na Meta. Nenhum lembrete automático foi criado.

## Limites e bloqueios da ativação comercial

- Testes abaixo são locais com Postgres real e HTTP simulado: não são homologação real Meta/Asaas nem teste de entrega.
- Ainda não existe worker/outbox para respostas. Se um envio for aceito e a resposta HTTP se perder, repetir processamento pode duplicar a mensagem de texto, **não** a emissão da assinatura. Não alegar exactly-once de entrega externa.
- `PROCESSING` abandonado exige revisão; não há lease que roube trabalho nem retomada automática após crash. Criar monitoramento operacional antes de habilitar tráfego comercial.
- Não apagar recibos ou registros financeiros para "destravar". Confirmar assinatura/cliente no Asaas por ID e externalReference, conferir território e ambiente, então realizar reconciliação administrativa revisada. Uma assinatura cancelada não deve ser recriada automaticamente.
- A ordenação usa `dateCreated` do Asaas e cancelamento persistido; ainda não é um motor completo de faturamento, períodos, chargeback, inadimplência e reconciliação periódica. Uma falha após commit pode perder boas-vindas, que continuam pendentes de outbox para recuperação automática.
- Pendências da auditoria, fora desta correção: cadastro público pode alterar profissional sem comprovar posse do telefone, exclusividade/capacidade por território não tem reserva, captura/consentimento e promessas comerciais precisam revisão. **Não habilitar cobrança automática antes de resolver esses bloqueios e homologar o fluxo sandbox.**

## Testes reproduzíveis

Usar Node 24, Postgres local descartável e dependências instaladas. O teste recusa qualquer URL que não seja `127.0.0.1` com banco `pedreirosbr_safety`.

```sh
DATABASE_URL='postgresql://USUARIO@127.0.0.1:PORTA/pedreirosbr_safety' node node_modules/prisma/build/index.js migrate deploy
TEST_DATABASE_URL='postgresql://USUARIO@127.0.0.1:PORTA/pedreirosbr_safety' npm run test:safety
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

O harness limpa somente as tabelas do banco local descartável. Toda chamada HTTP é substituída por resposta simulada; endpoints inesperados falham. Não colocar segredos de produção nas variáveis do teste.

## Fontes verificadas

- [Meta: verificação de POST com assinatura e segredo do app](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/) — referência oficial histórica; não instala o SDK arquivado.
- [Asaas: eventos de assinatura](https://docs.asaas.com/docs/subscription-events) — IDs, objeto subscription, retries e deduplicação.
- [Asaas: consulta de assinaturas](https://docs.asaas.com/reference/list-subscriptions) — filtro customer e paginação.
- Next.js 16.2.12: documentação local `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` lida antes da implementação.
