# Chat, Mensagens e Notificacoes

Sistema de comunicacao em tempo real entre compradores e vendedores, com persistencia no banco e notificacoes offline.

---

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| POST | /conversations | Criar conversa |
| GET | /conversations | Listar conversas do usuario |
| PUT | /conversations/:id | Renomear conversa |
| DELETE | /conversations/:id | Remover conversa |
| POST | /conversations/:id/pin | Fixar conversa |
| POST | /messages | Enviar mensagem |
| GET | /messages/:conversationId | Listar mensagens (paginado) |
| POST | /messages/:conversationId/read | Marcar como lidas |
| GET | /notifications | Listar notificacoes |
| PUT | /notifications/:id/read | Marcar notificacao como lida |

```bash
# Criar conversa
curl -X POST /conversations \
  -H "Authorization: Bearer <token>" \
  -d '{ "listingId": "uuid", "sellerId": "uuid" }'

# Enviar mensagem
curl -X POST /messages \
  -H "Authorization: Bearer <token>" \
  -d '{ "conversationId": "uuid", "message": "Ainda disponivel?" }'

# Enviar com anexo
curl -X POST /messages \
  -H "Authorization: Bearer <token>" \
  -F "conversationId=uuid" \
  -F "message=Segue foto" \
  -F "attachment=@imagem.jpg"
```

---

## Paginacao de Mensagens

Mensagens usam paginacao por cursor para conversas longas:

```bash
GET /messages/uuid?cursor=2025-01-15T10:00:00Z
# Retorna: { messages: [...], nextCursor: "..." }
```

Limite fixo de 50 mensagens por pagina, ordenadas por `created_at DESC`.

---

## Status de Entrega

```
Mensagem enviada --> sent
        |
Outro usuario busca mensagens --> delivered
        |
POST /messages/:id/read --> read
```

---

## WebSocket — Eventos

Conexao via Socket.IO. Apos conectar, o cliente anuncia presenca e entra nas salas de suas conversas.

| Evento | Direcao | Descricao |
|---|---|---|
| `user_online` | Cliente -> Servidor | Anuncia presenca |
| `user_offline` | Servidor -> Clientes | Broadcast de desconexao |
| `join_conversation` | Cliente -> Servidor | Entrar na sala |
| `send_message` | Cliente -> Servidor | Enviar mensagem |
| `typing` | Cliente -> Servidor | Indicador de digitacao |
| `user_typing` | Servidor -> Clientes | Broadcast do indicador |

**Persistencia via WebSocket:** ao receber `send_message`, o servidor salva a mensagem no banco antes de fazer broadcast para a sala.

---

## Notificacoes Offline

Quando uma mensagem e enviada e o destinatario nao esta conectado ao WebSocket, o sistema cria automaticamente um registro em `notifications`. O usuario ve a notificacao na proxima vez que acessar o sistema.
