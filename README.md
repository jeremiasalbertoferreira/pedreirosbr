# PedreirosBR

Máquina autônoma de descoberta local para o mercado de obra: calculadoras grátis,
gerador de orçamento em PDF viral e SEO programático geográfico — construído como
**organismo vivo**: cada uso alimenta contadores por território, páginas novas nascem
sozinhas quando há substância real, e a monetização por leads desperta território a
território quando a demanda é comprovada.

Blueprint estratégico: vault Obsidian "Minha Mente" →
`1-Projetos/PedreirosBR — Blueprint do Projeto Parqueado (21-jul-2026)` +
`Revisão Crítica (29-jul-2026)`.

## DNA multi-profissão

Um ofício é **dado, não código** (`src/oficios/`). Hoje roda `pedreiro`;
para nascer `eletricistasbr`, `encanadoresbr`: novo arquivo de dados + registro
no index + novo deploy com `OFICIO_SLUG` correspondente. O motor é o mesmo.

## Estrutura

```
src/oficios/          registry de ofícios (DNA multi-profissão)
src/lib/calc/         motores de cálculo puros (reboco, muro, pintura, telhado, banheiro)
src/lib/data/         UFs (CUB/multiplicadores) + cidades seed (IBGE)
src/lib/organismo.ts  sistema nervoso: eventos → contadores → limiares
src/app/calculadoras/ calculadoras (cliente + profissional)
src/app/orcamento/    gerador de orçamento PDF viral (loop 5.2)
src/app/pedreiro-em/  páginas programáticas por cidade (Camada 1)
src/app/quanto-cobrar/ SEO de dupla intenção (loop 5.1)
prisma/schema.prisma  Territory, TerritoryEvent, Lead, Professional (DNA fase 2)
```

## O organismo (limiares)

| Evento | Alimenta | Limiar | Efeito |
|---|---|---|---|
| cálculo, busca, lead, orçamento PDF | contadores por território | 10 eventos | página de bairro nasce (entra no sitemap) |
| leads por território | prova de demanda | 20 leads | fase 2 desperta: oferta de assinatura a profissionais da região |

## Rodar local

```bash
npm install
npx prisma migrate dev   # precisa de DATABASE_URL (Postgres)
npm run dev
```

## Deploy (Coolify)

1. Provisionar Postgres no Coolify e injetar `DATABASE_URL`.
2. App: repositório GitHub, build pack **Dockerfile**, porta 3000.
3. Domínio: `pedreirosbr.com.br` (SSL automático via Coolify/Traefik).
4. Monetização: preencher `NEXT_PUBLIC_ADSENSE_*` quando a conta for aprovada
   (site nasce limpo de propósito — melhora aprovação).

## Fases de monetização

1. **Ativa**: AdSense + afiliados (slots prontos, ligam por env).
2. **Dormindo (programada)**: assinatura de leads por território — desperta sozinha
   quando os contadores provam demanda. Roteamento WhatsApp + PIX recorrente
   plugam em cima de `Lead`, `Professional` e `Territory.assinaturaAtiva`.
