import { createProject, addIssueToProject } from '../push/github/project.push';
import { GitHubIssuePushService } from '../push/github/issue.push';
import { GitHubTokenManager } from './GitHubTokenManager';
import { Project, Issue, Milestone, TimeBox, Backlog } from '../model/models';
import { GenericRepository } from '../push/repository/generic.repository';

// Serviço para enviar modelos MADE para o GitHub
export class GitHubPushService {
  private issuePushService: GitHubIssuePushService;
  constructor() {
    this.issuePushService = new GitHubIssuePushService(GitHubTokenManager.getInstance().getToken());
  }

  // Cria um projeto no GitHub a partir do modelo MADE Project
  async pushProject(org: string, project: Project): Promise<string> {
    // Verifica se o projeto já foi extraído/salvo localmente
    const projectRepo = new GenericRepository<Project>('./data/db', 'project.json');
    if (projectRepo.exists(p => p.id === project.id)) {
      console.log(`[GitHubPushService] Projeto ${project.id} já extraído. Ignorando envio.`);
      return project.id;
    }
    // Cria o projeto no GitHub
    const projectId = await createProject(org, project.name);
    return projectId;
  }

  // Cria uma issue no GitHub a partir do modelo MADE Issue e adiciona ao projeto
  async pushIssue(
    org: string,
    repo: string,
    projectId: string,
    issue: Issue,
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }> {
    // Verifica se a issue já foi extraída/salva localmente
    const issueRepo = new GenericRepository<Issue>('./data/db', 'issue.json');
    if (issueRepo.exists(i => i.id === issue.id)) {
      console.log(`[GitHubPushService] Issue ${issue.id} já extraída. Ignorando envio.`);
      return { issueId: issue.id, issueNumber: Number(issue.id), projectItemId: '' };
    }
    // Cria a issue no GitHub
    const created = await this.issuePushService.createIssue(org, repo, issue);

    // Adiciona a issue ao projeto
    const projectItemId = await addIssueToProject(projectId, created.id);
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
  ): Promise<void> {
    const projectId = await this.pushProject(org, project);
    for (const issue of issues) {
      await this.pushIssue(org, repo, projectId, issue);
    }
  }

  // Cria uma milestone no GitHub a partir do modelo MADE Milestone
  async pushMilestone(org: string, milestone: Milestone): Promise<string> {
    const milestoneRepo = new GenericRepository<Milestone>('./data/db', 'milestone.json');
    if (milestoneRepo.exists(m => m.id === milestone.id)) {
      console.log(`[GitHubPushService] Milestone ${milestone.id} já extraída. Ignorando envio.`);
      return milestone.id;
    }
    // TODO: Adicione aqui a lógica real de envio da milestone para o GitHub
    // Exemplo: const milestoneId = await createMilestone(org, milestone);
    // return milestoneId;
    throw new Error('pushMilestone: Implementação do envio para o GitHub necessária.');
  }

  // Cria um sprint/timebox no GitHub a partir do modelo MADE TimeBox
  async pushTimeBox(org: string, timeBox: TimeBox): Promise<string> {
    const timeBoxRepo = new GenericRepository<TimeBox>('./data/db', 'sprint.json');
    if (timeBoxRepo.exists(tb => tb.id === timeBox.id)) {
      console.log(`[GitHubPushService] TimeBox ${timeBox.id} já extraído. Ignorando envio.`);
      return timeBox.id ?? '';
    }
    // TODO: Adicione aqui a lógica real de envio do timebox/sprint para o GitHub
    // Exemplo: const sprintId = await createSprint(org, timeBox);
    // return sprintId;
    throw new Error('pushTimeBox: Implementação do envio para o GitHub necessária.');
  }

  // Cria um backlog no GitHub a partir do modelo MADE Backlog
  async pushBacklog(org: string, backlog: Backlog): Promise<string> {
    const backlogRepo = new GenericRepository<Backlog>('./data/db', 'backlog.json');
    if (backlogRepo.exists(b => b.id === backlog.id)) {
      console.log(`[GitHubPushService] Backlog ${backlog.id} já extraído. Ignorando envio.`);
      return backlog.id;
    }
    // TODO: Adicione aqui a lógica real de envio do backlog para o GitHub
    // Exemplo: const backlogId = await createBacklog(org, backlog);
    // return backlogId;
    throw new Error('pushBacklog: Implementação do envio para o GitHub necessária.');
  }
}