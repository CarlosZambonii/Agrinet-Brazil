# Agrinet — Documentacao Tecnica

Backend de marketplace para comercializacao de commodities agricolas. Cobre o ciclo completo de uma negociacao: publicacao de anuncio, pagamento com escrow, liberacao ao vendedor, chat em tempo real, antifraude e federacao entre nos.

---

## Pipeline Comercial Principal

```
Listing criado pelo seller
        |
        v
Buyer inicia transacao
        |
        v
Pagamento via Stripe (PaymentIntent)
        |
        v
Webhook confirma pagamento --> transaction: paid
        |
        v
Seller libera escrow
        |
        v
Wallet do seller creditada --> transaction: completed
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend HTTP | Node.js + Express |
| Banco de dados | MariaDB |
| Pagamentos | Stripe PaymentIntent API |
| Autenticacao | JWT + bcryptjs |
| Tempo real | Socket.IO |
| Cache e filas | Redis + BullMQ |
| Observabilidade | Prometheus + Grafana |
| Upload de arquivos | Multer |

---

## Arquitetura em Camadas

```
Requisicao HTTP
        |
        v
     Route (Express)
        |
        v
Middleware (Auth / Rate Limit / Sanitizacao)
        |
        v
   Service (Regra de Negocio)
        |
        v
 Repository (Acesso ao Banco)
        |
        v
      MariaDB
```

---

## Indice da Documentacao

| Documento | Conteudo |
|---|---|
| [auth.md](./auth.md) | JWT, registro, login, RBAC, trust levels, auto-unblock |
| [listings.md](./listings.md) | Anuncios, busca, geolocalizacao, imagens, stats, historico de preco |
| [transactions.md](./transactions.md) | Transacoes, rating, escrow, webhooks Stripe, idempotencia, disputas |
| [wallet.md](./wallet.md) | Wallet, ledger contabil, debito/credito atomico, auditoria financeira |
| [chat.md](./chat.md) | Conversas, mensagens, delivery status, paginacao, anexos, WebSocket, notificacoes |
| [fraud.md](./fraud.md) | Velocity de depositos e falhas, fraud score, trust levels, fraud queue, moderacao |
| [admin.md](./admin.md) | Dashboard, usuarios, listings, disputas, financeiro, fraud queue, audit log |
| [federation.md](./federation.md) | Export, import, sync job, cross-node blocking |
| [observability.md](./observability.md) | Metricas Prometheus por categoria, Grafana, alertas |
| [infra.md](./infra.md) | Rate limiting, Redis, BullMQ, sanitizacao, variaveis de ambiente |
| [broadcast.md](./broadcast.md) | Sistema de broadcast interno entre componentes |
| [schema.md](./schema.md) | Modelagem completa do banco, campos, restricoes, relacionamentos |
| [decisions.md](./decisions.md) | Decisoes arquiteturais: migracao DynamoDB, atomicidade, JWT, federacao |
| [testing.md](./testing.md) | Scripts de teste, cenarios validados, como executar |

---

## Estado dos Modulos

| Modulo | Status |
|---|---|
| Autenticacao JWT + RBAC | Concluido |
| Listings com imagens, stats e historico de preco | Concluido |
| Busca com filtros e geolocalizacao | Concluido |
| Transacoes com escrow | Concluido |
| Sistema de rating bilateral | Concluido |
| Pagamentos Stripe (create, webhook, refund) | Concluido |
| Wallet com ledger contabil e auditoria | Concluido |
| Disputas e resolucao administrativa | Concluido |
| Chat com delivery status, paginacao e anexos | Concluido |
| Notificacoes offline e WebSocket | Concluido |
| Antifraude (velocity, scoring, trust levels) | Concluido |
| Moderacao de listings | Concluido |
| Painel administrativo completo | Concluido |
| Audit log de acoes administrativas | Concluido |
| Federacao entre nos | Concluido |
| Redis + BullMQ | Concluido |
| Prometheus + Grafana | Concluido |
| Rate limiting por IP e por usuario | Concluido |
| Sanitizacao e validacao de entrada | Concluido |
| Auditoria financeira append-only | Concluido |
| Object Storage (S3/R2) | Pendente |
| Integracao PIX | Planejado |
| Listings agricolas completos | Planejado |
| Frontend | Planejado |

---

## Proximas Fases

**Fase 4 — PIX**
Integracao com PIX via Stripe para uso real no mercado brasileiro. Requer tabela dedicada e webhook seguro para eventos PIX.

**Fase 5 — Listings Agricolas Completos**
Atributos especificos por categoria, certificacoes, rastreabilidade de origem e catalogo agricola detalhado.

**Fase 6 — Frontend**
Interface de usuario e UX sobre o backend ja maduro.

**Fase 7 — Infraestrutura de Producao**
Containerizacao completa, migracao de uploads para object storage externo, deploy em ambiente real.
