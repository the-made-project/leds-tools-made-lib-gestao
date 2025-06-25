import { createProject, addIssueToProject } from '../push/github/project.push';
import { GitHubIssuePushService } from '../push/github/issue.push';
import { GitHubTokenManager } from './GitHubTokenManager';
import { Project, Issue } from '../model/models';
import { getProjectFieldIdByName, setProjectItemField, ensureLabelExists, ensureProjectBacklogField } from '../push/github/githubApi';
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
    return await createProject(org, project.name);
  }

  // Cria uma issue no GitHub a partir do modelo MADE Issue e adiciona ao projeto
  async pushIssue(
    org: string,
    repo: string,
    projectId: string,
    issue: Issue,
    allTasks: Issue[] = [],
    allStories: Issue[] = []
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }> {
    const assignees = this.issuePushService.getAssigneesForIssue(issue);
    let created;
    if (issue.type === 'Epic') {
      created = await this.issuePushService.createIssue(org, repo, issue, assignees, [], allStories);
    } else if (issue.type === 'Feature' || issue.type === 'Story') {
      created = await this.issuePushService.createIssue(org, repo, issue, assignees, allTasks);
    } else {
      created = await this.issuePushService.createIssue(org, repo, issue, assignees);
    }

    const projectItemId = await addIssueToProject(projectId, created.id);

    // Seta o campo "Type" (já existente)
    if (issue.type) {
      const typeFieldId = await getProjectFieldIdByName(projectId, 'Type');
      if (typeFieldId) {
        await setProjectItemField(projectId, projectItemId, typeFieldId, issue.type);
      }
    }

    // Seta o campo "Backlog" se existir
    if (issue.backlog) {
      const backlogFieldId = await getProjectFieldIdByName(projectId, 'Backlog');
      if (backlogFieldId) {
        await setProjectItemField(projectId, projectItemId, backlogFieldId, issue.backlog);
      }
    }

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
    issues: Issue[],
    allTasks: Issue[] = []
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }[]> {
    const projectId = await this.pushProject(org, project);
    const results: { issueId: string; issueNumber: number; projectItemId: string }[] = [];
    for (const issue of issues) {
      const result = await this.pushIssue(
        org,
        repo,
        projectId,
        issue,
        allTasks
      );
      results.push(result);
    }
    return results;
  }

  // Normaliza e valida issues
  public prepareIssues(issues: any[], type: string) {
    for (const issue of issues) {
      issue.type = this.normalizeType(type);
      this.validateIssue(issue);
    }
  }

  // Normaliza o campo type
  private normalizeType(type: string): string {
    if (!type) return '';
    const t = type.toLowerCase();
    if (t === 'epic') return 'Epic';
    if (t === 'feature' || t === 'story') return 'Feature';
    if (t === 'task') return 'Task';
    return type;
  }

  // Valida campos obrigatórios
  private validateIssue(issue: any) {
    if (!issue.title) throw new Error(`Issue sem título detectada: ${JSON.stringify(issue)}`);
    if (!issue.id) throw new Error(`Issue sem id detectada: ${JSON.stringify(issue)}`);
  }

  // Cria issues no GitHub
  public async pushIssues(org: string, repo: string, project: any, issues: any[], allTasks: Issue[] = []) {
    return await this.pushProjectWithIssues(org, repo, project, issues, allTasks);
  }

  // Mapeia id MADE -> issueNumber GitHub
  public mapIdToGitHubNumber(issues: any[], results: any[]) {
    const map = new Map<string, number>();
    issues.forEach((issue, idx) => {
      if (issue.id && results[idx]) {
        map.set(issue.id, results[idx].issueNumber);
      }
    });
    return map;
  }

  // Relaciona tasks com suas stories
  public async linkTasksToStories(
    org: string,
    repo: string,
    tasks: any[],
    taskResults: any[],
    storyIdToGitHubNumber: Map<string, number>
  ) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskResult = taskResults[i];
      const depends = Array.isArray(task.depends) ? task.depends : [];
      const storyDep = depends.find(dep => storyIdToGitHubNumber.has(dep.id));
      if (storyDep) {
        const storyGitHubNumber = storyIdToGitHubNumber.get(storyDep.id)!;
        try {
          await this.linkIssues(
            org,
            repo,
            storyGitHubNumber,
            taskResult.issueNumber,
            'is blocked by'
          );
        } catch {}
      }
    }
  }

  // Relaciona stories com suas epics
  public async linkStoriesToEpics(
    org: string,
    repo: string,
    stories: any[],
    storyIdToGitHubNumber: Map<string, number>,
    epicIdToGitHubNumber: Map<string, number>
  ) {
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const depends = Array.isArray(story.depends) ? story.depends : [];
      const epicDep = depends.find(dep => epicIdToGitHubNumber.has(dep.id));
      if (epicDep) {
        const epicGitHubNumber = epicIdToGitHubNumber.get(epicDep.id)!;
        const storyGitHubNumber = storyIdToGitHubNumber.get(story.id)!;
        try {
          await this.linkIssues(
            org,
            repo,
            epicGitHubNumber,
            storyGitHubNumber,
            'is blocked by'
          );
        } catch {}
      }
    }
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

  public async fullPush(
    org: string,
    repo: string,
    project: Project,
    epics: Issue[],
    stories: Issue[],
    tasks: Issue[],
    backlogs?: import('../model/models').Backlog[]
  ) {
    await this.ensureLabels(org, repo);
    this.prepareIssues(epics, 'Epic');
    this.prepareIssues(stories, 'Feature');
    this.prepareIssues(tasks, 'Task');

    const projectId = await this.pushProject(org, project);

    if (backlogs && backlogs.length > 0) {
      const backlogNames = backlogs.map(b => b.name);
      await ensureProjectBacklogField(projectId, backlogNames);
    }

    const epicResults = epics.length > 0
      ? await Promise.all(epics.map(e => this.pushIssue(org, repo, projectId, e, [], stories)))
      : [];
    const storyResults = await Promise.all(
      stories.map(s => this.pushIssue(org, repo, projectId, s, tasks))
    );
    const taskResults = tasks.length > 0
      ? await Promise.all(tasks.map(t => this.pushIssue(org, repo, projectId, t)))
      : [];

    const epicIdToGitHubNumber = this.mapIdToGitHubNumber(epics, epicResults);
    const storyIdToGitHubNumber = this.mapIdToGitHubNumber(stories, storyResults);

    await this.linkTasksToStories(org, repo, tasks, taskResults, storyIdToGitHubNumber);
    await this.linkStoriesToEpics(org, repo, stories, storyIdToGitHubNumber, epicIdToGitHubNumber);
  }

  public async ensureLabels(org: string, repo: string) {
    await ensureLabelExists(org, repo, { name: 'Feature', color: '1d76db', description: 'Funcionalidade' });
    await ensureLabelExists(org, repo, { name: 'Task', color: 'cccccc', description: 'Tarefa' });
  }
}