# WhatsApp do PedreirosBR — Setup da Meta Cloud API

Guia completo para ativar o envio automático do resultado da calculadora
no WhatsApp de cada lead. O código já está pronto (`src/lib/whatsapp.ts`);
falta apenas criar os recursos na Meta e colar 2 variáveis no Coolify.

**Tempo estimado:** 30–40 min + aprovação do template (minutos a 24h).

---

## 1. O que você precisa em mãos

- 1 chip de celular (pré-pago serve, ~R$ 15) que **não esteja em uso no WhatsApp**
  — usado uma única vez para receber o SMS/ligação de verificação.
- Sua conta Meta/Facebook (a mesma usada para o app da Clina pode ser reutilizada).

## 2. Criar o app na Meta (se não reutilizar o da Clina)

1. Acesse https://developers.facebook.com/apps → **Criar app**
2. Tipo: **Empresa** (Business)
3. Nome: `PedreirosBR` → criar
4. No painel do app, em **Adicionar produtos**, clique em **WhatsApp → Configurar**

> Reutilizar o app da Clina é possível (o produto WhatsApp aceita vários
> números), mas um app separado isola custos e permissões. Recomendado: app novo.

## 3. Testar ANTES de ter o chip (opcional, grátis)

A Meta dá um **número de teste** que envia de verdade para até 5 números
destinatários que você cadastrar — sem chip, sem custo:

1. No produto WhatsApp → **Configuração da API** (API Setup)
2. Em "De" (From) já existe o número de teste
3. Em "Para" (To), clique em **Gerenciar lista de destinatários** e adicione
   **seu próprio celular** (vai receber um código no WhatsApp para confirmar)
4. Copie o **token temporário** (24h) e o **Phone Number ID** do número de teste
5. Configure as env vars (passo 6) com esses valores e teste o fluxo completo
   com o seu celular — só funciona enquanto o template estiver aprovado ou
   usando o template de teste `hello_world`

## 4. Registrar o número real (quando tiver o chip)

1. WhatsApp → **Configuração da API** → **Adicionar número de telefone**
2. Nome de exibição sugerido: `PedreirosBR`
3. Digite o número do chip → escolha verificação por **SMS** ou **ligação**
4. Confirme o código — pronto, o número está na Cloud API
   (o app de WhatsApp no celular **nunca mais é necessário**)

## 5. Token permanente (não expira)

O token do painel expira em 24h. Para produção, crie um token permanente:

1. Acesse https://business.facebook.com → **Configurações do negócio**
   (Business Settings) → **Usuários → Usuários de sistema**
2. **Adicionar** → nome: `pedreirosbr-api` → função: **Administrador** (ou Funcionário)
3. Clique no usuário → **Adicionar ativos** → **Aplicativos** → selecione o app
   PedreirosBR → **Controle total**
4. **Gerar novo token** → selecione o app PedreirosBR → marque as permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copie o token e guarde no 1Password (ele só aparece uma vez)

## 6. Configurar no Coolify

Coolify → projeto **PedreirosBR** → aplicação → **Environment Variables**:

| Variável | Valor |
|---|---|
| `WHATSAPP_TOKEN` | token permanente do passo 5 |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número (WhatsApp → Configuração da API, embaixo do número) |
| `WHATSAPP_TEMPLATE_NAME` | `resultado_calculadora_obra` (opcional; já é o default do código) |

Salvar → **Redeploy**. A partir daí todo lead novo recebe a mensagem na hora.

## 7. Template para aprovação (passo obrigatório)

Mensagens iniciadas pela empresa exigem template aprovado. Cadastre em:
WhatsApp → **Gerenciador de WhatsApp** → **Modelos de mensagem** → **Criar modelo**

**Exatamente assim:**

- **Nome:** `resultado_calculadora_obra`
- **Categoria:** Utilidade (Utility)
- **Idioma:** Português (BR)
- **Cabeçalho:** nenhum
- **Corpo:**

```
Olá! Sua simulação no PedreirosBR ficou pronta 🧱

*{{1}}*
Região: {{2}}

Os valores são estimativas calculadas com o CUB do seu estado + padrões de
consumo de obra. Para detalhar item a item ou simular outro serviço, acesse
pedreirosbr.com.br — é grátis.

Guarde este número: avisaremos por aqui quando houver pedreiros verificados
atendendo a sua região.
```

- **Rodapé:** `PedreirosBR • calculadoras de obra grátis`
- **Botões:** nenhum

