# Painel Administrativo

Todos os endpoints abaixo exigem `role = admin` no token JWT.

---

## Dashboard

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/stats | Totais gerais do sistema |
| GET | /admin/activity | Atividade recente |
| GET | /admin/health | Status operacional |

**Resposta de `/admin/stats`:**
```json
{
  "users_total": 142,
  "active_users": 138,
  "listings_active": 74,
  "transactions_today": 12,
  "volume_today": 8450.00,
  "disputes_open": 2
}
```

---

## Usuarios

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/users | Listar com fraud_score e trust_level |
| GET | /admin/users/:id | Detalhar usuario |
| POST | /admin/users/:id/block | Bloquear conta |
| POST | /admin/users/:id/unblock | Desbloquear conta |

---

## Listings

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/listings | Listar todos |
| POST | /admin/listings/:id/pause | Pausar |
| POST | /admin/listings/:id/remove | Remover (moderation_status = removed) |
| POST | /admin/listings/:id/restore | Restaurar |

---

## Disputas

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/disputes | Listar disputas abertas |
| GET | /admin/disputes/:id | Detalhar disputa |
| POST | /admin/disputes/:id/resolve | Resolver |

```bash
curl -X POST /admin/disputes/uuid/resolve \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "resolution": "refund" }'
```

Resolucoes: `refund`, `release`, `partial`.

---

## Financeiro

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/payments | Listar pagamentos |
| GET | /admin/refunds | Listar reembolsos |
| GET | /admin/wallets | Visao geral de saldos |

---

## Fila de Fraude

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/fraud-queue | Listar casos pendentes |
| POST | /admin/fraud-queue/:id/approve | Aprovar usuario |
| POST | /admin/fraud-queue/:id/block | Bloquear usuario |
| POST | /admin/fraud-queue/:id/flag | Sinalizar |

---

## Sistema

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /admin/metrics | Metricas Prometheus |
| POST | /admin/reindex | Disparar reindexacao |
| POST | /admin/cache-clear | Limpar cache Redis |

---

## Audit Log

Toda acao mutante do admin e registrada automaticamente em `admin_actions`:

- Bloqueio e desbloqueio de usuarios
- Acoes na fraud queue
- Moderacao de listings
- Resolucao de disputas

Campos: `admin_id`, `action`, `target_type`, `target_id`, `meta`, `created_at`.
