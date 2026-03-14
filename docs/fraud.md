# Antifraude e Moderacao

Sistema de protecao contra abuso com deteccao automatica por velocity, scoring por usuario e fila de revisao manual.

---

## Velocity de Depositos

Janela de analise: **5 minutos**

| Contagem de depositos | Acao |
|---|---|
| >= 5 | Soft block |
| >= 8 | Hard block |

Ao atingir o threshold:
- `is_blocked = 1`
- `block_level = soft / hard`
- `blocked_until` definido
- Registro em `fraud_logs`
- Metrica `velocity_trigger_total` incrementada

Novas tentativas de pagamento retornam `403 Account blocked`.

---

## Velocity de Falhas de Pagamento

Janela de analise: **10 minutos**

Acima do threshold de falhas: usuario bloqueado com `reason = failed_payment_velocity` em `fraud_logs`.

---

## Fraud Score por Usuario

`fraudService.calculateFraudScore(userId)` calcula um score baseado em:

- Frequencia de transacoes recentes
- Numero de disputas abertas
- Historico de refunds e chargebacks
- Idade da conta

O score e atualizado junto com o `trust_level`. Score elevado pode acionar bloqueio automatico ou entrada na fraud queue.

---

## Transacoes Sinalizadas

Uma transacao pode receber `flagged_for_review = 1` automaticamente quando o fraud score ultrapassa o threshold.

Transacao sinalizada:
- Nao pode ter escrow liberado
- Necessita resolucao manual pelo admin

---

## Fraud Queue (Revisao Manual)

Usuarios suspeitos entram em `fraud_queue` para revisao:

| Status | Descricao |
|---|---|
| `pending` | Aguardando revisao |
| `approved` | Liberado pelo admin |
| `blocked` | Bloqueado pelo admin |
| `flagged` | Monitoramento adicional |

Ver endpoints em [admin.md](./admin.md).

---

## Moderacao de Listings

Listings podem ter `moderation_status`:

| Status | Efeito |
|---|---|
| `approved` | Aparece na busca |
| `flagged` | Sinalizado, ainda visivel para admin |
| `removed` | Removido da busca |

Usuarios podem reportar listings via `POST /listings/:id/flag`. Admins gerenciam via painel.
