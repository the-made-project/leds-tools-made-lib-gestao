export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  repository: string;
  repositoryOwner: string;
  author: string;
  assignees: string[];
  milestoneNumber: number;
  type: string; // Tipo da issue (feature, bug, task)
  labels: string[]; // Labels da issue
  dependencies: {
    number: number;
    title: string;
    state?: 'OPEN' | 'CLOSED'; // agora opcional
    url: string;
  }[]; // Issues das quais esta issue depende
  dependents: {
    number: number;
    title: string;
    state?: 'OPEN' | 'CLOSED'; // agora opcional
    url: string;
  }[]; // Issues que dependem desta issue
  customFields: Record<string, string>;
}
import { Issue } from "../../model/models";
export class IssueService {
  constructor(private token: string) {}

  /**
   * Fetches all issues from a specific project
   * @param org The organization name
   * @param projectNumber The project number
   * @returns A list of GitHub issues
   */
  async getAllIssuesFromProject(org: string, projectNumber: number): Promise<GitHubIssue[]> {
    const query = `
      query($org: String!, $projectNumber: Int!, $after: String) {
        organization(login: $org) {
          projectV2(number: $projectNumber) {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
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
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    milestone {
                      number
                    }
                    labels(first: 10) {
                      nodes {
                        name
                      }
                    }
                    bodyText
                  }
                }
              }
            }
          }
        }
      }
    `;

    const issues: GitHubIssue[] = [];
    let hasNextPage = true;
    let after: string | null = null;

    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { org, projectNumber, after },
        }),
      });

      const json = await response.json();

      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Error fetching issues from project: ${json.errors[0].message}`);
      }

      const items = json.data?.organization?.projectV2?.items;
      if (!items) {
        throw new Error(`❌ Project #${projectNumber} not found in ${org}`);
      }

      for (const node of items.nodes) {
        const issue = node.content;
        if (!issue) continue;

        const labels = (issue.labels?.nodes || []).map((label: any) => label.name);
        const type = this.determineIssueType(issue.labels?.nodes || []);

        issues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          repository: issue.repository.name,
          repositoryOwner: issue.repository.owner.login,
          author: issue.author?.login || "unknown",
          assignees: issue.assignees.nodes.map((a: any) => a.login),
          milestoneNumber: issue.milestone?.number || -1,
          type,
          labels,
          dependencies: [],
          dependents: [],
          customFields: {},
        });
      }

      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }

    return issues;
  }

  async getFromMilestoneInProject(
    org: string,
    projectNumber: number,
    milestoneNumber: number
  ): Promise<GitHubIssue[]> {
    const query = `
      query($org: String!, $projectNumber: Int!, $after: String) {
        organization(login: $org) {
          projectV2(number: $projectNumber) {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
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
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    milestone {
                      number
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
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldMilestoneValue {
                      milestone {
                        number
                        title
                      }
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2IterationField {
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
  
    const issues: GitHubIssue[] = [];
    let hasNextPage = true;
    let after: string | null = null;
  
    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { org, projectNumber, after },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Erro ao buscar issues do projeto: ${json.errors[0].message}`);
      }
  
      const items = json.data?.organization?.projectV2?.items;
      if (!items) {
        throw new Error(`❌ Projeto #${projectNumber} não encontrado em ${org}`);
      }
  
      for (const node of items.nodes) {
        const issue = node.content;
        if (!issue?.milestone || issue.milestone.number !== milestoneNumber) continue;
  
        const customFields: Record<string, string> = {};
        for (const fieldValue of node.fieldValues?.nodes || []) {
          let name = null;
          let value = null;
  
          // Extract field name based on the field value type
          if (fieldValue.field?.name) {
            name = fieldValue.field.name;
          }
  
          // Extract value based on the typename
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
            case "ProjectV2ItemFieldMilestoneValue":
              value = fieldValue.milestone?.title || fieldValue.milestone?.number;
              break;
            case "ProjectV2ItemFieldIterationValue":
              value = fieldValue.title;
              break;
          }
  
          if (name && value !== null && value !== undefined) {
            customFields[name] = String(value);
          }
        }
  
        // Extrair labels e determinar o tipo da issue
        const labels = (issue.labels?.nodes || []).map((label: any) => label.name);
        const type = this.determineIssueType(issue.labels?.nodes || []);
        
        // Extrair dependências das cross-references e do corpo da issue
        const dependencies = this.extractDependencies(issue);
        // Inicializamos dependents vazio - será preenchido após todas as issues serem carregadas
        const dependents: any[] = [];
  
        issues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          repository: issue.repository.name,
          repositoryOwner: issue.repository.owner.login,
          author: issue.author?.login || "unknown",
          assignees: issue.assignees.nodes.map((a: any) => a.login),
          milestoneNumber,
          type,
          labels,
          dependencies,
          dependents,
          customFields,
        });
      }
  
      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
    
    // Processar dependents após ter todas as issues
    this.processDependents(issues);
  
    return issues;
  }
  
  async getWithoutMilestonesInProject(
    org: string,
    projectNumber: number
  ): Promise<GitHubIssue[]> {
    const query = `
      query($org: String!, $projectNumber: Int!, $after: String) {
        organization(login: $org) {
          projectV2(number: $projectNumber) {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
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
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    milestone {
                      number
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
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
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
  
    const issues: GitHubIssue[] = [];
    let hasNextPage = true;
    let after: string | null = null;
  
    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { org, projectNumber, after },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Erro ao buscar issues do projeto: ${json.errors[0].message}`);
      }
  
      const items = json.data?.organization?.projectV2?.items;
      if (!items) {
        throw new Error(`❌ Projeto #${projectNumber} não encontrado em ${org}`);
      }
  
      for (const node of items.nodes) {
        const issue = node.content;
        if (!issue || issue.milestone !== null) continue;
  
        const customFields: Record<string, string> = {};
        for (const fieldValue of node.fieldValues?.nodes || []) {
          let name = null;
          let value = null;
  
          // Extract field name from the field property
          if (fieldValue.field?.name) {
            name = fieldValue.field.name;
          }
  
          // Extract value based on the typename
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
            case "ProjectV2ItemFieldIterationValue":
              value = fieldValue.title;
              break;
          }
  
          if (name && value !== null && value !== undefined) {
            customFields[name] = String(value);
          }
        }
  
        // Extrair labels e determinar o tipo da issue
        const labels = (issue.labels?.nodes || []).map((label: any) => label.name);
        const type = this.determineIssueType(issue.labels?.nodes || []);
        
        // Extrair dependências das cross-references e do corpo da issue
        const dependencies = this.extractDependencies(issue);
        // Inicializamos dependents vazio - será preenchido após todas as issues serem carregadas
        const dependents: any[] = [];
  
        issues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          repository: issue.repository.name,
          repositoryOwner: issue.repository.owner.login,
          author: issue.author?.login || "unknown",
          assignees: issue.assignees.nodes.map((a: any) => a.login),
          milestoneNumber: -1,
          type,
          labels,
          dependencies,
          dependents,
          customFields,
        });
      }
  
      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
    
    // Processar dependents após ter todas as issues
    this.processDependents(issues);
  
    return issues;
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
  private extractDependencies(issue: any): Array<{number: number, title: string, state?: 'OPEN' | 'CLOSED', url: string}> {
    const dependencies: Array<{number: number, title: string, state?: 'OPEN' | 'CLOSED', url: string}> = [];
    
    // 1. Verificar cross-references na timeline
    if (issue.timelineItems?.nodes) {
      for (const item of issue.timelineItems.nodes) {
        if (item?.source) {
          const source = item.source;
          
          if (source && source.number && source.title) {
            dependencies.push({
              number: source.number,
              title: source.title,
              state: source.state, // já vem preenchido se disponível
              url: source.url
            });
          }
        }
      }
    }
    
    // 2. Verificar textos explícitos de dependência no corpo da issue
    if (issue.bodyText) {
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
                  // state não é definido aqui, pois ainda não é conhecido
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
   * Preenche a lista de issues dependentes (issues que dependem desta)
   * @param issues Array de todas as issues
   */
  private processDependents(issues: GitHubIssue[]): void {
    // Para cada issue, ver quais outras issues dependem dela
    for (const issue of issues) {
      for (const otherIssue of issues) {
        // Se otherIssue depende da issue atual
        if (otherIssue.dependencies.some(dep => dep.number === issue.number)) {
          issue.dependents.push({
            number: otherIssue.number,
            title: otherIssue.title,
            state: otherIssue.state,
            url: otherIssue.url
          });
        }
      }
    }
    
    // Atualizar estados das dependências que ainda não têm state definido
    for (const issue of issues) {
      for (const dependency of issue.dependencies) {
        if (dependency.state === undefined) {
          const foundIssue = issues.find(i => i.number === dependency.number);
          if (foundIssue) {
            dependency.state = foundIssue.state;
            dependency.title = foundIssue.title;
          }
        }
      }
    }
  }
  
  /**
   * Verifica se uma issue pode ser iniciada (todas as suas dependências estão fechadas)
   * @param issue Issue a verificar
   * @returns true se a issue pode ser iniciada, false caso contrário
   */
  canStart(issue: GitHubIssue): boolean {
    if (issue.state === 'CLOSED') {
      return false; // Issue já fechada
    }
    
    // Verificar se todas as dependências estão fechadas
    return issue.dependencies.every(dep => dep.state === 'CLOSED');
  }
  
  /**
   * Obtém estatísticas de issues por tipo
   * @param issues Lista de issues
   * @returns Estatísticas por tipo
   */
  getIssueStatsByType(issues: GitHubIssue[]): {
    total: number;
    blocked: number;
    ready: number;
    byType: Record<string, {
      total: number;
      open: number;
      closed: number;
      blocked: number;
      ready: number;
      percentComplete: number;
    }>;
    percentComplete: number;
  } {
    if (!issues || issues.length === 0) {
      return { 
        total: 0,
        blocked: 0,
        ready: 0,
        byType: {},
        percentComplete: 0
      };
    }
    
    const total = issues.length;
    
    // Agrupa itens por tipo
    const byType: Record<string, {
      total: number;
      open: number;
      closed: number;
      blocked: number;
      ready: number;
      percentComplete: number;
    }> = {};
    
    // Inicializa estatísticas para cada tipo encontrado
    for (const issue of issues) {
      if (!byType[issue.type]) {
        byType[issue.type] = {
          total: 0,
          open: 0,
          closed: 0,
          blocked: 0,
          ready: 0,
          percentComplete: 0
        };
      }
    }
    
    // Conta itens por tipo e estado
    let blockedTotal = 0;
    let readyTotal = 0;
    
    for (const issue of issues) {
      byType[issue.type].total += 1;
      
      const isReady = this.canStart(issue);
      const isBlocked = !isReady && issue.state === 'OPEN';
      
      if (issue.state === "CLOSED") {
        byType[issue.type].closed += 1;
      } else {
        byType[issue.type].open += 1;
        
        if (isBlocked) {
          byType[issue.type].blocked += 1;
          blockedTotal += 1;
        } else {
          byType[issue.type].ready += 1;
          readyTotal += 1;
        }
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
    const closed = issues.filter(issue => issue.state === "CLOSED").length;
    const percentComplete = Math.round((closed / total) * 100);
    
    return {
      total,
      blocked: blockedTotal,
      ready: readyTotal,
      byType,
      percentComplete
    };
  }
  
  /**
   * Maps a GitHubIssue object to the Issue format
   * @param githubIssue The GitHub issue to convert
   * @returns An Issue object with mapped properties
   */
  async  mapGitHubIssueToIssue(githubIssue: GitHubIssue): Promise<Issue> {
    return {
      id: githubIssue.number.toString(),
      externalId: `${githubIssue.repositoryOwner}/${githubIssue.repository}#${githubIssue.number}`,
      key: `${githubIssue.repository}-${githubIssue.number}`,
      self: githubIssue.url,
      type: 'github',
      subtype: githubIssue.type || 'issue',
      title: githubIssue.title,
      description: githubIssue.customFields.description || '',
      status: githubIssue.state === 'OPEN' ? 'open' : 'closed',
      createdDate: githubIssue.createdAt,
      labels: githubIssue.labels
    };
  }

}
