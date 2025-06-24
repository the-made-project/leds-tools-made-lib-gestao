import { createProject, addIssueToProject } from '../push/github/project.push';
import { GitHubIssuePushService } from '../push/github/issue.push';
import { GitHubTokenManager } from './GitHubTokenManager';
import { Project, Issue } from '../model/models';
import { getProjectFieldIdByName, setProjectItemField } from '../push/github/githubApi';
import { axiosInstance } from '../util/axiosInstance';

// Serviço para enviar modelos MADE para o GitHub
export class GitHubPushService {
  private issuePushService: GitHubIssuePushService;
  constructor() {
    this.issuePushService = new GitHubIssuePushService(GitHubTokenManager.getInstance().getToken());
  }

  // Cria um projeto no GitHub a partir do modelo MADE Project
  async pushProject(org: string, project: Project): Promise<string> {
    // Cria o projeto no GitHub
    const projectId = await createProject(org, project.name);
    return projectId;
  }

  // Cria uma issue no GitHub a partir do modelo MADE Issue e adiciona ao projeto
  async pushIssue(
    org: string,
    repo: string,
    projectId: string,
    issue: Issue
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }> {
    const assignees = this.issuePushService.getAssigneesForIssue(issue);
    const created = await this.issuePushService.createIssue(org, repo, issue, assignees);
    const projectItemId = await addIssueToProject(projectId, created.id);

    // --- NOVO: seta o campo Type no projeto ---
    if (issue.type) {
      const typeFieldId = await getProjectFieldIdByName(projectId, "Type");
      if (typeFieldId) {
        await setProjectItemField(projectId, projectItemId, typeFieldId, issue.type);
      }
    }
    // -----------------------------------------

    return {
      issueId: created.id,
      issueNumber: created.number,
      projectItemId
    };
  }

  // Exemplo: envia um projeto e suas issues
  async pushProjectWithIssues(
    org: string,
    repo: string,
    project: Project,
    issues: Issue[]
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }[]> {
    const projectId = await this.pushProject(org, project);
    const results: { issueId: string; issueNumber: number; projectItemId: string }[] = [];
    for (const issue of issues) {
      const result = await this.pushIssue(org, repo, projectId, issue);
      results.push(result);
    }
    return results;
  }

  // Relaciona duas issues (ex: task -> story)
  async linkIssues(
    organizationName: string,
    repositoryName: string,
    parentIssueNumber: number,
    childIssueNumber: number,
    relation: 'blocks' | 'is blocked by' | 'relates to' = 'blocks'
  ): Promise<void> {
    const url = `https://api.github.com/repos/${organizationName}/${repositoryName}/issues/${childIssueNumber}/comments`;
    let body = '';
    if (relation === 'blocks') {
      body = `Depende de #${parentIssueNumber}`;
    } else if (relation === 'is blocked by') {
      body = `Bloqueado por #${parentIssueNumber}`;
    } else {
      body = `Relacionado a #${parentIssueNumber}`;
    }
    const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
    await axios_instance.post(url, { body });
  }
}