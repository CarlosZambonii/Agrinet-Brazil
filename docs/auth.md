# Autenticacao e Autorizacao

O sistema usa JWT para autenticacao e controle de acesso por papel (role).

---

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| POST | /auth/register | Criar conta |
| POST | /auth/login | Autenticar e obter token |

**Register**
```bash
curl -X POST /auth/register \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@email.com", "password": "minimo8chars" }'
```

**Login**
```bash
curl -X POST /auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@email.com", "password": "minimo8chars" }'

# Resposta
{ "token": "eyJ..." }
```

Todas as rotas protegidas exigem:
```
Authorization: Bearer <token>
```

---

## Fluxo do Middleware de Autenticacao

```
Token presente?
      |
   Sim | Nao --> 401
      v
Token valido?
      |
   Sim | Nao --> 401
      v
Usuario existe no banco?
      |
   Sim | Nao --> 401
      v
Conta bloqueada?
      |
   Nao | Sim --> blocked_until expirou?
      v              |
req.user injetado  Sim --> auto-unblock, prossegue
prossegue          Nao --> 403 Account blocked
```

---

## Papeis (Roles)

| Role | Acesso |
|---|---|
| `user` | Marketplace, transacoes, chat, wallet |
| `admin` | Tudo acima + painel administrativo completo |

O middleware `requireAdmin` valida `req.user.role === 'admin'`.

---

## Trust Levels

Classificacao de confianca do usuario, atualizada junto com o fraud score:

| Level | Descricao |
|---|---|
| `new` | Recem-registrado |
| `verified` | Historico positivo |
| `trusted` | Alta confianca |
| `restricted` | Restricoes por comportamento suspeito |

---

## Auto-Unblock

Bloqueios temporarios expiram automaticamente no middleware, sem cron job. Se `blocked_until < now`, o bloqueio e limpo e o usuario prossegue normalmente.
