# Automação de Lançamento, Versionamento e Marcação

Este repositório automatiza marcação de versão e lançamentos no GitHub com dois fluxos de trabalho localizados em `.github/workflows`.

## Fluxo de Trabalho de Versão e Marcação

* **Arquivo**: `.github/workflows/version-and-tag.yml`
* * **Gatilho**: Pushes para `main` que alteram qualquer `package.json` em `frontend/`, `frontend/chat-ui/` ou `backend/`.
  * * **Comportamento**:
    *   * Lê a versão canônica de `frontend/package.json`, valida que segue versionamento semântico (`x.y.z` com qualificadores opcionais `-prerelease` ou `+build`).
        *   * Garante que as versões nos outros arquivos `package.json` correspondam.
            *   * Se a marcação `v<versão>` não existir, cria uma marcação anotada e a envia ao repositório.
                *   * Resumos são escritos para a execução do fluxo de trabalho para tornar o resultado visível.
                 
                    * Mantenha as versões nos três arquivos `package.json` sincronizadas. Atualize a versão antes de fazer merge em `main` para disparar uma nova marcação.
                 
                    * ## Fluxo de Trabalho de Lançamento
                 
                    * * **Arquivo**: `.github/workflows/create-release.yml`
                      * * **Gatilho**: Pushes de marcações que correspondem ao padrão `v*.*.*` (por exemplo, `v1.2.3`).
                        * * **Comportamento**:
                          *   * Faz checkout do repositório no commit marcado.
                              *   * Usa [`softprops/action-gh-release`](https://github.com/softprops/action-gh-release) para publicar um lançamento no GitHub.
                                  *   * Inclui notas de lançamento geradas automaticamente.
                                   
                                      * Com ambos os fluxos de trabalho habilitados, atualizar a versão em `main` cria uma marcação Git correspondente, e fazer push dessa marcação publica automaticamente um lançamento com notas geradas.
                                   
                                      * ## Conjuntos de Regras de Marcação do GitHub
                                   
                                      * Se o repositório usar [conjuntos de regras de marcação](https://docs.github.com/en/repositories/releasing-projects-on-github/viewing-your-repositorys-releases-and-tags#about-tags) para controlar quem pode criar ou atualizar marcações de lançamento, certifique-se de que o conjunto de regras permite que o bot `github-actions` faça push de marcações começando com `v`.
                                   
                                      * Sem uma regra de permissão, a tarefa automatizada falhará ao tentar criar marcações `v*.*.*`.
                                   
                                      * Os administradores do repositório podem gerenciar essas configurações em **Configurações → Regras → Regras de marcação**.
