import { axiosInstance } from '../../util/axiosInstance.ts';
import { getRepositoryId, addAssigneesToIssue, addLabelsToLabelable, getLabelIds } from './githubApi.js';
import { Issue } from '../../model/models.ts';

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

  /**
   * Converte um modelo MADE Issue para o modelo de entrada do GitHub
   */
  mapIssueToGitHubInput(issue: Issue): GitHubIssueInput {
    return {
      title: issue.title || 'Sem título',
      body: issue.description || '',
      labels: issue.labels || [],
      assignees: [] // Adapte se seu modelo MADE tiver assignees
    };
  }

  /**
   * Cria uma issue no GitHub
   */
  async createIssue(
    organizationName: string,
    repositoryName: string,
    issue: Issue
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
    const response = await axiosInstance.post('', { query, variables });
    const issueData = response.data?.data?.createIssue?.issue;
    if (!issueData) {
      throw new Error('❌ A resposta da API não contém os dados esperados.');
    }

    // Adiciona labels e assignees se necessário
    if (input.labels && input.labels.length > 0) {
      const labelIds = await getLabelIds(organizationName, repositoryName, input.labels);
      await addLabelsToLabelable(issueData.id, labelIds);
    }
    if (input.assignees && input.assignees.length > 0) {
      await addAssigneesToIssue(organizationName, repositoryName, issueData.number, input.assignees);
    }

    return {
      id: issueData.id,
      number: issueData.number
    };
  }
}