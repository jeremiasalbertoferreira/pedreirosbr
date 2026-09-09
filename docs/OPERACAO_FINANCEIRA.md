# Renovação, atraso e conciliação

Regra confirmada pelo responsável em 09/09/2026: pausar pedidos quando o Asaas informar atraso, manter a vaga por sete dias completos a partir do primeiro aviso processado e solicitar cancelamento se ainda estiver inadimplente. Não liberar a cidade antes de SUBSCRIPTION_DELETED autenticado. Duplicatas não prorrogam o prazo.

## Controles

- Migration aditiva `0007_billing_payment_cycles`: histórico por fatura e referência ao ciclo atual, sem importar registros de sandbox. Antes de publicar, fazer backup e testar restauração. Contratos legados sem histórico exigem conciliação antes de trocar fatura/ciclo.
- `ASAAS_OVERDUE_POLICY=pause_cancel_after_7_days` define a política. Ausência impede processamento de atraso (503 e registro FAILED), não ativa uma política silenciosamente.
- `ASAAS_OVERDUE_AUTOCANCEL_ENABLED` ausente/false impede DELETE automático; ativar somente depois da homologação. Não depende da trava de novas cobranças, pois contratos existentes precisam poder ser encerrados.
- `ASAAS_BILLING_ENABLED` e `WHATSAPP_BILLING_TEMPLATES_ENABLED` continuam independentes. Implantação não equivale à ativação comercial.
- Acrescentar somente `PAYMENT_OVERDUE` aos eventos do webhook **Pedreirosbr** depois de publicar. Não modificar o webhook Clina ou a configuração global da conta real compartilhada.
- Pagamento de fatura antiga nunca substitui ciclo mais recente. Estorno/exclusão são terminais por fatura; vencimento alterado e duas faturas no mesmo ciclo exigem revisão. Não é um sistema de apuração integral de dívida: pagamento do ciclo atual não apaga dívidas antigas.
- Antes de DELETE automático, conferir fatura remota OVERDUE e vínculo de cliente/assinatura/vencimento, conferir assinatura remota e revalidar estado local. Persistir PROCESSING antes de chamadas. Timeout, resultado incerto ou estado divergente fica REVIEW, sem repetição automática.
- Uma corrida entre o pagamento no provedor e DELETE não pode ser eliminada com transação local; precisa de conciliação humana. Não usar estas verificações como promessa de atomicidade com o Asaas.

## Consulta operacional

`GET /api/internal/operations`, autenticado com o token interno no cabeçalho Authorization. Nunca colocar o token na URL, no Git ou em mensagens. Resposta `no-store`, sem CPF, telefone, texto de mensagens ou credenciais. Retorna até 50 itens por seção e avisa quando pode haver mais.

Mostra mensagens REVIEW/SENDING antigas, assinaturas REVIEW/CREATING antigas, cancelamentos ambíguos/sem confirmação, atrasos e receipts FAILED/PROCESSING antigos. Não executa reenvios, cobranças ou cancelamentos. A consulta não é um monitor com alertas externos nem uma interface completa de atendimento.

## Procedimento de conciliação

1. Identificar o registro pelo ID no diagnóstico e conferir conta, ambiente, cliente, assinatura e fatura correspondentes no Asaas. Não consultar ou modificar dados de outra integração.
2. Consultar os logs do webhook específico no Asaas em falhas de entrega. Um receipt FAILED pode ser retomado pelo mesmo evento depois de resolver a causa; DONE nunca é reexecutado.
3. Para REVIEW/PROCESSING/SUBMITTED, estabelecer se a operação externa ocorreu. Não apagar registros para destravar nem repetir POST/DELETE de resultado desconhecido. Guardar evidência e obter revisão antes de qualquer correção manual.
4. Pagamento já recebido, estorno, mudança de vencimento ou quitação concorrente ao cancelamento exigem atendimento. Este sistema não faz reembolso automático.
5. Para mensagens, diferenciar SENT de DELIVERED. Timeout não comprova falha de envio. Não mudar REVIEW para PENDING sem reconciliar o ID/resultado externo.

## Evidência e limites

Testes locais usam PostgreSQL descartável e HTTP simulado, sem mensagens reais ou movimentação financeira. Cobrem múltiplos ciclos, evento tardio, atraso, prazo, concorrência, pagamento durante verificação, timeout e retomada de receipt. A versão precisa de homologação de entrega e da nova jornada de atraso no sandbox antes da liberação comercial.

Referências: [eventos de cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas), [consulta de cobrança](https://docs.asaas.com/reference/recuperar-uma-unica-cobranca) e [remoção de assinatura](https://docs.asaas.com/reference/remover-assinatura).
