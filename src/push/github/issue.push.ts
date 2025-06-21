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

  // Retorna todos os usernames dos assignees dos SprintItems de uma issue específica
  getAssigneesForIssueFromTimeBox(timebox: TimeBox, issueId: string): string[] {
    const assigneesSet = new Set<string>();
    for (const item of timebox.sprintItems) {
      if (item.issue && item.issue.id === issueId && item.assignee && item.assignee.discord) {
        assigneesSet.add(item.assignee.name);
      }
    }
    return Array.from(assigneesSet);
  }

  /**
   * Converte um modelo MADE Issue para o modelo de entrada do GitHub
   */
  mapIssueToGitHubInput(issue: Issue): GitHubIssueInput {
    return {
      title: issue.title || 'Sem título',
      body: issue.description || '',
      labels: issue.labels || [],
      assignees: [] // Assignees podem ser adicionados posteriormente
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