# Schema do Banco de Dados

Referencia completa das tabelas. Para o DDL completo, consulte `schema.sql`.

---

## Diagrama de Relacionamentos

```
users
 ├── wallets              (1:1)
 ├── wallet_history       (1:N)
 ├── listings             (1:N)
 │    ├── listing_images       (1:N)
 │    ├── listing_stats        (1:1)
 │    └── listing_price_history (1:N)
 ├── transactions         (buyer_id / seller_id)
 │    └── disputes             (1:1)
 ├── payments             (1:N)
 ├── conversations        (buyer_id / seller_id)
 │    └── messages             (1:N)
 ├── notifications        (1:N)
 ├── fraud_logs           (1:N)
 ├── fraud_queue          (1:N)
 └── admin_actions        (via admin_id)

financial_audit_log      (append-only, sem FK obrigatoria)
node_registry            (nos federados)
```

---

## Tabelas

### users
| Campo | Tipo | Descricao |
|---|---|---|
| id | varchar(36) | UUID |
| email | varchar(255) | Unico |
| reputation_score | int | Reputacao por ratings |
| fraud_score | int | Score de risco |
| role | varchar(20) | `user` ou `admin` |
| is_blocked | tinyint(1) | Conta bloqueada |
| blocked_until | datetime | Expiracao do bloqueio |
| block_type | enum | `soft`, `hard` |
| block_level | enum | `none`, `soft`, `hard` |
| trust_level | varchar(20) | `new`, `verified`, `trusted`, `restricted` |

### wallets
| Campo | Tipo | Descricao |
|---|---|---|
| user_id | varchar(36) | PK + FK |
| balance | decimal(12,2) | Saldo atual |

### wallet_history
| Campo | Tipo | Descricao |
|---|---|---|
| id | bigint | Auto-increment |
| user_id | varchar(36) | FK |
| type | enum | `purchase`, `sale`, `deposit`, `refund` |
| amount | decimal(12,2) | Nao pode ser zero |
| note | varchar(255) | Descricao |
| tx_id | varchar(36) | FK opcional para transactions |
| payment_id | varchar(64) | ID Stripe |

**Restricoes:** unicidade em `(tx_id, type)` e `(payment_id, type)`. Trigger BEFORE INSERT valida campos obrigatorios por tipo.

### transactions
| Campo | Tipo | Descricao |
|---|---|---|
| id | varchar(36) | UUID |
| buyer_id / seller_id | varchar(36) | FK para users |
| listing_id | varchar(36) | FK para listings |
| listing_title | varchar(255) | Snapshot do titulo |
| quantity | decimal(12,2) | Quantidade |
| unit_price | decimal(12,2) | Preco unitario |
| amount | decimal(12,2) | Total |
| status | varchar(50) | `pending`, `paid`, `completed`, `cancelled`, `disputed`, `refunded` |
| escrow_locked | tinyint(1) | Fundos retidos |
| escrow_released_at | timestamp | Data de liberacao |
| fraud_score | int | Score da transacao |
| flagged_for_review | tinyint(1) | Sinalizada para revisao |

### listings
| Campo | Tipo | Descricao |
|---|---|---|
| id | varchar(36) | UUID |
| user_id | varchar(36) | FK (vendedor) |
| category | enum | `graos`, `frutas`, `gado`, `maquinas`, `outros` |
| unit | enum | `kg`, `saca`, `tonelada`, `cabeca`, `unidade` |
| status | enum | `active`, `paused`, `sold`, `deleted` |
| moderation_status | varchar(20) | `approved`, `flagged`, `removed` |
| latitude / longitude | decimal(10,7) | Coordenadas |
| origin_node | varchar(255) | No federado de origem |

### payments
| Campo | Tipo | Descricao |
|---|---|---|
| id | varchar(36) | ID do PaymentIntent Stripe |
| status | enum | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| refunded_amount | decimal(12,2) | Total reembolsado |
| idempotency_key | varchar(100) | Chave de idempotencia |
| expires_at | datetime | Expiracao |

### disputes
| Campo | Tipo | Descricao |
|---|---|---|
| transaction_id | varchar(36) | FK unica |
| opened_by | varchar(36) | FK (buyer) |
| status | varchar(50) | `open`, `resolved_refund`, `resolved_seller` |
| resolution | varchar(50) | `refund`, `release`, `partial` |

### messages
| Campo | Tipo | Descricao |
|---|---|---|
| delivery_status | enum | `sent`, `delivered`, `read` |
| attachment_url | text | URL do anexo |
| attachment_type | varchar(20) | Tipo do anexo |

### financial_audit_log
| Campo | Tipo | Descricao |
|---|---|---|
| event_type | varchar(50) | `wallet_credit`, `wallet_debit`, `escrow_release`, `payment` |
| user_id | char(36) | Usuario envolvido |
| transaction_id | char(36) | Transacao relacionada |
| payment_id | varchar(255) | Pagamento relacionado |
| amount | decimal(18,2) | Valor |
| metadata | JSON | Dados adicionais |

### node_registry
| Campo | Tipo | Descricao |
|---|---|---|
| node_url | varchar(255) | URL do no (unica) |
| active | tinyint(1) | No ativo |
| last_sync_at | timestamp | Ultima sincronizacao |
