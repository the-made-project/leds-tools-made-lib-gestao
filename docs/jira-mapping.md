# Tipos de issue no Jira

![Jira Issue Types](https://wac-cdn.atlassian.com/dam/jcr:9ad770b4-f380-40b8-a802-05abe4e4ebee/issue-hierarchy-v2.png?cdnVersion=3040 "Jira Issue Types Image!")
## Epic
[Link para o Epic do Jira](https://www.atlassian.com/software/jira/guides/issues/overview#what-is-an-work%20item)

O mapeamento dos componentes de projeto entre GitHub e Jira segue a seguinte estrutura para garantir a consistência no gerenciamento de trabalho:

| **Componente no GitHub (Issue Type/Label)** | **Componente Correspondente no Jira** | **Explicação no Contexto do Jira** |
|---------------------------------------------|---------------------------------------|------------------------------------|
| **Epic** | Epic (Tipo de Issue de Nível Superior) | Ambos têm o mesmo nome e propósito: agrupar grandes blocos de trabalho que levam vários Sprints para serem concluídos. |
| **Story** | Story (Estória) (Tipo de Issue Padrão) | São o principal item de trabalho de uma equipe ágil, focados em entregar valor para o usuário final. Deve ser pequena o suficiente para ser concluída em um único Sprint. |
| **Task** | Task (Tarefa) (Tipo de Issue Padrão) ou Sub-task (Subtarefa) | **Opção 1 (Padrão):** Se for uma tarefa grande e independente, use **Task**. **Opção 2 (Melhor para detalhes):** Se for uma etapa técnica necessária para completar uma Story (ex: “Configurar banco de dados”), use **Sub-task** da Story. |
| **Bug** | Bug (Tipo de Issue Padrão) | Identifica um defeito ou comportamento inesperado no código. Funciona da mesma forma em ambas as ferramentas. |
| **Sprint** | Sprint (Recurso de Board/Timebox) | No Jira, o Sprint é um **objeto de planejamento** associado ao seu Board (Quadro Scrum/Kanban), com datas de início e fim. Você atribui Issues a esse objeto. |
| **Dependencies** | Links de Issue (Issue Links) | O Jira usa o recurso **Issue Links** para gerenciar dependências. Você pode criar relacionamentos como “Bloqueia”, “É bloqueado por”, “Relacionado a”, etc., entre duas Issues. |
| **Process** | Fluxo de Trabalho (Workflow) | **Process (Processo)** é geralmente um termo usado para representar o **Fluxo de Trabalho (Workflow)** configurado no Jira. O Workflow define o conjunto de **Status** (Aberto, Em Andamento, Fechado, etc.) e as **Transições** permitidas entre esses status. |



