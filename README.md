# Agrinet — Marketplace Agrícola Descentralizado

Plataforma open source de comércio agrícola para o Brasil. Conecta produtores, compradores e prestadores de serviço em um marketplace seguro com pagamentos em escrow, chat em tempo real, antifraude e sincronização federada entre nós.

> Derivado do projeto original [NTARI-RAND/Agrinet](https://github.com/NTARI-RAND/Agrinet) — adaptado para o mercado brasileiro por [Carlos Zamboni](https://github.com/CarlosZambonii).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + Shadcn/ui + Framer Motion |
| Backend | Node.js + Express |
| Banco de dados | MariaDB |
| Cache e filas | Redis + BullMQ |
| Pagamentos | Stripe (PaymentIntent + escrow) |
| Upload de imagens | Cloudflare R2 |
| Tempo real | Socket.IO |
| Observabilidade | Prometheus + Grafana |
| Autenticação | JWT + bcryptjs |
| Infraestrutura | Docker + Docker Compose |
| CI/CD | GitHub Actions → Docker Hub |

---

## Funcionalidades

- **Marketplace** — listagens de grãos, frutas, gado, máquinas e outros com filtros, busca e ordenação
- **Pagamentos com escrow** — Stripe PaymentIntent, liberação pelo vendedor, reembolso automático
- **Wallet** — saldo, histórico de créditos/débitos, ledger contábil com auditoria
- **Chat em tempo real** — Socket.IO com fallback de polling, typing indicator, notificações
- **Antifraude** — velocity check, fraud score, trust levels, fila de moderação
- **Federação** — sincronização de anúncios e bloqueios entre nós da rede
- **Painel Admin** — stats, moderação de listings, disputas, audit log
- **Upload de imagens** — drag-and-drop, armazenamento no Cloudflare R2
- **Observabilidade** — métricas Prometheus, dashboards Grafana, alertas configurados

---

## Rodar com Docker (recomendado)

```bash
git clone https://github.com/CarlosZambonii/Agrinet-Brazil
cd Agrinet-Brazil

# Configurar variáveis de ambiente
cp backend/.env.example .env
# Editar .env com JWT_SECRET, STRIPE_*, R2_*, API_KEY

# Subir o stack completo
cd infra/docker
docker compose up -d
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:5000 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

Para subir também o monitoramento:
```bash
docker compose --profile monitoring up -d
```

---

## Rodar localmente (desenvolvimento)

**Pré-requisitos:** Node.js 20+, MariaDB, Redis

```bash
# Backend
cd backend
cp .env.example .env        # preencher variáveis
npm install
mariadb -u root -p < ../schema.sql
node server.js              # sobe em http://localhost:5000

# Frontend (outro terminal)
cd frontend
npm install
# criar frontend/.env.local:
# NEXT_PUBLIC_API_URL=http://localhost:5000
# NEXT_PUBLIC_API_KEY=<valor do API_KEY no .env>
npm run dev                 # sobe em http://localhost:3000
```

---

## Variáveis de Ambiente

Todas documentadas em [`backend/.env.example`](./backend/.env.example). As essenciais:

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `API_KEY` | Chave de acesso da API (header `X-API-Key`) |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key do bucket R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key do bucket R2 |
| `R2_PUBLIC_URL` | URL pública do bucket (ex: `https://pub-xxx.r2.dev`) |

---

## CI/CD

A cada push na branch `main`, o GitHub Actions builda e publica as imagens no Docker Hub automaticamente:

- `caza6367/agrinet-api:latest`
- `caza6367/agrinet-frontend:latest`
- `caza6367/agrinet-federation-sync:latest`

**Secrets necessários no repositório** (`Settings → Secrets → Actions`):

| Secret | Descrição |
|---|---|
| `DOCKERHUB_USERNAME` | Usuário do Docker Hub |
| `DOCKERHUB_TOKEN` | Token de acesso do Docker Hub |
| `NEXT_PUBLIC_API_KEY` | Chave da API para o frontend |
| `NEXT_PUBLIC_API_URL` | URL pública da API (opcional) |

---

## Estrutura do Projeto

```
Agrinet-Brazil/
├── backend/                 # API Express + workers
│   ├── routes/              # Rotas HTTP (auth, listings, wallet, chat...)
│   ├── middleware/          # Auth JWT, rate limit, upload
│   ├── lib/                 # DB pool, Redis, métricas, R2 storage
│   ├── migrations/          # Knex migrations
│   ├── workers/             # Job workers (BullMQ)
│   ├── jobs/                # Jobs agendados (expiração de pagamentos)
│   └── Dockerfile
├── frontend/                # Next.js 14 App Router
│   ├── app/                 # Páginas: /, /marketplace, /chat, /perfil, /admin
│   ├── components/          # ListingCard, NewListingModal, Nav, etc.
│   ├── lib/                 # api.js, notifications.js, hooks
│   └── Dockerfile
├── infra/
│   ├── docker/              # docker-compose.yml
│   └── backups/             # Scripts de backup automático do DB
├── monitoring/              # prometheus.yml, alerts.yml, Grafana dashboards
├── docs/                    # Documentação técnica detalhada
├── schema.sql               # Schema completo do banco de dados
└── .github/workflows/       # GitHub Actions CI/CD
```

---

## Testes

```bash
cd backend
npm test          # 24 testes unitários (Jest)
```

Suites cobertas: sanitização de input, JWT, authMiddleware, fraudService.

---

## Documentação Técnica

Documentação completa em [`docs/`](./docs/README.md):

| Documento | Conteúdo |
|---|---|
| [auth.md](./docs/auth.md) | JWT, registro, login, RBAC, trust levels |
| [listings.md](./docs/listings.md) | Anúncios, busca, filtros, imagens, stats |
| [transactions.md](./docs/transactions.md) | Escrow, Stripe webhooks, disputas, rating |
| [wallet.md](./docs/wallet.md) | Saldo, ledger contábil, auditoria financeira |
| [chat.md](./docs/chat.md) | Mensagens, Socket.IO, notificações |
| [fraud.md](./docs/fraud.md) | Velocity check, fraud score, moderação |
| [admin.md](./docs/admin.md) | Painel admin, audit log, disputas |
| [federation.md](./docs/federation.md) | Sincronização entre nós da rede |
| [observability.md](./docs/observability.md) | Prometheus, Grafana, alertas |
| [schema.md](./docs/schema.md) | Modelagem completa do banco |
| [testing.md](./docs/testing.md) | Como testar, cenários validados |
| [decisions.md](./docs/decisions.md) | Decisões arquiteturais e contexto |

---

## Maintainer

**Carlos Zamboni**
- GitHub: [github.com/CarlosZambonii](https://github.com/CarlosZambonii)
- LinkedIn: [linkedin.com/in/carloszambonii](https://www.linkedin.com/in/carloszambonii/)

---

## Licença

[AGPL-3.0](./LICENSE) — Código aberto, deve permanecer assim.
