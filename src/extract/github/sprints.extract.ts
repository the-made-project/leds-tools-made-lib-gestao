import { TimeBox } from "../../model/models";

/**
 * Interface para sprints/iterações do GitHub
 */
export interface GitHubSprint {
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
export interface GitHubSprintItem {
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
  dependencies: {
    number: number;
    title: string;
    state: string;
    url: string;
  }[]; // Issues das quais esta issue depende
  dependents: {
    number: number;
    title: string;
    state: string;
    url: string;
  }[]; // Issues que dependem desta issue
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
    
    return 'unknown';
  }

  /**
   * Extrai dependências de uma issue a partir de cross-references e texto
   * @param issue Issue do GitHub
   * @returns Array de issues das quais esta issue depende
   */
  private extractDependencies(issue: any): Array<{number: number, title: string, state: string, url: string}> {
    const dependencies: Array<{number: number, title: string, state: string, url: string}> = [];
    
    // 1. Verificar cross-references na timeline
    if (issue.timelineItems?.nodes) {
      for (const item of issue.timelineItems.nodes) {
        if (item?.source) {
          const source = item.source;
          
          if (source && source.number && source.title) {
            dependencies.push({
              number: source.number,
              title: source.title,
              state: source.state,
              url: source.url
            });
          }
        }
      }
    }
    
    // 2. Verificar textos explícitos de dependência no corpo da issue
    if (issue.bodyText) {
      // Padrões comuns para indicar dependências
      const patterns = [
        /depends on #(\d+)/i,
        /blocked by #(\d+)/i,
        /waits for #(\d+)/i,
        /after #(\d+)/i,
        /requires #(\d+)/i,
      ];
      
      for (const pattern of patterns) {
        const matches = issue.bodyText.match(new RegExp(pattern, 'g'));
        if (matches) {
          for (const match of matches) {
            const numberMatch = pattern.exec(match);
            if (numberMatch && numberMatch[1]) {
              const issueNumber = parseInt(numberMatch[1], 10);
              
              // Verificar se essa dependência já foi adicionada via cross-reference
              if (!dependencies.some(dep => dep.number === issueNumber)) {
                dependencies.push({
                  number: issueNumber,
                  title: `Issue #${issueNumber}`,
                  state: 'UNKNOWN', // Estado desconhecido, será atualizado se encontrarmos a issue posteriormente
                  url: `https://github.com/${issue.repository.owner.login}/${issue.repository.name}/issues/${issueNumber}`
                });
              }
            }
          }
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Processa dependências entre os itens de um sprint
   * @param items Itens do sprint
   */
  private processDependents(items: GitHubSprintItem[]): void {
    // Para cada item, identifica quais outros itens dependem dele
    for (const item of items) {
      // Inicializa array de dependents caso ainda não exista
      if (!item.dependents) {
        item.dependents = [];
      }
      
      // Verifica quais itens dependem deste
      for (const otherItem of items) {
        // Pula o próprio item
        if (otherItem.id === item.id) continue;
        
        // Verifica se otherItem depende do item atual
        if (otherItem.dependencies && otherItem.dependencies.some(dep => dep.number === item.number)) {
          // Adiciona otherItem como dependente
          item.dependents.push({
            number: otherItem.number,
            title: otherItem.title,
            state: otherItem.state,
            url: otherItem.url
          });
        }
      }
    }
    
    // Atualiza estados de dependências marcadas como UNKNOWN
    for (const item of items) {
      if (!item.dependencies) continue;
      
      for (const dependency of item.dependencies) {
        if (dependency.state === 'UNKNOWN') {
          const foundItem = items.find(i => i.number === dependency.number);
          if (foundItem) {
            dependency.state = foundItem.state;
            dependency.title = foundItem.title;
          }
        }
      }
    }
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
                    timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
                      nodes {
                        ... on CrossReferencedEvent {
                          source {
                            ... on Issue {
                              number
                              title
                              state
                              url
                              repository {
                                name
                              }
                            }
                            ... on PullRequest {
                              number
                              title
                              state
                              url
                              repository {
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                    bodyText
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
                    timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
                      nodes {
                        ... on CrossReferencedEvent {
                          source {
                            ... on Issue {
                              number
                              title
                              state
                              url
                              repository {
                                name
                              }
                            }
                            ... on PullRequest {
                              number
                              title
                              state
                              url
                              repository {
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                    bodyText
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
    
    // Array temporário para todos os itens de todos os sprints
    const allItems: GitHubSprintItem[] = [];

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
            
            // Extrair dependências
            const dependencies = this.extractDependencies(content);
            
            // Criar item com dependências
            const item: GitHubSprintItem = {
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
              dependencies,
              dependents: [],
              customFields
            };
            
            // Adicionar ao sprint
            sprint.items.push(item);
            
            // Adicionar à lista completa
            allItems.push(item);
          }
        }
      }

      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
    
    // Processa dependências bidirecionais para todos os itens
    for (const sprint of sprints) {
      if (sprint.items && sprint.items.length > 0) {
        this.processDependents(sprint.items);
      }
    }
  }
  /**
 * Mapeia um GitHubSprint para o formato TimeBox, sem processar os items
 * @param githubSprint O sprint do GitHub para converter
 * @returns Um objeto TimeBox com propriedades mapeadas
 */
async mapGitHubSprintToTimeBox(githubSprint: GitHubSprint): Promise<TimeBox> {
  // Determina o status baseado nas datas
  const currentDate = new Date();
  const startDate = new Date(githubSprint.startDate);
  const endDate = new Date(githubSprint.endDate);
  
  let status: 'PLANNED' | 'IN_PROGRESS' | 'CLOSED' = 'PLANNED';
  if (currentDate > endDate) {
    status = 'CLOSED';
  } else if (currentDate >= startDate && currentDate <= endDate) {
    status = 'IN_PROGRESS';
  }
  
  return {
    id: githubSprint.id,
    description: githubSprint.title,
    startDate: githubSprint.startDate,
    endDate: githubSprint.endDate,
    name: githubSprint.title,
    status: status,
    completeDate: status === 'CLOSED' ? githubSprint.endDate : undefined,
    sprintItems: [] // Array vazio, já que não estamos mapeando os itens
  };
}
  }


