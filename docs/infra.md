# Infraestrutura

Rate limiting, filas, cache e variaveis de ambiente.

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

## Variaveis de Ambiente

| Variavel | Descricao |
|---|---|
| `DB_HOST` | Host do MariaDB |
| `DB_PORT` | Porta do MariaDB |
| `DB_USER` | Usuario do banco |
| `DB_PASSWORD` | Senha do banco |
| `DB_NAME` | Nome do banco |
| `JWT_SECRET` | Segredo para assinatura JWT |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe |
| `REDIS_URL` | URL de conexao Redis |
| `PORT` | Porta HTTP (padrao: 5000) |
| `NODE_SELF_URL` | URL propria do no (para federacao) |
