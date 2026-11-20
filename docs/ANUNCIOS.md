# Anúncios locais — como funciona e como ligar

Espaço publicitário self-service para **lojas, distribuidores e fabricantes de materiais de construção**. Prestadores de serviço não podem anunciar: o profissional da cidade tem a fila própria.

Tudo nasce **desligado**. Sem `ADS_ENABLED=true` não há cadastro, não há box de anúncio, não há triagem e não há cobrança nova. Só o painel e o cancelamento de quem já anuncia continuam funcionando, para ninguém ficar preso a uma assinatura.

## Decisões do responsável (20/11/2026)

| Assunto | Decisão |
|---|---|
| Quem pode anunciar | Só quem vende produto: lojas, distribuidores, home centers, fabricantes |
| Cobrança | Plano mensal fixo, pelo Asaas, com nota fiscal pelo próprio Asaas |
| Preços iniciais | Cidade R$ 39, estado R$ 149, Brasil R$ 499 |
| Triagem | IA da OpenAI; sem chave, ou em caso de dúvida, revisão manual |
| Relatório | Mensal, por e-mail, com remetente da JEAFEX |

## Caminho de um anúncio

1. **Cadastro** em `/anuncie`: CNPJ, nome, e-mail, categoria, abrangência, título, texto e destino (site ou WhatsApp). Regras fixas recusam na hora o que é inválido.
2. **Confirmação do e-mail**: link válido por 24 h. Sem confirmar, o cadastro é apagado em 7 dias.
3. **Triagem**: regras fixas marcam suspeita de serviço; o resto vai para a IA. A IA só decide casos claros. Dúvida, erro ou falta de chave deixam o anúncio em revisão manual.
4. **Cobrança**: aprovado, o sistema cria a assinatura no Asaas e manda o link por e-mail.
5. **Exibição**: só depois do pagamento confirmado pelo webhook do Asaas.
6. **Relatório**: nos primeiros dias de cada mês, e-mail com exibições e cliques do mês anterior e o link do painel.
7. **Cancelamento**: pelo painel do anunciante. A exibição para na hora; a recorrência é encerrada no Asaas, sem estorno automático.

Estados do anúncio: `PENDING_EMAIL` → `PENDING_REVIEW` → `APPROVED` → `ACTIVE` · `SUSPENDED` (atraso ou estorno) · `REJECTED` · `CANCELLED`.

## Exibição

- O box aparece nas páginas de cidade e nas calculadoras, sempre com o rótulo "Anúncio" e link `rel="sponsored nofollow"`.
- Na página de uma cidade concorrem os anúncios ativos da cidade, do estado e do Brasil. O sorteio dá peso 4 ao plano da cidade, 2 ao do estado e 1 ao nacional.
- As calculadoras não têm região: nelas só aparece o plano nacional.
- O anúncio só é pedido quando o box está perto de aparecer na tela. O navegador recebe título, texto, categoria e nome da loja; o destino fica no servidor e o clique passa por `/api/anuncio/clique`, que só redireciona anúncio ativo.
- Sem anúncio para a região, o box convida a anunciar.
- Exibições e cliques são contados por dia. Robôs conhecidos e excesso por origem não entram na conta.

## Variáveis de ambiente

| Variável | Para quê | Sem ela |
|---|---|---|
| `ADS_ENABLED` | Liga o módulo | Tudo desligado |
| `ADS_PRECO_CIDADE`, `ADS_PRECO_ESTADO`, `ADS_PRECO_BRASIL` | Preço mensal em reais | 39, 149 e 499 |
| `ADS_BILLING_ENABLED` | Liga a cobrança pelo Asaas | Anúncio aprovado fica aguardando, sem aparecer |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Envio de e-mail | Cadastro recusado com aviso de indisponibilidade |
| `OPENAI_API_KEY`, `ADS_TRIAGE_MODEL` | Triagem por IA | Toda triagem é manual |
| `AFILIADOS_JSON` | Links de afiliado nas calculadoras de quantidade | Nenhum link |

`AFILIADOS_JSON` é uma lista como `[{"nome":"Loja X","url":"https://exemplo.com/busca?q={q}&tag=SEU-ID"}]`. O endereço precisa começar com `https://` e conter `{q}`, que vira o termo de busca do material (tijolo, cimento, telha…). Entram até quatro lojas. Os links aparecem depois do cálculo, nas calculadoras de quantidade que têm material definido, com o aviso de que são links de afiliado. Não depende de `ADS_ENABLED`.

## Operação

- O worker de sempre (`/api/internal/jobs`, a cada minuto) faz a triagem, cria a cobrança, monta o relatório mensal, envia os e-mails e apaga cadastros sem confirmação. Uma falha nessa parte não derruba o restante da tarefa.
- `GET /api/internal/operations` passa a listar anúncios em revisão manual (com título, texto e motivo), cobranças de anúncio em conferência e e-mails que não saíram. Em `safeguards` aparecem `adsEnabled`, `adsBillingEnabled`, `emailConfigured` e `adsTriageByAI`.
- `POST /api/internal/anuncios` com o token interno aprova ou rejeita um anúncio em revisão: `{ "id": "...", "acao": "aprovar" }` ou `{ "id": "...", "acao": "rejeitar", "motivo": "..." }`.
- O webhook do Asaas é o mesmo. Assinaturas de anúncio são reconhecidas pelo identificador gravado antes da chamada ao Asaas. Evento de uma assinatura de anúncio que existe no Asaas mas não ficou gravada aqui responde 503 até a conciliação, como já acontece com as assinaturas dos profissionais.
- Cobrança em `REVIEW`: conferir no Asaas se a assinatura com a referência `anuncio:<id>` foi criada antes de qualquer ajuste. Não apagar o registro para tentar de novo.

## Antes de ligar em produção

1. Configurar o envio de e-mail e validar o remetente (SPF e DKIM do domínio).
2. Criar a chave da OpenAI e escolher o modelo em `ADS_TRIAGE_MODEL`.
3. Configurar no Asaas a emissão automática de nota fiscal de serviço e confirmar o enquadramento com o contador.
4. Testar a cobrança no ambiente sandbox do Asaas: cadastro, pagamento, atraso e cancelamento.
5. Pedir a um advogado a revisão de `/anuncie/termos`.
6. Só então ligar `ADS_ENABLED` e, por último, `ADS_BILLING_ENABLED`.

## Limites conhecidos

- O anunciante não edita o anúncio depois de enviado: cancela e cadastra outro.
- Não há pausa voluntária, só cancelamento.
- Anúncio com mensalidade em atraso sai do ar, mas a assinatura não é cancelada sozinha: o Asaas segue cobrando até o anunciante pagar ou cancelar.
- O painel do anunciante é aberto por um link secreto enviado por e-mail, sem senha. Quem tiver o link vê os números e pode cancelar.
- Não há exclusividade por cidade nem limite de anunciantes por região: os anúncios se revezam.
- A cobrança de anúncio que falhar no meio do caminho fica em conferência e não é repetida sozinha, pelo mesmo motivo das assinaturas dos profissionais.
- A triagem por IA envia à OpenAI o nome, a categoria, o título, o texto e o destino do anúncio. Não envia CNPJ nem e-mail.
