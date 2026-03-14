# Observabilidade

Metricas de processo e de dominio expostas via Prometheus e visualizadas no Grafana.

---

## Endpoint

```
GET /metrics
```

---

## Metricas por Categoria

**Transacoes e Escrow**

| Metrica | Descricao |
|---|---|
| `agrinet_transactions_created_total` | Transacoes criadas |
| `agrinet_escrow_release_success_total` | Escrows liberados |
| `agrinet_escrow_release_conflict_total` | Conflitos de release |
| `agrinet_wallet_credit_total` | Creditos na wallet |
| `agrinet_wallet_debit_fail_total` | Falhas de debito |

**Stripe**

| Metrica | Descricao |
|---|---|
| `stripe_payment_succeeded_total` | Pagamentos confirmados |
| `stripe_payment_failed_total` | Pagamentos falhos |
| `stripe_refund_total` | Reembolsos |
| `stripe_webhook_duplicate_total` | Eventos duplicados |
| `stripe_amount_mismatch_total` | Inconsistencias de valor |

**Antifraude**

| Metrica | Descricao |
|---|---|
| `velocity_trigger_total` | Disparos de regra de velocity |
| `user_block_total` | Usuarios bloqueados |
| `failed_payment_total` | Falhas por velocity |
| `agrinet_fraud_flag_total` | Transacoes sinalizadas |
| `agrinet_fraud_block_total` | Bloqueios por fraude |

**Chat e Busca**

| Metrica | Descricao |
|---|---|
| `messages_sent_total` | Mensagens enviadas |
| `conversations_created_total` | Conversas criadas |
| `search_queries_total` | Buscas realizadas |
| `listings_viewed_total` | Listings visualizados |

**Disputas**

| Metrica | Descricao |
|---|---|
| `disputes_open_total` | Disputas abertas |
| `disputes_resolved_total` | Disputas resolvidas |

**Federacao**

| Metrica | Descricao |
|---|---|
| `agrinet_federation_sync_success_total` | Syncs bem-sucedidos |
| `agrinet_federation_sync_fail_total` | Syncs com falha |

---

## Dashboard Operacional (Gauges)

Atualizados periodicamente via consulta ao banco:

- `payments_total`
- `disputes_open_total`
- `active_listings_total`
- `active_users_total`

---

## Alertas

Regras em `monitoring/alerts.yml` cobrindo:

- Taxa elevada de falha de pagamento
- Pico de eventos de fraude
- Conflitos de escrow acima do esperado
- Pico de disputas abertas

---

## Infraestrutura de Monitoramento

```yaml
# monitoring/docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    # coleta de localhost:5000/metrics

  grafana:
    image: grafana/grafana
    # visualizacao dos dados do Prometheus
```
