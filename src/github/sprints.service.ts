/**
 * Interface para sprints/iterações do GitHub
 */
interface GitHubSprint {
    id: string;
    title: string;
    startDate: string;
    duration: number;
    endDate: string; // Data de finalização do sprint
    items?: GitHubSprintItem[];
  }
  
  /**
   * Interface para itens dentro de um sprint
   */
  interface GitHubSprintItem {
    id: string;
    contentType: string;
    number: number;
    title: string;
    url: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    repository: string;
    repositoryOwner: string;
    author: string;
    type: string; // Tipo da issue (feature, bug, task)
    labels: string[]; // Labels da issue
    customFields: Record<string, string>;
  }
  
  /**
   * Classe para gerenciar sprints em projetos do GitHub
   */
  export class GitHubSprintService {
    private token: string;
  
    /**
     * Cria uma nova instância do serviço de sprints
     * @param token Token de autenticação do GitHub
     */
    constructor(token: string) {
      this.token = token;
    }
  
    /**
     * Busca todos os sprints/iterações em um projeto do GitHub
     * @param org Nome da organização
     * @param projectNumber Número do projeto
     * @param includeItems Se deve incluir os itens associados a cada sprint
     * @returns Lista de sprints com seus itens (se solicitado)
     */
    async getSprintsInProject(
      org: string,
      projectNumber: number,
      includeItems: boolean = true
    ): Promise<GitHubSprint[]> {
      // 1. Primeiro, obtenha os campos de iteração do projeto
      const sprintFieldsQuery = `
        query($org: String!, $projectNumber: Int!) {
          organization(login: $org) {
            projectV2(number: $projectNumber) {
              fields(first: 20) {
                nodes {
                  ... on ProjectV2IterationField {
                    id
                    name
                    dataType
                    configuration {
                      iterations {
                        id
                        title
                        startDate
                        duration
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
  
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query: sprintFieldsQuery,
          variables: { org, projectNumber },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Erro ao buscar campos de sprint: ${json.errors[0].message}`);
      }
  
      const sprintFields = json.data?.organization?.projectV2?.fields?.nodes || [];
      
      // Filtra apenas os campos do tipo iteração
      const iterationFields = sprintFields.filter(
        (field: any) => field && field.dataType === "ITERATION"
      );
  
      if (iterationFields.length === 0) {
        throw new Error("Nenhum campo de sprint/iteração encontrado no projeto");
      }
  
      // Cria a lista de sprints/iterações
      const sprints: GitHubSprint[] = [];
      
      // Para cada campo de iteração, obtenha os sprints configurados
      for (const field of iterationFields) {
        const iterations = field.configuration?.iterations || [];
        
        for (const iteration of iterations) {
          // Calcula a data de término com base na data de início e duração
          const startDate = new Date(iteration.startDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + iteration.duration);
          
          sprints.push({
            id: iteration.id,
            title: iteration.title,
            startDate: iteration.startDate,
            duration: iteration.duration,
            endDate: endDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
            items: []
          });
        }
      }
  
      // 2. Se solicitado, busque os itens associados a cada sprint
      if (includeItems && iterationFields.length > 0) {
        await this.populateSprintItems(org, projectNumber, sprints, iterationFields[0]);
      }
  
      return sprints;
    }
  
    /**
     * Busca um sprint específico pelo título
     * @param org Nome da organização
     * @param projectNumber Número do projeto
     * @param sprintTitle Título do sprint
     * @param includeItems Se deve incluir os itens associados ao sprint
     * @returns O sprint encontrado ou null se não existir
     */
    async getSprintByTitle(
      org: string,
      projectNumber: number,
      sprintTitle: string,
      includeItems: boolean = true
    ): Promise<GitHubSprint | null> {
      const sprints = await this.getSprintsInProject(org, projectNumber, includeItems);
      return sprints.find(sprint => sprint.title === sprintTitle) || null;
    }
  
    /**
     * Busca o sprint atual (ativo)
     * @param org Nome da organização
     * @param projectNumber Número do projeto
     * @param includeItems Se deve incluir os itens associados ao sprint
     * @returns O sprint atual ou null se não houver nenhum ativo
     */
    async getCurrentSprint(
      org: string,
      projectNumber: number,
      includeItems: boolean = true
    ): Promise<GitHubSprint | null> {
      const sprints = await this.getSprintsInProject(org, projectNumber, includeItems);
      
      // Calcula a data atual em formato ISO
      const today = new Date().toISOString().split('T')[0];
      
      // Encontra o sprint que inclui a data atual
      for (const sprint of sprints) {
        if (sprint.startDate <= today && today <= sprint.endDate) {
          return sprint;
        }
      }
      
      return null;
    }
    
    /**
     * Busca todos os sprints completados (já finalizados)
     * @param org Nome da organização
     * @param projectNumber Número do projeto
     * @param includeItems Se deve incluir os itens associados aos sprints
     * @returns Lista de sprints finalizados
     */
    async getCompletedSprints(
      org: string,
      projectNumber: number,
      includeItems: boolean = true
    ): Promise<GitHubSprint[]> {
      const sprints = await this.getSprintsInProject(org, projectNumber, includeItems);
      const today = new Date();
      
      return sprints.filter(sprint => {
        const endDate = new Date(sprint.endDate);
        return endDate < today;
      });
    }
    
    /**
     * Busca o próximo sprint (que ainda não começou)
     * @param org Nome da organização
     * @param projectNumber Número do projeto
     * @param includeItems Se deve incluir os itens associados ao sprint
     * @returns O próximo sprint ou null se não houver nenhum planejado
     */
    async getNextSprint(
      org: string,
      projectNumber: number,
      includeItems: boolean = true
    ): Promise<GitHubSprint | null> {
      const sprints = await this.getSprintsInProject(org, projectNumber, includeItems);
      const today = new Date().toISOString().split('T')[0];
      
      // Ordena os sprints por data de início
      const upcomingSprints = sprints
        .filter(sprint => sprint.startDate > today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      
      return upcomingSprints.length > 0 ? upcomingSprints[0] : null;
    }
  
    /**
     * Obtém estatísticas do sprint
     * @param sprint O sprint para analisar
     * @returns Estatísticas do sprint
     */
    getSprintStats(sprint: GitHubSprint): {
      total: number;
      open: number;
      closed: number;
      percentComplete: number;
      isCompleted: boolean;
      daysRemaining: number;
    } {
      if (!sprint.items || sprint.items.length === 0) {
        return { 
          total: 0, 
          open: 0, 
          closed: 0, 
          percentComplete: 0,
          isCompleted: this.isSprintCompleted(sprint),
          daysRemaining: this.getSprintDaysRemaining(sprint)
        };
      }
      
      const total = sprint.items.length;
      const closed = sprint.items.filter(item => item.state === "CLOSED").length;
      const open = total - closed;
      const percentComplete = Math.round((closed / total) * 100);
      const isCompleted = this.isSprintCompleted(sprint);
      const daysRemaining = this.getSprintDaysRemaining(sprint);
      
      return { 
        total, 
        open, 
        closed, 
        percentComplete,
        isCompleted,
        daysRemaining
      };
    }
  
    /**
     * Obtém estatísticas do sprint agrupadas por tipo de item
     * @param sprint O sprint para analisar
     * @returns Estatísticas detalhadas por tipo
     */
    getSprintStatsByType(sprint: GitHubSprint): {
      total: number;
      byType: Record<string, {
        total: number;
        open: number;
        closed: number;
        percentComplete: number;
      }>;
      percentComplete: number;
      isCompleted: boolean;
      daysRemaining: number;
    } {
      if (!sprint.items || sprint.items.length === 0) {
        return { 
          total: 0,
          byType: {},
          percentComplete: 0,
          isCompleted: this.isSprintCompleted(sprint),
          daysRemaining: this.getSprintDaysRemaining(sprint)
        };
      }
      
      const total = sprint.items.length;
      const isCompleted = this.isSprintCompleted(sprint);
      const daysRemaining = this.getSprintDaysRemaining(sprint);
      
      // Agrupa itens por tipo
      const byType: Record<string, {
        total: number;
        open: number;
        closed: number;
        percentComplete: number;
      }> = {};
      
      // Inicializa estatísticas para cada tipo encontrado
      for (const item of sprint.items) {
        if (!byType[item.type]) {
          byType[item.type] = {
            total: 0,
            open: 0,
            closed: 0,
            percentComplete: 0
          };
        }
      }
      
      // Conta itens por tipo e estado
      for (const item of sprint.items) {
        byType[item.type].total += 1;
        
        if (item.state === "CLOSED") {
          byType[item.type].closed += 1;
        } else {
          byType[item.type].open += 1;
        }
      }
      
      // Calcula percentuais de conclusão por tipo
      for (const type in byType) {
        if (byType[type].total > 0) {
          byType[type].percentComplete = Math.round(
            (byType[type].closed / byType[type].total) * 100
          );
        }
      }
      
      // Calcula percentual de conclusão geral
      const closed = sprint.items.filter(item => item.state === "CLOSED").length;
      const percentComplete = Math.round((closed / total) * 100);
      
      return {
        total,
        byType,
        percentComplete,
        isCompleted,
        daysRemaining
      };
    }
  
    /**
     * Verifica se um sprint já foi finalizado (sua data de término já passou)
     * @param sprint O sprint a ser verificado
     * @returns true se o sprint já foi finalizado, false caso contrário
     */
    private isSprintCompleted(sprint: GitHubSprint): boolean {
      const today = new Date();
      const endDate = new Date(sprint.endDate);
      return today > endDate;
    }
  
    /**
     * Calcula quantos dias restam para o fim do sprint
     * @param sprint O sprint a ser analisado
     * @returns Número de dias restantes (negativo se já terminou)
     */
    private getSprintDaysRemaining(sprint: GitHubSprint): number {
      const today = new Date();
      const endDate = new Date(sprint.endDate);
      
      // Diferença em milissegundos
      const diffTime = endDate.getTime() - today.getTime();
      
      // Diferença em dias (arredondada para o inteiro mais próximo)
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }
  
    /**
     * Determina o tipo da issue com base nas suas labels
     * @param labels Array de labels da issue
     * @returns Tipo da issue (feature, bug, task, ou 'unknown')
     */
    private determineIssueType(labels: Array<{name: string}>): string {
      // Converte todas as labels para minúsculas para facilitar a comparação
      const labelNames = labels.map(label => label.name.toLowerCase());
      
      // Verifica se alguma das labels contém os tipos comuns
      if (labelNames.some(name => name.includes('feature') || name === 'enhancement')) {
        return 'feature';
      } else if (labelNames.some(name => name.includes('bug') || name === 'defect')) {
        return 'bug';
      } else if (labelNames.some(name => name.includes('task') || name === 'chore')) {
        return 'task';
      } else if (labelNames.some(name => name.includes('documentation') || name === 'docs')) {
        return 'documentation';
      } else if (labelNames.some(name => name.includes('question') || name === 'help wanted')) {
        return 'question';
      }
      
      // Verifica se há algum campo personalizado que indica o tipo
      // (Útil se o tipo estiver em um custom field em vez de labels)
      // Esta parte seria específica para sua implementação
      
      return 'unknown';
    }
  
    /**
     * Popula os itens de cada sprint
     */
    private async populateSprintItems(
      org: string,
      projectNumber: number,
      sprints: GitHubSprint[],
      iterationField: any
    ): Promise<void> {
      const itemsQuery = `
        query($org: String!, $projectNumber: Int!, $after: String) {
          organization(login: $org) {
            projectV2(number: $projectNumber) {
              items(first: 100, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content {
                    ... on Issue {
                      number
                      title
                      url
                      state
                      createdAt
                      updatedAt
                      repository {
                        name
                        owner {
                          login
                        }
                      }
                      author {
                        login
                      }
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                    ... on PullRequest {
                      number
                      title
                      url
                      state
                      createdAt
                      updatedAt
                      repository {
                        name
                        owner {
                          login
                        }
                      }
                      author {
                        login
                      }
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      __typename
                      ... on ProjectV2ItemFieldIterationValue {
                        iterationId
                        title
                        field {
                          ... on ProjectV2IterationField {
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
  
      let hasNextPage = true;
      let after: string | null = null;
  
      while (hasNextPage) {
        const itemsResponse = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            query: itemsQuery,
            variables: { org, projectNumber, after },
          }),
        });
  
        const itemsJson = await itemsResponse.json();
  
        if (itemsJson.errors) {
          console.error("GraphQL error:", JSON.stringify(itemsJson.errors, null, 2));
          throw new Error(`Erro ao buscar itens do projeto: ${itemsJson.errors[0].message}`);
        }
  
        const items = itemsJson.data?.organization?.projectV2?.items;
        if (!items) {
          throw new Error(`❌ Projeto #${projectNumber} não encontrado em ${org}`);
        }
  
        // Processa cada item
        for (const node of items.nodes) {
          const content = node.content;
          if (!content) continue;
  
          // Extrair campos personalizados
          const customFields: Record<string, string> = {};
          let sprintId: string | null = null;
  
          for (const fieldValue of node.fieldValues?.nodes || []) {
            // Se for um campo de iteração, obtenha o ID do sprint
            if (fieldValue.__typename === "ProjectV2ItemFieldIterationValue" && 
                fieldValue.field?.id === iterationField.id) {
              sprintId = fieldValue.iterationId;
            }
            // Para outros campos, colete como campos personalizados
            else if (fieldValue.field?.name) {
              let name = fieldValue.field.name;
              let value = null;
  
              switch (fieldValue.__typename) {
                case "ProjectV2ItemFieldTextValue":
                  value = fieldValue.text;
                  break;
                case "ProjectV2ItemFieldNumberValue":
                  value = fieldValue.number;
                  break;
                case "ProjectV2ItemFieldDateValue":
                  value = fieldValue.date;
                  break;
                case "ProjectV2ItemFieldSingleSelectValue":
                  value = fieldValue.name;
                  break;
              }
  
              if (value !== null && value !== undefined) {
                customFields[name] = String(value);
              }
            }
          }
  
          // Se o item pertencer a um sprint, adicione-o à lista de itens desse sprint
          if (sprintId) {
            const sprint = sprints.find(s => s.id === sprintId);
            if (sprint) {
              if (!sprint.items) {
                sprint.items = [];
              }
              
              sprint.items.push({
                id: node.id,
                contentType: content.__typename,
                number: content.number,
                title: content.title,
                url: content.url,
                state: content.state,
                createdAt: content.createdAt,
                updatedAt: content.updatedAt,
                repository: content.repository.name,
                repositoryOwner: content.repository.owner.login,
                author: content.author?.login || "unknown",
                type: this.determineIssueType(content.labels?.nodes || []),
                labels: (content.labels?.nodes || []).map((label: any) => label.name),
                customFields
              });
            }
          }
        }
  
        hasNextPage = items.pageInfo.hasNextPage;
        after = items.pageInfo.endCursor;
      }
    }
  }
  
  export { GitHubSprint, GitHubSprintItem };