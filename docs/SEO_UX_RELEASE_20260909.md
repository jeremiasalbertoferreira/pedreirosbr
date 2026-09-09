# Primeiro pacote de SEO, confiança e experiência

Implementado em 09/09/2026 após auditoria de site e Search Console.

- Preservadas as 851 URLs municipais e os motores de cálculo.
- Promessas públicas alinhadas a fatores estaduais, sem alegação de cotação municipal ou atualização por orçamentos reais.
- Metodologia pública com fórmulas, parâmetros e limitações efetivas, sem falsa homologação técnica.
- Canonicals próprios em páginas estáticas e redirecionamento 308 de www em páginas públicas, preservando caminho/query. APIs e assets internos não entram nessa regra.
- Retirada de FAQPage não correspondente a perguntas/respostas visíveis. Página municipal usa WebPage, não Service com a plataforma como prestadora local.
- Sitemap inclui metodologia e páginas institucionais; lastModified somente quando há data editorial conhecida.
- Início mais compacto, navegação profissional visível no celular, rótulos persistentes, instrução para consentimento, avisos acessíveis e erros anunciados.
- As regras de consentimento, R$ 97/mês, exclusividade e política de atraso não foram alteradas. Sem dependências, migrations ou mudanças em código financeiro/API.

Validação pré-publicação: 8 testes SEO/render; 66 testes de segurança em PostgreSQL descartável local com Meta/Asaas simulados; ESLint; build Next/Turbopack (879 páginas); redirects HTTP locais; inspeção no navegador em larguras 320, 390 e 1365.

O primeiro build local encontrou cache de processo inválido; o cache .next foi movido para pasta temporária recuperável e um build limpo passou. O primeiro teste financeiro usou usuário incorreto no banco local; corrigido para o proprietário do banco, todos os testes passaram. Nenhuma credencial de produção foi usada nessas execuções.

Pendências do plano maior: pesquisa/revisão técnica dos coeficientes, enriquecimento das páginas prioritárias, navegação por estados/regiões, imagens de compartilhamento, atribuição de receita, validação em telefone físico e acompanhamento de busca/IA. HTTP→HTTPS é controlado pelo proxy da VPS e não foi alterado por esta versão; a consolidação www→domínio principal ocorre no aplicativo. Não promete melhoria de posição nem citação por IA.

Publicação: push normal ao main após comparar o pai remoto, seguido do deploy automático existente. Confirmar SHA/saúde, flags financeiras preservadas, páginas públicas e worker; revogar a chave temporária após a validação. Não disparar cobranças ou mensagens reais para testar estas mudanças.
