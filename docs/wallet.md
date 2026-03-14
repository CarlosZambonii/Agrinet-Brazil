# Wallet

Cada usuario tem uma wallet interna. Todo movimento financeiro e registrado em `wallet_history`, que funciona como ledger contabil append-only.

---

## Operacao de Credito

```
SELECT wallets FOR UPDATE
        |
        v
UPDATE wallets SET balance = balance + ?
        |
        v
INSERT wallet_history { type, amount, note, tx_id ou payment_id }
        |
        v
INSERT financial_audit_log
```

## Operacao de Debito

O debito tem dupla protecao contra inconsistencia:

```
SELECT wallets FOR UPDATE
        |
        v
balance < amount? --> erro rapido
        |
        v
UPDATE wallets SET balance = balance - ?
WHERE balance >= ?          <-- guarda atomica no banco
        |
affectedRows = 0? --> erro (race condition capturada)
        |
        v
INSERT wallet_history
INSERT financial_audit_log
```

---

## Tipos de Movimentacao

| Tipo | Quando ocorre | Exige |
|---|---|---|
| `deposit` | Pagamento Stripe confirmado | `payment_id` |
| `purchase` | Debito do buyer na transacao | `tx_id` |
| `sale` | Credito do seller no release do escrow | `tx_id` |
| `refund` | Reembolso processado | `tx_id` ou `payment_id` |

Essas regras sao validadas por uma trigger `BEFORE INSERT` no banco, bloqueando entradas invalidas mesmo em caso de bug na aplicacao.

---

## Auditoria Financeira

Toda operacao critica gera um registro em `financial_audit_log`:

| Evento | Trigger |
|---|---|
| `wallet_credit` | Qualquer credito |
| `wallet_debit` | Qualquer debito |
| `escrow_release` | Liberacao do escrow |
| `payment` | Confirmacao de pagamento via webhook |

A tabela e append-only e serve como trilha de auditoria independente do `wallet_history`.

---

## Atomicidade

`walletRepository.credit()` e `walletRepository.debit()` aceitam uma conexao externa opcional. Isso permite que sejam executados dentro da mesma transacao SQL do fluxo chamador (ex: release de escrow), garantindo que credito e atualizacao de status ocorram atomicamente ou nao ocorram.
