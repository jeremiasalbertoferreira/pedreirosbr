# Avisos financeiros por template

Implementação local de 09/09/2026 UTC. Não confundir código testado com publicação ou entrega real.

## Contrato de envio

- `BILLING/PAID` usa `pagamento_confirmado`; `BILLING/CANCELLED` usa `assinatura_cancelada`.
- Ambos usam `pt_BR`, um componente `body` e um parâmetro de texto: cidade/UF derivada da assinatura reconciliada. Jobs antigos sem cidade continuam compatíveis. O campo `text` antigo não é enviado.
- A outbox revalida assinatura, destinatário e estado antes de enviar. Pagamento superado ou com cancelamento em processamento é bloqueado. Cancelamento exige estado `CANCELLED/CONFIRMED`.
- Não há fallback para texto livre. Falha, timeout ou sucesso HTTP sem ID deixam `REVIEW`; não repetir automaticamente. `SENT` significa aceitação com ID; `DELIVERED` depende do callback.
- Tipo de mensagem desconhecido fica em revisão, nunca é interpretado como convite.

## Trava operacional

`WHATSAPP_BILLING_TEMPLATES_ENABLED` deve permanecer ausente ou `false` até aprovação e liberação operacional. Somente a string exata `true` habilita este remetente. Variável apenas de runtime no servidor; nunca `NEXT_PUBLIC_`.

Enquanto desabilitado, os jobs financeiros permanecem `PENDING`, sem consumir tentativas e sem ocupar o lote de outros tipos de mensagem. O estado financeiro continua sendo atualizado pelos eventos autenticados, independentemente do envio.

Esta trava é separada de `ASAAS_BILLING_ENABLED`: desligar novas cobranças não deve impedir avisos de cancelamento de contratos existentes. Habilitar avisos não autoriza nem habilita novas cobranças. Não existe consulta automática à aprovação Meta em cada envio; a conferência é um requisito operacional antes da liberação. Aprovação pode mudar posteriormente, e uma rejeição de envio exige revisão.

## Liberação controlada

1. Conferir ambos os modelos na conta Meta correta: `APPROVED`, idioma `pt_BR`, textos autorizados e um parâmetro. Conferir também `novo_lead` antes de liberar o fluxo comercial completo.
2. Publicar este código com a trava desabilitada; não alterar `ASAAS_BILLING_ENABLED`.
3. Homologar em instância/banco isolados com destinatário próprio autorizado e registros fictícios claramente identificados; confirmação real de recebimento ainda é necessária. Um teste capturado não prova entrega.
4. Revisar os jobs `PENDING/REVIEW/SENDING` antes de habilitar a trava: jobs pendentes podem sair na próxima execução. Não apagar registros nem repetir envios de resultado ambíguo sem conciliação.
5. Liberar o envio somente com autorização específica e plano de atendimento. Manter bloqueios financeiros até validar ambiente Asaas real, renovação/inadimplência e reconciliação.

## Evidência local

Testes com Postgres local descartável e toda rede simulada cobrem payload exato, concorrência sem envio duplicado, callback, trava padrão fechada, ausência de bloqueio dos demais jobs, retomada, destinatário divergente, estado superado, timeout e resposta sem ID. Nenhum teste desta suíte envia WhatsApp ou faz operação financeira externa.

Formato de request conferido na [coleção oficial Meta — Send Message Template Text](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text). Usa o cliente Graph existente; não adota as versões antigas de API exibidas nos exemplos históricos da coleção.
