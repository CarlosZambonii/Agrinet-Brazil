docs/API_TESTING.pt.md# Guia de Testes da API Fruitful

Este guia o ajudará a testar a API backend para os componentes Chat-UI usando comandos `curl`. Ele explica saídas esperadas, erros comuns e dicas de resolução de problemas.

## 1. Portas e Endpoints de Serviços

| Serviço | Porta | Uso |
|---------|-------|-----|
| Backend | 5000 | Solicitações de API |
| Frontend | 3000 | Interface Next.js (HTML) |

## 2. Autenticação

A maioria dos endpoints de API requer uma chave de API válida:
- Passe com header: `x-api-key: <sua-chave>`

## 3. Endpoints e Comandos de Amostra

### Verificação de Saúde
```bash
curl -X GET http://localhost:5000/health
```

### Criar Conversa
```bash
curl -X POST http://localhost:5000/conversations \
  -H "Content-Type: application/json" \
  -H "x-api-key: <sua-chave>" \
  -d '{"title": "Chat QA Demo"}'
```

### Enviar Mensagem
```bash
curl -X POST http://localhost:5000/messages/<conversationId> \
  -H "Content-Type: application/json" \
  -H "x-api-key: <sua-chave>" \
  -d '{"from":"user","to":"assistant","type":"text","content":"Hello Agrinet!"}'
```

## 4. Saídas de Erro Comuns

| Saída | Significado |
|-------|-------------|
| `<html>Cannot GET/POST ...</html>` | Porta errada ou endpoint não implementado |
| `{"error":"Unauthorized: Invalid API Key"}` | Chave de API inválida |
| `404: Esta página não pode ser encontrada.` | Você acessou o frontend, não o backend |

## 5. Resolução de Problemas

- Verifique logs do backend para erros
- Confirme que o backend está rodando na porta 5000
- Abra uma issue no GitHub com seu comando curl completo
