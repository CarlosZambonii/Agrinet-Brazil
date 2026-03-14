# Transacoes, Escrow, Pagamentos e Disputas

Este e o nucleo financeiro do Agrinet. Tudo converge aqui: estoque, pagamento, escrow e resolucao de conflitos.

---

## Fluxo Completo

```
POST /transactions/from-listing
  Valida estoque (FOR UPDATE)
  Decrementa quantity_available
  Cria transaction { status: pending, escrow_locked: 1 }
        |
        v
POST /transactions/:id/pay
  Cria PaymentIntent no Stripe
  Salva em payments { status: pending }
  Retorna client_secret
        |
        v
  [Cliente confirma no frontend]
        |
        v
  Stripe envia webhook --> transaction.status = paid
        |
        v
POST /transactions/:id/release  (seller)
  Credita wallet do seller
  transaction.status = completed
  escrow_locked = 0
```

---

## Estados da Transacao

```
pending --> paid --> completed
              |
              v
           disputed --> refunded
              |
              v
           cancelled
```

---

## Endpoints de Transacao

| Metodo | Rota | Quem | Descricao |
|---|---|---|---|
| POST | /transactions/from-listing | Buyer | Iniciar compra |
| POST | /transactions/:id/pay | Buyer | Criar pagamento Stripe |
| POST | /transactions/:id/release | Seller | Liberar escrow |
| POST | /transactions/:id/dispute | Buyer | Abrir disputa |
| POST | /transactions/rate | Buyer ou Seller | Avaliar o outro participante |
| GET | /transactions/:id | Participantes | Detalhar transacao |

```bash
# Iniciar compra
curl -X POST /transactions/from-listing \
  -H "Authorization: Bearer <token>" \
  -d '{ "listingId": "uuid", "quantity": 10 }'

# Liberar escrow
curl -X POST /transactions/uuid/release \
  -H "Authorization: Bearer <token>"
```

---

## Webhook Stripe — payment_intent.succeeded

O fluxo mais critico do sistema. Toda a operacao e atomica.

```
Evento recebido e assinatura validada
        |
        v
SELECT payments FOR UPDATE
        |
        v
Valida currency = brl e valor em centavos
        |
        v
payments.status ja e succeeded? --> sai (duplicado)
        |
        v
UPDATE payments SET status=succeeded WHERE status=pending
        |
affectedRows = 0? --> sai (conflito)
        |
        v
walletRepository.credit() na mesma conexao
        |
        v
Regra de velocity de depositos
        |
        v
COMMIT
```

**Garantias:** atomicidade entre `payments` e `wallet_history`, sem duplicacao por replay, validacao de moeda e valor.

---

## Webhook Stripe — charge.refunded

```
Calcula valor do refund
        |
        v
SELECT payments FOR UPDATE
        |
        v
Calcula total ja reembolsado em wallet_history
        |
Over-refund? --> rejeita
        |
        v
Atualiza refunded_amount
Status = partially_refunded ou refunded
        |
        v
Insere entrada negativa em wallet_history { type: refund }
COMMIT
```

---

## Escrow

O escrow garante que o seller so recebe apos confirmar a entrega.

**Condicoes para liberar:**
- `req.user.id === seller_id`
- `status = paid`
- `escrow_locked = 1`
- `flagged_for_review = 0`

O release usa update condicional. Se `affectedRows = 0`, a operacao e considerada conflito e retorna erro — protegendo contra double release mesmo em chamadas concorrentes.

---

## Sistema de Rating

Apos a conclusao de uma transacao, comprador e vendedor podem avaliar um ao outro. As avaliacoes sao independentes e protegidas contra duplicidade.

```bash
curl -X POST /transactions/rate \
  -H "Authorization: Bearer <token>" \
  -d '{
    "transactionId": "uuid",
    "rating": 4,
    "role": "buyer"
  }'
```

**Payload:**

| Campo | Tipo | Descricao |
|---|---|---|
| transactionId | string | UUID da transacao |
| rating | int | Valor entre -1 e 4 |
| role | string | `buyer` ou `seller` |

**Fluxo:**

```
Service busca a transacao
        |
        v
Valida: req.user.id e buyer_id ou seller_id
        |
        v
Valida: role bate com o usuario autenticado
        |
        v
Flag ja marcada? (buyer_rated ou seller_rated) --> 409 Rating already submitted
        |
        v
Atualiza flag correspondente:
  buyer_rated = 1  ou  seller_rated = 1
        |
        v
users.reputation_score += rating  (do usuario avaliado)
        |
        v
Ambos avaliaram? (buyer_rated = 1 AND seller_rated = 1)
        |
      Sim |
        v
rating_given = 1
```

**Flags na tabela transactions:**

| Campo | Descricao |
|---|---|
| `buyer_rated` | Comprador ja avaliou o vendedor |
| `seller_rated` | Vendedor ja avaliou o comprador |
| `rating_given` | Ambos concluiram a avaliacao |

**Regras de validacao:**
- `rating` deve ser um numero entre -1 e 4
- `buyer_id` nao pode ser igual a `seller_id`
- Cada participante so pode avaliar uma vez por transacao

---

## Webhook Stripe — payment_intent.payment_failed

```
Evento recebido
        |
        v
SELECT payments FOR UPDATE
        |
        v
status ainda e pending?
        |
      Sim |
        v
UPDATE payments SET status = failed
        |
        v
Conta falhas do usuario nos ultimos 10 minutos
        |
Count >= threshold?
        |
      Sim |              | Nao
        v               v
Bloqueia usuario    Incrementa metricas
Registra fraud_logs
{ reason: failed_payment_velocity }
Incrementa metricas
```

---

## Idempotencia

O sistema possui multiplas camadas de protecao contra duplicidade:

**No webhook `payment_intent.succeeded`:**
- Antes de creditar, verifica `payments.status`. Se ja for `succeeded`, sai silenciosamente
- O update condicional `WHERE status = 'pending'` garante que mesmo em chamadas concorrentes apenas uma sera efetivada (`affectedRows = 0` descarta as demais)

**No release do escrow:**
- Update condicional `WHERE status = 'paid' AND escrow_locked = 1` garante execucao unica

**No rating:**
- Flags `buyer_rated` e `seller_rated` impedem avaliacao duplicada com resposta `409`

**No refund:**
- `refunded_amount` acumulado e comparado ao valor total antes de processar, bloqueando over-refund

O campo `idempotency_key` em `payments` esta reservado para implementacao formal de chave de idempotencia client-side em versao futura.

---

## Disputas

**Abrir disputa (buyer):**
```bash
curl -X POST /transactions/uuid/dispute \
  -H "Authorization: Bearer <token>" \
  -d '{ "reason": "Produto nao entregue" }'
```

Ao abrir disputa: `transaction.status = disputed`, escrow permanece bloqueado.

**Resolucao administrativa:**

| Resolucao | Efeito |
|---|---|
| `refund` | Stripe refund + transaction.status = refunded |
| `release` | Credita seller + transaction.status = completed |
| `partial` | Refund parcial definido pelo admin |

Ver [admin.md](./admin.md) para endpoints de resolucao.
