# 🌱 Agrinet — Relatório de Infraestrutura

Roadmap de infra completo implementado em 7 fases. Nenhuma feature de produto foi alterada.

---

## ✅ Fase 1 — Docker

- Criado `backend/.dockerignore` (exclui `node_modules`, `.env`, `uploads`, logs)
- Dockerfile da API reescrito em **multi-stage** com `node:20-alpine` — imagem menor e sem o bug do `npm install` duplicado no CMD
- Criado `Dockerfile.worker` separado para o federation sync
- `docker-compose.yml` atualizado:
  - Healthcheck no MariaDB e Redis
  - `depends_on: condition: service_healthy` em todos os serviços
  - `profiles: [monitoring]` no Prometheus e Grafana — sobem separado com `--profile monitoring`

---

## ✅ Fase 2 — Registry (Docker Hub)

- Repositórios criados: `caza6367/agrinet-api` e `caza6367/agrinet-federation-sync`
- `scripts/build.sh` — build padronizado com 3 tags por imagem: `latest`, `vX.X.X`, `sha`
- `scripts/push.sh` — push para Docker Hub com as mesmas tags
- `docker-compose.yml` atualizado para usar `image:` em vez de `build:`

---

## ✅ Fase 3 — Banco de Dados

- `knex` instalado e `knexfile.js` configurado
- `backend/migrations/20240001_initial_schema.js` — todo o `schema.sql` convertido em migration, respeitando ordem de FKs e incluindo o trigger `wallet_history_validate`
- `backend/seeds/01_initial.js` — seed com usuário admin e usuário padrão para desenvolvimento
- `server.js` — `knex.migrate.latest()` roda automaticamente antes do `server.listen()` a cada startup
- `infra/backups/backup.sh` — mysqldump com gzip, retém backups dos últimos 7 dias
- Serviço `backup` adicionado no compose — roda diariamente (a cada 86400s)

---

## ✅ Fase 4 — Redis e Filas

- **Redis persistence** ativado no compose: `--appendonly yes --appendfsync everysec`
- **Rate limiting migrado para Redis**: os 3 limiters (`globalLimiter`, `limiter`, `paymentLimiter`) agora usam `RedisStore` — funciona corretamente em múltiplas instâncias
- **Antifraud throttling**: `fraudService.js` agora faz check rápido de velocidade via Redis `INCR + EXPIRE` (janela 10min) antes de bater no banco
- `queues/jobQueue.js` — corrigido IP hardcoded `127.0.0.1` para usar `REDIS_HOST` via env
- `workers/jobWorker.js` — corrigido IP hardcoded, adicionado `dotenv`, logs de `completed` e `failed`
- Serviço `job-worker` adicionado no compose usando a imagem da API com override de comando

---

## ✅ Fase 5 — Observabilidade

- **Grafana provisioning automático**: ao subir o stack, Grafana já conecta no Prometheus e carrega os dashboards sem configuração manual
- **Dashboard de Transações** — 12 painéis: transações/min, pagamentos, listings ativos, usuários ativos, escrow, Stripe, wallet, refunds, mensagens, buscas
- **Dashboard de Fraude** — 9 painéis: velocity triggers, bloqueios, fraudes flagged/blocked, disputes, eventos Stripe, federation sync, ratings
- **Alertas Prometheus** expandidos de 4 para 9:
  - `APIDown`, `HighPaymentFailureRate`, `StripeMismatchSpike`
  - `FraudSpike`, `HighBlockRate`
  - `EscrowReleaseFailures`, `DisputeRateHigh`
  - `WalletDebitFailureSpike`, `FederationSyncDown`

---

## ✅ Fase 6 — Storage (Cloudflare R2)

- `@aws-sdk/client-s3` instalado
- `backend/lib/storage.js` criado — cliente R2 via S3-compat com função `uploadFile(buffer, mimetype, folder)`
- `middleware/uploadMiddleware.js` — trocado `diskStorage` por `memoryStorage` (arquivo vai para buffer, não para disco)
- `routes/messageRoutes.js` — uploads de anexos de chat agora vão para R2 (`chat/`)
- `routes/agrotourismRoutes.js` — uploads de imagens agora vão para R2 (`agrotourism/`) com upload paralelo
- `server.js` — removida rota `app.use('/uploads', static)`
- Volume local de uploads removido do compose
- `.env.example` atualizado com as 5 variáveis de R2

> ⚠️ Pendente: configurar bucket e credenciais R2 no Cloudflare (ver CHECKLIST.md)

---

## ✅ Fase 7 — CI/CD (GitHub Actions)

- **ESLint** instalado e configurado (`backend/.eslintrc.json`)
- Script `npm run lint` e `npm test` corrigidos no `package.json`
- **`ci.yml`** — roda em todo push e PR na `main`:
  1. Setup Node 20 com cache npm
  2. `npm ci`
  3. Lint
  4. Testes
- **`build-and-push.yml`** — roda em push na `main` e em tags `v*.*.*`:
  1. Login no Docker Hub
  2. Build com cache GitHub Actions
  3. Push das duas imagens com tags `latest`, `vX.X.X` e `sha`

> ⚠️ Pendente: adicionar secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` no GitHub (ver CHECKLIST.md)

---

## 📋 Pendências (ação humana necessária)

| # | O que | Onde |
|---|-------|------|
| 1 | Criar Access Token no Docker Hub e adicionar secrets no GitHub | hub.docker.com + github.com/repo/settings |
| 2 | Criar bucket `agrinet-uploads` no Cloudflare R2 e gerar credenciais | cloudflare.com/r2 |
| 3 | Adicionar vars de R2 no `.env` | `/home/carlos/Agrinet/.env` |
| 4 | Rodar `./scripts/build.sh` + `./scripts/push.sh` antes do primeiro deploy | Terminal |
| 5 | `docker compose down -v && docker compose up -d` no primeiro deploy | Terminal |

Detalhes completos em `CHECKLIST.md` na raiz do projeto.

---

## 🔍 Problemas pré-existentes identificados (não alterados)

- Socket.IO com `cors: "*"` — contradiz o CORS restrito do Express
- `routes/agrotourismRoutes.js` usa Mongoose em projeto SQL — rota quebrada se chamada
- Socket.IO sem autenticação — qualquer cliente pode conectar

---

*Implementado por Carlos Zamboni · Agrinet Infra Roadmap v1*
