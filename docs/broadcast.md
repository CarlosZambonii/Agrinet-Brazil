# Broadcast System

Sistema de mensagens internas broadcast para comunicacao entre componentes e nos da rede. Diferente do chat (comunicacao entre usuarios), o broadcast e voltado para eventos do sistema, comandos e sincronizacao.

---

## Arquitetura

```
broadcastService.js
      |
      |-- subscriberManager.js   (gerencia inscritos)
      |-- commandProcessor.js    (processa comandos recebidos)
      |-- translationService.js  (traducao/normalizacao de mensagens)
```

---

## Tabela `broadcasts`

| Campo | Tipo | Descricao |
|---|---|---|
| id | varchar(36) | UUID do broadcast |
| message | text | Conteudo da mensagem |
| type | varchar(50) | Tipo do evento |
| payload | JSON | Dados estruturados do evento |
| created_at | timestamp | Data de criacao |

O `payload` e armazenado como JSON, permitindo estruturas flexiveis por tipo de evento.

---

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| POST | /broadcasts | Publicar broadcast |
| GET | /broadcasts | Listar broadcasts recentes |

---

## Fluxo

```
Evento gerado (interno ou externo)
        |
        v
broadcastService recebe mensagem
        |
        v
translationService normaliza o payload
        |
        v
Persiste em broadcasts (banco)
        |
        v
subscriberManager notifica inscritos
        |
        v
commandProcessor executa acoes derivadas (se aplicavel)
```

---

## Relacao com Federation

O sistema de broadcast complementa a federacao: enquanto `federationSyncJob` sincroniza dados de forma periodica e pull-based, o broadcast permite propagacao imediata push-based de eventos entre componentes do mesmo no.
