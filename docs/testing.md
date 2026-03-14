# Testes e Validacao

Scripts de automacao e cenarios validados durante o desenvolvimento. Servem como suite de regressao e referencia de comportamento esperado do sistema.

---

## Scripts Disponiveis

| Script | Descricao |
|---|---|
| `full-test.sh` | Fluxo completo: register, login, transaction, rating, escrow |
| `admin-test.sh` | Fluxo administrativo: login admin, verificacao de stats |
| `test-escrow-flow.sh` | Pipeline financeiro: create, pay, webhook, release, metricas |
| `master_stripe_test.sh` | Suite completa Stripe: deposit, idempotencia, refund, velocity |
| `01-stripe-deposit-smoke.sh` | Deposito basico via Stripe CLI |
| `02-stripe-idempotency.sh` | Replay do mesmo evento webhook |
| `03-stripe-refund-test.sh` | Refund parcial e total com over-refund |
| `04-failed-payment-velocity.sh` | Velocity de falhas de pagamento |
| `05-hard-velocity-test.sh` | Bloqueio por hard velocity de depositos |
| `06-rate-limit-test.sh` | Flood de requests para acionar limiter |
| `velocity-test.sh` | Velocity de depositos (soft e hard block) |
| `security-test.sh` | Validacoes de seguranca e autorizacao |
| `enterprise-test.sh` | Fluxo de uso empresarial |
| `test-listing-image.sh` | Upload de imagem em listing |
| `test-create-listing.js` | Criacao de listing via Node |

---

## Cenarios Validados

### Fluxo Financeiro Principal

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| Deposito via Stripe + credito na wallet | `payments.status = succeeded`, entrada em `wallet_history` | Passou |
| Replay do mesmo webhook | Segundo evento ignorado, `deposit_count = 1` | Passou |
| Refund parcial | `refunded_amount` incrementado, status `partially_refunded` | Passou |
| Refund total | Status `refunded`, `refunded_amount = amount` | Passou |
| Tentativa de over-refund | Rejeitado com erro antes de processar | Passou |
| Release de escrow duplo | Segunda chamada bloqueada por `affectedRows = 0` | Passou |

### Antifraude

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| 5 depositos em 5 min (soft block) | `is_blocked = 1`, novas tentativas retornam 403 | Passou |
| 8 depositos em 5 min (hard block) | `block_level = hard` | Passou |
| 5 falhas de pagamento em 10 min | Usuario bloqueado, `fraud_logs` registrado | Passou |
| Auto-unblock apos expiracao | Bloqueio limpo no proximo acesso | Passou |

### Autorizacao

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| Token de outro usuario tentando rate | 403 ou 409 dependendo do estado | Passou |
| Buyer tentando release de escrow | Rejeitado (so seller pode) | Passou |
| Usuario comum acessando rota admin | 403 Forbidden | Passou |
| Compra de listing com origin_node | Bloqueado, retorna `origin_node` | Passou |

### Rate Limiting

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| Flood de requests por IP | 429 Too Many Requests | Passou |
| Flood por usuario autenticado | 429 apos limite do `userRateLimiter` | Passou |
| Usuario bloqueado tentando criar pagamento | 403 Account blocked (antes do rate limit) | Passou |

### Federacao

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| Sync entre dois nos locais (5000 e 5001) | Dados importados, `last_sync_at` atualizado | Passou |
| Export com parametro `since` | Retorna apenas registros atualizados apos a data | Passou |
| Import de timestamp ISO | Convertido para formato MariaDB sem erro | Passou |

### Chat

| Cenario | Comportamento esperado | Resultado |
|---|---|---|
| Mensagem com anexo (PNG) | `attachment_url` e `attachment_type` persistidos | Passou |
| Busca paginada por cursor | Retorna `messages` e `nextCursor` | Passou |
| Marcar mensagens como lidas | `delivery_status = read` para mensagens do outro participante | Passou |

---

## Como Executar

```bash
# Pre-requisito: servidor rodando em localhost:5000
# Pre-requisito: Stripe CLI instalado (para testes de webhook)

# Fluxo completo
chmod +x scripts/full-test.sh
./scripts/full-test.sh

# Suite Stripe completa
./scripts/master_stripe_test.sh

# Escutar webhooks localmente (em terminal separado)
stripe listen --forward-to localhost:5000/payments/webhook
```

Os scripts usam `curl` para chamadas HTTP e consultam o banco diretamente via `mariadb` CLI para verificar estado apos cada operacao.

---

## Validacao de Metricas

Apos executar o fluxo, verificar em `GET /metrics`:

```bash
curl localhost:5000/metrics | grep agrinet_
curl localhost:5000/metrics | grep stripe_
```

Os contadores devem refletir o numero de operacoes executadas nos scripts.
