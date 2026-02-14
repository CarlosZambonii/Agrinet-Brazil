# Guia de Configuração do Nó da Federação

## Bem-vindo à Federação Fruitful!

Este guia o orientará na configuração de seu nó, sincronização com Mycelium, geração de chaves McEliece.

## 1. Pré-requisitos

- Node.js (v14+ recomendado)
- - Git
  - - Yarn ou npm
    - - Acesso ao repositório Fruitful: https://github.com/NTARI-ForgeLab/Fruitful
     
      - ## 2. Clone o Repositório
     
      - ```bash
        git clone https://github.com/NTARI-ForgeLab/Fruitful.git
        cd Fruitful
        ```

        ## 3. Instale as Dependências

        ```bash
        # Usando yarn
        yarn install

        # Ou usando npm
        npm install
        ```

        ## 4. Sincronização com Mycelium

        Mycelium é o protocolo usado para sincronizar nós de federação.

        ### Configuração

        Localize ou crie seu arquivo `.env` na raiz do projeto e adicione:

        ```env
        MYCELIUM_NODE_NAME=seu-nome-de-nó
        MYCELIUM_PEER_URLS=https://peer1.example.com,https://peer2.example.com
        MYCELIUM_PORT=7000
        ```

        ### Inicie o Nó Mycelium

        ```bash
        yarn mycelium:start
        # OU
        npm run mycelium:start
        ```

        ## 5. Geração de Chaves (McEliece)

        O criptossistema McEliece é usado para comunicação segura entre nós.

        ```bash
        node scripts/gen-mceliece.js
        ```

        🔒 Adicione as chaves geradas à sua configuração.
        📂 Nunca compartilhe sua chave privada.

        ## 6. Passos Finais

        - ✅ Teste seu nó executando a pilha completa
        - - 🔐 Certifique-se de que as chaves estão corretamente geradas
          - - 🔗 Integre os métodos de contrato de UI em seu código frontend
           
            - ## 7. Resolução de Problemas
           
            - - 📜 Verifique logs de erros ao iniciar
              - - ⚙️ Verifique a configuração do `.env`
                - - 🌐 Certifique-se de que as portas estão abertas
