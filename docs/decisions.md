# Decisoes Arquiteturais

Registro das principais decisoes tecnicas tomadas durante o desenvolvimento, com contexto e motivacao. Util para entender por que o sistema foi construido da forma que esta.

---

## ADR-001 — Migracao de DynamoDB para MariaDB

**Status:** Concluida

**Contexto:**

O sistema foi inicialmente construido usando AWS DynamoDB como banco principal, acessado via `dynamodbClient` e `docClient` da AWS SDK.

**Problema:**

- Dependencia de infraestrutura AWS gerava custo operacional e complexidade de deploy
- Consultas complexas (joins, agregacoes, filtros combinados) eram custosas ou inviáveis no modelo de DynamoDB
- Controle transacional (ACID) era limitado
- Execucao local completa era dificil
- Auditoria e rastreabilidade financeira eram complicadas de implementar

**Decisao:**

Migracao completa para MariaDB.

**Consequencias positivas:**

- Execucao local sem dependencia de cloud
- Controle transacional ACID completo (essencial para escrow e wallet)
- Queries complexas com joins nativos
- Foreign keys garantindo integridade referencial
- Triggers para validacao de regras no banco (ex: `wallet_history_validate`)
- Deploy simplificado

**Processo de migracao:**

```
npm uninstall aws-sdk
        |
        v
Remocao de dynamodbClient.js
        |
        v
Migracao de repositories (um a um)
        |
        v
Migracao do NodeRegistry
        |
        v
Migracao do federation sync
        |
        v
Substituicao de docClient por SQL queries
        |
        v
Remocao de imports residuais
```

**Problemas encontrados durante a migracao:**

| Problema | Causa | Solucao |
|---|---|---|
| Transaction not found | Repository ainda usando Dynamo | Migrar para SQL repository |
| Rating already submitted | Checagem incorreta de flags | Implementar markBuyerRated/markSellerRated |
| Unknown column reputationScore | Diferenca de naming Dynamo vs SQL | Usar reputation_score (snake_case) |
| Escrow release inconsistente | Status nao atualizado corretamente | Update final apos rating |
| Imports residuais quebrando boot | require('../lib/dynamodbClient') em arquivos antigos | Remocao manual arquivo a arquivo |

**Padronizacao de naming resultante:**

| Antes (Dynamo) | Depois (SQL) |
|---|---|
| buyerRated | buyer_rated |
| sellerRated | seller_rated |
| reputationScore | reputation_score |

---

## ADR-002 — Atomicidade via Conexao Compartilhada

**Status:** Implementada

**Contexto:**

Operacoes criticas como release de escrow precisam atualizar multiplas tabelas (`transactions`, `wallets`, `wallet_history`, `financial_audit_log`) de forma atomica.

**Problema:**

Se cada repository abrisse sua propria conexao e transacao, uma falha parcial poderia deixar o banco em estado inconsistente — por exemplo, escrow liberado mas wallet nao creditada.

**Decisao:**

`walletRepository.credit()` e `walletRepository.debit()` aceitam um parametro `externalConnection` opcional. Quando fornecido, o repository reutiliza a conexao e nao controla begin/commit/rollback proprios.

```javascript
// O service abre a transacao
const conn = await pool.getConnection()
await conn.beginTransaction()

// Passa a conexao para o repository
await walletRepository.credit(userId, amount, conn)

// Controla o commit no nivel do service
await conn.commit()
```

**Consequencia:** operacoes financeiras criticas sao verdadeiramente atomicas. Qualquer falha em qualquer etapa faz rollback de tudo.

---

## ADR-003 — Webhook como Unica Fonte de Verdade para Pagamentos

**Status:** Implementada

**Contexto:**

Em integracoes com Stripe, e tentador confiar no retorno do frontend (cliente confirmou o pagamento) para creditar o usuario.

**Problema:**

O cliente pode ser manipulado, a conexao pode cair entre a confirmacao no Stripe e o retorno ao backend, ou o evento pode ser replicado.

**Decisao:**

O backend nunca confia no cliente para confirmar pagamentos. A unica fonte de verdade e o webhook `payment_intent.succeeded` enviado diretamente pelo Stripe ao backend.

O registro em `payments` e criado com `status = pending` no momento da criacao do PaymentIntent. O credito na wallet so ocorre quando o webhook chega e passa por todas as validacoes.

**Consequencia:** elimina spoofing de pagamento e garante que fundos so entram na wallet apos confirmacao real do Stripe.

---

## ADR-004 — Buyer ID derivado do Token JWT

**Status:** Implementada

**Contexto:**

Na versao inicial, o `buyerId` era enviado no body da requisicao de criacao de transacao.

**Problema:**

Qualquer cliente poderia enviar um `buyerId` arbitrario, criando transacoes em nome de outro usuario (spoofing de identidade).

**Decisao:**

O `buyerId` passou a ser derivado exclusivamente de `req.user.id`, injetado pelo middleware de autenticacao apos validacao do JWT. O campo foi removido do body aceito pela rota.

**Consequencia:** eliminacao completa de spoofing de buyer.

---

## ADR-005 — Auto-Unblock sem Cron Job

**Status:** Implementada

**Contexto:**

Usuarios bloqueados temporariamente (soft block por velocity) precisam ser desbloqueados apos expiracao do `blocked_until`.

**Problema:**

Criar um cron job dedicado para isso adiciona complexidade operacional e um processo extra para monitorar.

**Decisao:**

O desbloqueio ocorre no middleware de autenticacao: ao carregar o usuario, se `is_blocked = 1` e `blocked_until < now`, o sistema limpa o bloqueio automaticamente e prossegue.

**Consequencia:** sem cron job, sem processo externo. O desbloqueio acontece naturalmente no primeiro acesso do usuario apos a expiracao.

---

## ADR-006 — Federacao Pull-based com UPSERT

**Status:** Implementada

**Contexto:**

O Agrinet precisa sincronizar dados entre multiplos nos independentes sem um coordenador central.

**Decisao:**

Modelo pull-based: cada no periodicamente consulta os outros nos via `GET /federation/export?since=<timestamp>` e importa os dados via UPSERT local. Nao ha push nem coordenador central.

**Consequencia:**

- Nos sao tolerantes a falha dos demais (cada um funciona de forma autonoma)
- Sincronizacao eventual, nao em tempo real
- Listings de outros nos ficam visiveis localmente mas compras sao bloqueadas (`origin_node`)
