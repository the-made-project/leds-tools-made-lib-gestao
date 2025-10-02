import fs from "fs";

import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { axiosInstance } from '../../util/axiosInstance';
import { getRepositoryId, addAssigneesToIssue, addLabelsToLabelable, getLabelIds } from './githubApi';
import { Issue } from '../../model/models';
import { Logger } from '../../util/logger';

// Templates
const epicBody = fs.readFileSync("GITHUB_TEMPLATES/epic.md", "utf-8");
const featureBody = fs.readFileSync("GITHUB_TEMPLATES/feature.md", "utf-8");
const taskBody = fs.readFileSync("GITHUB_TEMPLATES/task.md", "utf-8");

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

    return featureBody
      .replace('{{description}}', issue.description || '[Descreva de forma clara e sucinta o propósito da funcionalidade.]')
      .replace('{{requirements}}', requirements)
      .replace('{{tasksMarkdown}}', tasksMarkdown)
      .replace('{{criterions}}', criterions)
      .replace('{{observation}}', observation);
  }

  private buildTaskBody(issue: Issue): string {
    const deliverables = (issue.deliverables || []).map(d => `- ${d}`).join('\n') || '- [Adicione entregáveis]';
    const observation = issue.observation ? `\n## Observações\n${issue.observation}` : '';

    return taskBody
      .replace('{{description}}', issue.description || '[Descreva de forma clara e sucinta o propósito da tarefa.]')
      .replace('{{deliverables}}', deliverables)
      .replace('{{observation}}', observation);
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

    return epicBody
      .replace('{{description}}', issue.description || '[Descreva de forma clara e sucinta o propósito da Epic.]')
      .replace('{{storiesMarkdown}}', storiesMarkdown)
      .replace('{{criterions}}', criterions)
      .replace('{{observation}}', observation);
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
    // Ensure labels is always an array and filter out null/undefined values
    let labels = (issue.labels || []).filter(label => label != null && label !== '');

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
    
    try {
      const response = await axios_instance.post('', { query, variables });
      
      // Check for GraphQL errors
      if (response.data?.errors) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ GraphQL errors: ${errorMessages}`);
      }
      
      const issueData = response.data?.data?.createIssue?.issue;
      if (!issueData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }
      
      // Process labels and assignees
      return await this.processIssueLabelsAndAssignees(issueData, input, organizationName, repositoryName, assignees);
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }
      throw error;
    }
  }

  private async processIssueLabelsAndAssignees(
    issueData: any,
    input: any,
    organizationName: string,
    repositoryName: string,
    assignees?: string[]
  ): Promise<GitHubIssueCreated> {

    // Adiciona labels e assignees se necessário
    if (input.labels && input.labels.length > 0) {
      try {
        Logger.info(`ℹ️ Adding labels to issue: ${JSON.stringify(input.labels)}`);
        const labelIds = await getLabelIds(organizationName, repositoryName, input.labels);
        await addLabelsToLabelable(issueData.id, labelIds);
      } catch (labelError: any) {
        Logger.error(`⚠️ Failed to add labels to issue ${issueData.number}:`, labelError.message);
        // Don't throw - issue creation succeeded, just labels failed
      }
    }
    // Adiciona assignees se fornecidos
    const assigneesToAdd = assignees && assignees.length > 0 ? assignees : input.assignees;
    if (assigneesToAdd && assigneesToAdd.length > 0) {
      try {
        await addAssigneesToIssue(organizationName, repositoryName, issueData.number, assigneesToAdd);
      } catch (assigneeError: any) {
        if (assigneeError.response?.status === 422) {
          Logger.error(`⚠️ Invalid assignee(s) for issue ${issueData.number}. Check if usernames exist and have repository access.`);
        } else {
          Logger.error(`⚠️ Failed to add assignees to issue ${issueData.number}:`, assigneeError.message);
        }
      }
    }

    return {
      id: issueData.id,
      number: issueData.number
    };
  }
}