Exemplo de preenchimento (a Meta pede amostras das variáveis):

- `{{1}}` → `Reboco de parede: R$ 1.240–R$ 1.580 (40 m²)`
- `{{2}}` → `São Paulo/SP`

Aprovação costuma sair em minutos (templates de utilidade sem marketing).

### Template 2: `convite_territorio` (fase 2 — chamar a fila de pedreiros)

Disparado automaticamente pelo organismo quando uma cidade cruza 20 leads:
os primeiros da fila (`/para-pedreiros`) recebem o convite para assumir
o território. Crie junto com o primeiro, aproveitando a mesma sessão:

- **Nome:** `convite_territorio`
- **Categoria:** Utilidade (Utility)
- **Idioma:** Português (BR)
- **Cabeçalho:** nenhum
- **Corpo:**

```
Olá {{1}}! Novidade do PedreirosBR 🧱

A fila de *{{2}}* abriu: a procura por pedreiro na cidade cruzou o limite
e o território vai ser ativado. Você está na posição *{{3}}* da fila.

Responda esta mensagem com QUERO para receber os detalhes e garantir sua
prioridade. Se não tiver interesse, é só ignorar — a vaga passa para o
próximo da fila.
```

- **Rodapé:** `PedreirosBR • você entrou na fila em pedreirosbr.com.br/para-pedreiros`
- **Botões:** nenhum

Amostras das variáveis:

- `{{1}}` → `João Silva`
- `{{2}}` → `Osasco/SP`
- `{{3}}` → `2`

> Se a Meta recusar como "conteúdo promocional", reenvie o mesmo texto com
> categoria **Marketing** — o convite funciona igual, só muda o preço por
> conversa (marketing custa um pouco mais que utilidade).

Env var opcional: `WHATSAPP_TEMPLATE_CONVITE` (default `convite_territorio`).

O envio acontece sozinho: `POST /api/lead` → organismo cruza 20 leads na
cidade → `src/lib/fila.ts::notificarFilaCidade` chama os 3 primeiros com
status "capturado" e marca quem recebeu como "contatado" (ninguém é
convidado duas vezes).

## 9. Webhook — receber o "QUERO" do pedreiro

Para o ciclo fechar (convite → resposta → interessado), cadastre o webhook:

1. No app Meta → produto **WhatsApp → Configuração → Webhook**
2. **URL de retorno de chamada:** `https://pedreirosbr.com.br/api/whatsapp/webhook`
3. **Token de verificação:** invente uma string forte (ex.: `uuidgen`) e coloque
   a mesma no Coolify como `WHATSAPP_VERIFY_TOKEN` → redeploy
4. Clique em **Verificar e salvar** (a Meta chama o GET do endpoint; se falhar,
   confira se o redeploy já subiu)
5. Em **Campos de webhook**, assine: **`messages`**

Comportamento do webhook (`src/app/api/whatsapp/webhook/route.ts`):

- Pedreiro responde **"QUERO"** → status vira `interessado` + recebe confirmação
  na hora (mensagem livre dentro da janela de 24h) + evento registrado no organismo
- Responde **"sair"/"parar"/"não"** → status `recusado`, sai da fila com mensagem educada
- Só processa quem está com status `contatado`; o resto é ignorado

**Este webhook é também a base futura para receber respostas dos CLIENTES**
(leads que responderem o resultado da calculadora).

## 8. Teste end-to-end

Com as envs configuradas e o template aprovado:

```bash
curl -X POST https://pedreirosbr.com.br/api/lead \
  -H "Content-Type: application/json" \
  -d '{"servico":"reboco","territorySlug":"sao-paulo-sp","nomeTerritorio":"São Paulo","uf":"SP","whatsapp":"11987654321","origem":"teste","resumo":"Reboco de parede: R$ 1.240–R$ 1.580 (40 m²)"}'
```

Resposta esperada: `{"ok":true,"whatsappEnviado":true,...}` — e a mensagem
chega no número informado em segundos.

## Custos

- ~1.000 conversas de utilidade/mês **grátis** por número
- Acima disso: centavos por conversa (uma "conversa" = janela de 24h por contato)
- Volume esperado do PedreirosBR no início cabe folgado na cota grátis

## Segurança / LGPD

- O lead digita o próprio número para receber o resultado — consentimento direto
- Nunca usar a lista de leads para disparos em massa (derruba a qualidade do
  número e pode banir). Mensagens futuras ("pedreiros na sua região") só para
  quem marcou a opção "quero orçamentos reais" (`descricao` no lead)
