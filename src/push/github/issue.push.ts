import { GitHubTokenManager } from '../../service/GitHubTokenManager.ts';
import { axiosInstance } from '../../util/axiosInstance.ts';
import { getRepositoryId, addAssigneesToIssue, addLabelsToLabelable, getLabelIds } from './githubApi.js';
import { Issue, TimeBox } from '../../model/models.ts';

// Interface para representar uma Issue no GitHub (resumida para criação)
export interface GitHubIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

// Interface para resposta da criação
export interface GitHubIssueCreated {
  id: string;
  number: number;
}

export class GitHubIssuePushService {
  private token: string;

  constructor(token: string) {
    this.token = token;
    if (!this.token) {
      throw new Error('❌ GITHUB_TOKEN não está definido. Configure-o como uma variável de ambiente.');
    }
  }

  // Retorna o username do assignee da issue, se existir. Caso contrário, retorna vazio.
  getAssigneesForIssue(issue: Issue): string[] {
    if (issue.assignee && issue.assignee.name) {
      return [issue.assignee.name];
    }
    return [];
  }

  private buildFeatureBody(issue: Issue): string {
    return `**⚠️ Entregas são feitas via PR. Associe este issue ao pull request correspondente.**

# Descrição
${issue.description || '[Descreva de forma clara e sucinta o propósito da funcionalidade.]'}

## Requisitos Técnicos
- Item 1
- Item 2

# Atividades a serem realizadas
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

# Critérios de Aceitação (Feature-Level)
Para que essa tarefa seja considerada **concluída com sucesso**, o seguinte deve ser entregue: 

- Item 1
- Item 2
- Item 3

## Observações
`;
  }

  private buildTaskBody(issue: Issue): string {
    return `**⚠️ Entregas são feitas via PR. Associe este issue ao pull request correspondente.**

# Objetivo da Tarefa  
${issue.description || '[Descreva de forma clara e sucinta o propósito da tarefa.]'}

# Entregáveis
Para que essa tarefa seja considerada **concluída com sucesso**, o seguinte deve ser entregue: 

- Item 1
- Item 2
- Item 3

## Observações
`;
  }

  /**
   * Converte um modelo MADE Issue para o modelo de entrada do GitHub
   */
  mapIssueToGitHubInput(issue: Issue): GitHubIssueInput {
    let title = issue.title || '';
    let body = '';
    let labels = issue.labels || [];
    let type = '';

    if (issue.type === 'Feature' || issue.type === 'Story') {
      title = `[FEATURE] ${title}`;
      body = this.buildFeatureBody(issue);
      type = 'Feature';
    } else if (issue.type === 'Task') {
      title = `[TASK] ${title}`;
      body = this.buildTaskBody(issue);
      type = 'Task';
    } else {
      body = issue.description || '';
    }

    return {
      title,
      body,
      labels,
      assignees: []
    };
  }

  /**
   * Cria uma issue no GitHub
   */
  async createIssue(
    organizationName: string,
    repositoryName: string,
    issue: Issue,
    assignees?: string[]
  ): Promise<GitHubIssueCreated> {
    const input = this.mapIssueToGitHubInput(issue);

    const query = `
      mutation($repositoryId: ID!, $title: String!, $body: String!) {
        createIssue(input: {repositoryId: $repositoryId, title: $title, body: $body}) {
          issue {
            id
            number
          }
        }
      }
    `;

    // Obtém o ID do repositório
    const repositoryId = await getRepositoryId(organizationName, repositoryName);

    const variables = {
      repositoryId,
      title: input.title,
      body: input.body,
    };

    // Cria a issue
    const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
    const response = await axios_instance.post('', { query, variables });
    const issueData = response.data?.data?.createIssue?.issue;
    if (!issueData) {
      throw new Error('❌ A resposta da API não contém os dados esperados.');
    }

    // Adiciona labels e assignees se necessário
    if (input.labels && input.labels.length > 0) {
      const labelIds = await getLabelIds(organizationName, repositoryName, input.labels);
      await addLabelsToLabelable(issueData.id, labelIds);
    }
    // Adiciona assignees se fornecidos
    const assigneesToAdd = assignees && assignees.length > 0 ? assignees : input.assignees;
    if (assigneesToAdd && assigneesToAdd.length > 0) {
      await addAssigneesToIssue(organizationName, repositoryName, issueData.number, assigneesToAdd);
    }

    return {
      id: issueData.id,
      number: issueData.number
    };
  }
}