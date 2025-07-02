import { GitHubTokenManager } from '../../service/GitHubTokenManager.ts';
import { axiosInstance } from '../../util/axiosInstance.ts';
import { getRepositoryId, addAssigneesToIssue, addLabelsToLabelable, getLabelIds } from './githubApi.js';
import { Issue} from '../../model/models.ts';

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

  private buildFeatureBody(issue: Issue, allTasks: Issue[], allTasksResults: { issueId: string, issueNumber: number }[] = []): string {
    const idToNumber = new Map<string, number>();
    allTasksResults.forEach(res => idToNumber.set(res.issueId, res.issueNumber));

    const relatedTasks = allTasks.filter(
      task => Array.isArray(task.depends) && task.depends.some(dep => dep.id === issue.id)
    );

    // Checklist de tasks melhorado
    let tasksMarkdown = '';
    if (relatedTasks.length > 0) {
      tasksMarkdown = relatedTasks.map(task => {
        const taskNumber = idToNumber.get(task.id);
        const taskRef = taskNumber ? `#${taskNumber}` : task.title || task.id;
        const taskTitle = task.title || task.description || task.id;
        const checked = task.status === 'DONE' || task.status === 'CLOSED' ? 'x' : ' ';
        return `- [${checked}] ${taskRef} - ${taskTitle}`;
      }).join('\n');
    } else {
      tasksMarkdown = '- [ ] (Nenhuma task cadastrada)';
    }

    const criterions = (issue.criterions || []).map(c => `- ${c}`).join('\n') || '- [Adicione critérios de aceitação]';
    const requirements = (issue.requirements || []).map(r => `- ${r}`).join('\n') || '- [Adicione requisitos]';
    const observation = issue.observation ? `\n## Observações\n${issue.observation}` : '';

    return `**⚠️ Entregas são feitas via PR. Associe este issue ao pull request correspondente.**

# Descrição
${issue.description || '[Descreva de forma clara e sucinta o propósito da funcionalidade.]'}

## Requisitos Técnicos
${requirements}

# Atividades a serem realizadas
${tasksMarkdown}

# Critérios de Aceitação (Feature-Level)
${criterions}
${observation}
`;
  }

  private buildTaskBody(issue: Issue): string {
    const deliverables = (issue.deliverables || []).map(d => `- ${d}`).join('\n') || '- [Adicione entregáveis]';
    const observation = issue.observation ? `\n## Observações\n${issue.observation}` : '';

    return `**⚠️ Entregas são feitas via PR. Associe este issue ao pull request correspondente.**

# Objetivo da Tarefa  
${issue.description || '[Descreva de forma clara e sucinta o propósito da tarefa.]'}

# Entregáveis
${deliverables}
${observation}
`;
  }

  private buildEpicBody(issue: Issue, allStories: Issue[], allStoriesResults: { issueId: string, issueNumber: number }[] = []): string {
    const idToNumber = new Map<string, number>();
    allStoriesResults.forEach(res => idToNumber.set(res.issueId, res.issueNumber));

    const relatedStories = allStories.filter(
      story => Array.isArray(story.depends) && story.depends.some(dep => dep.id === issue.id)
    );

    // Checklist de stories melhorado
    let storiesMarkdown = '';
    if (relatedStories.length > 0) {
      storiesMarkdown = relatedStories.map(story => {
        const storyNumber = idToNumber.get(story.id);
        const storyRef = storyNumber ? `#${storyNumber}` : story.title || story.id;
        const storyTitle = story.title || story.description || story.id;
        const checked = story.status === 'DONE' || story.status === 'CLOSED' ? 'x' : ' ';
        return `- [${checked}] ${storyRef} - ${storyTitle}`;
      }).join('\n');
    } else {
      storiesMarkdown = '- [ ] (Nenhuma feature/story cadastrada)';
    }

    const criterions = (issue.criterions || []).map(c => `- ${c}`).join('\n') || '- [Adicione critérios de aceitação]';
    const observation = issue.observation ? `\n## Observações\n${issue.observation}` : '';

    return `**⚠️ Entregas são feitas via PR. Associe este Epic às features correspondentes.**

# Descrição
${issue.description || '[Descreva de forma clara e sucinta o propósito da Epic.]'}

# Features relacionadas
${storiesMarkdown}

# Critérios de Aceitação (Epic-Level)
${criterions}
${observation}
`;
  }

  /**
   * Converte um modelo MADE Issue para o modelo de entrada do GitHub
   */
  mapIssueToGitHubInput(
    issue: Issue, 
    allTasks: Issue[] = [], 
    allStories: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = [],
    storyResults: { issueId: string, issueNumber: number }[] = []
  ): GitHubIssueInput {
    let title = issue.title || '';
    let body = '';
    let labels = issue.labels || [];

    // Add backlog label if issue has a backlog
    if (issue.backlog && !labels.includes(issue.backlog)) {
      labels.push(issue.backlog);
    }

    if (issue.type === 'Epic') {
      title = `[EPIC] ${title}`;
      body = this.buildEpicBody(issue, allStories, storyResults);
      if (!labels.includes('Epic')) labels.push('Epic');
    } else if (issue.type === 'Feature' || issue.type === 'Story') {
      title = `[FEATURE] ${title}`;
      body = this.buildFeatureBody(issue, allTasks, taskResults);
      if (!labels.includes('Feature')) labels.push('Feature');
    } else if (issue.type === 'Task') {
      title = `[TASK] ${title}`;
      body = this.buildTaskBody(issue);
      if (!labels.includes('Task')) labels.push('Task');
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
    assignees?: string[],
    allTasks: Issue[] = [],
    allStories: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = [],
    storyResults: { issueId: string, issueNumber: number }[] = []
  ): Promise<GitHubIssueCreated> {
    const input = this.mapIssueToGitHubInput(issue, allTasks, allStories, taskResults, storyResults);

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