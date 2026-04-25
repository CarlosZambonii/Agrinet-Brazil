# Infraestrutura

Rate limiting, filas, cache, reverse proxy, SSL e variaveis de ambiente.

---

## Rate Limiting

Tres camadas de protecao:

**1. Global por IP** — `express-rate-limit`
- Janela: 1 minuto
- Limite: 20 requisicoes

**2. Por rota** — limiters especificos

| Rota | Limiter |
|---|---|
| POST /auth/register e /login | authLimiter |
| POST /messages | strictWriteLimiter |
| POST /transactions/* | strictWriteLimiter |
| POST /payments/* | strictWriteLimiter |
| /federation/* | federationLimiter |

**3. Por usuario autenticado** — `userRateLimiter`

Usa `req.user.id` como chave. Protege contra abuso por conta autenticada independente de rotacao de IP. Aplicado em messages, transactions e payments.

---

## Redis

```javascript
// lib/redis.js
const redis = new Redis(process.env.REDIS_URL)
```

Usado para:
- Base das filas BullMQ
- Cache de dados frequentes
- Presenca de usuarios (online/offline)
- Rate limits distribuidos (base para expansao)

**Teste de conexao:**
```bash
# No REPL
await redis.set('test', 'agrinet')
await redis.get('test') // 'agrinet'
```

**Limpar cache via admin:**
```bash
POST /admin/cache-clear
```

---

## Filas — BullMQ

```
jobService.enqueue('send_email', payload)
        |
        v
BullMQ adiciona job na fila Redis
        |
        v
jobWorker processa de forma assincrona
```

Arquivos: `queues/jobQueue.js`, `workers/jobWorker.js`, `services/jobService.js`

Jobs atuais: `send_email`. Preparado para notificacoes push e jobs de reconciliacao.

---

## Sanitizacao de Entrada

Middleware `sanitizeInput.js` aplicado em rotas de escrita de conteudo (`message`, `title`, `description`). Remove elementos que permitiriam XSS ou injecao de HTML.

---

## nginx — Reverse Proxy

Em producao, o nginx expoe as portas 80 e 443 e roteia o trafego internamente:

```
                   :80  → redirect para HTTPS
                          + serve /.well-known/acme-challenge/ (certbot)
Internet → nginx
                   :443 → /api/*      → api:5000   (strip /api prefix)
                          /socket.io/ → api:5000   (WebSocket upgrade)
                          /*          → frontend:3000
```

Configuracao: `infra/docker/nginx/nginx.conf`

Pontos importantes:
- `proxy_pass http://api/;` — a barra final remove o prefixo `/api` antes de repassar ao backend
- Headers `Upgrade` e `Connection` configurados para suporte a WebSocket no Socket.IO
- `client_max_body_size 50M` para uploads de imagens

---

## SSL — Let's Encrypt + Certbot

O servico `certbot` no docker-compose emite e renova certificados automaticamente.

**Primeira emissao (executar uma vez na VPS):**
```bash
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d agrinet.duckdns.org \
  --non-interactive --agree-tos -m seu@email.com
```

Apos emitir, suba o stack normalmente. O certbot container renova automaticamente a cada 12h via `certbot renew --webroot`.

Os certificados ficam em `/etc/letsencrypt/live/agrinet.duckdns.org/` na VPS (bind mount no container nginx).

---

## Deploy em VPS

### Pre-requisitos

- VPS com Docker e Docker Compose instalados
- Dominio apontando para o IP da VPS (ex: DuckDNS)
- Certificado SSL emitido (ver secao acima)
- Repositorio clonado em `/root/agrinet`

### Pipeline CI/CD

O deploy e automatico via GitHub Actions:

```
push em main (com mudancas em backend/ frontend/ infra/)
        │
        ▼
[build-and-push.yml]
  - Build das 3 imagens Docker com secrets baked
  - Push para Docker Hub (caza6367/agrinet-*)
        │
        ▼ (workflow_run: completed)
[deploy.yml]
  - SSH na VPS
  - git pull origin main
  - Escreve .env com secrets do Actions
  - docker compose down --remove-orphans
  - docker compose pull
  - docker compose up -d
  - docker image prune -f
```

### Deploy manual

```bash
ssh root@<ip-da-vps>
cd /root/agrinet
git pull origin main

# Atualizar .env se necessario
nano .env

docker compose -f infra/docker/docker-compose.yml pull
docker compose -f infra/docker/docker-compose.yml up -d
```

---

## Variaveis de Ambiente

| Variavel | Descricao |
|---|---|
| `DB_HOST` | Host do MariaDB |
| `DB_PORT` | Porta do MariaDB |
| `DB_USER` | Usuario do banco |
| `DB_PASSWORD` | Senha do banco |
| `DB_NAME` | Nome do banco |
| `JWT_SECRET` | Segredo para assinatura JWT |
| `API_KEY` | Chave de acesso da API (header X-API-Key) |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Chave publica Stripe |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key do bucket R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key do bucket R2 |
| `R2_PUBLIC_URL` | URL publica do bucket R2 |
| `REDIS_URL` | URL de conexao Redis |
| `PORT` | Porta HTTP (padrao: 5000) |
| `NODE_SELF_URL` | URL propria do no (para federacao) |
| `ALLOWED_ORIGINS` | Origens permitidas no CORS (virgula separado) |
