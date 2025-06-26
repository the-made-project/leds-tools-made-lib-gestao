import { createProject, addIssueToProject } from '../push/github/project.push';
import { GitHubIssuePushService } from '../push/github/issue.push';
import { GitHubTokenManager } from './GitHubTokenManager';
import { Project, Issue, Backlog, Team, TimeBox, SprintItem } from '../model/models';
import { getProjectFieldIdByName, setProjectItemField, ensureLabelExists, ensureProjectBacklogField } from '../push/github/githubApi';
import { axiosInstance } from '../util/axiosInstance';
import { createOrEnsureTeam } from '../push/github/team.push';
import { addMemberToTeam } from '../push/github/teamMember.push';
import { pushSprintsToGitHub } from '../push/github/sprint.push';
import { addLinkedIssue } from '../push/github/githubApi';

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
    allStories: Issue[] = [],
    idToGitHubIdMap?: Map<string, string>
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

    // Adiciona vínculo de sub-issue (parent-child) se houver dependência
    if (Array.isArray(issue.depends) && idToGitHubIdMap) {
      for (const dep of issue.depends) {
        const parentId = idToGitHubIdMap.get(dep.id);
        if (parentId) {
          try {
            await addLinkedIssue(parentId, created.id);
          } catch (err) {
            console.error(`Erro ao criar vínculo parent-child entre ${parentId} e ${created.id}:`, err);
          }
        }
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
            taskResult.issueNumber,
            storyGitHubNumber,
            'blocks'
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
            storyGitHubNumber,
            epicGitHubNumber,
            'blocks'
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
    backlogs?: Backlog[],
    teams?: Team[],
    timeboxes?: TimeBox[]
  ) {
    // Adiciona teams antes do restante do fluxo
    if (teams && teams.length > 0) {
      for (const team of teams) {
        await createOrEnsureTeam(org, team.name, team.description);
        if (team.teamMembers && team.teamMembers.length > 0) {
          for (const member of team.teamMembers) {
            if (member.name) {
              await addMemberToTeam(org, team.name, member.name);
            }
          }
        }
      }
    }

    // Coleta todos os status de sprint únicos
    const sprintStatuses = (timeboxes || [])
      .map(tb => tb.status)
      .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

    // Garante labels padrão, de backlog e de status de sprint
    await this.ensureLabels(org, repo, backlogs, sprintStatuses, timeboxes);

    // Adiciona a label do backlog correspondente em cada issue do backlog
    if (backlogs && backlogs.length > 0) {
      for (const backlog of backlogs) {
        if (backlog.issues) {
          for (const issue of backlog.issues) {
            issue.labels = issue.labels || [];
            if (!issue.labels.includes(backlog.name)) {
              issue.labels.push(backlog.name);
            }
          }
        }
      }
    }

    // Garante labels das epics, stories e tasks apenas
    const allLabels = new Set<string>();
    [epics, stories, tasks].forEach(issueList => {
      issueList.forEach(issue => {
        (issue.labels || []).forEach(label => allLabels.add(label));
      });
    });

    for (const label of allLabels) {
      await ensureLabelExists(org, repo, { name: label, color: 'ededed', description: '' });
    }

    this.prepareIssues(epics, 'Epic');
    this.prepareIssues(stories, 'Feature');
    this.prepareIssues(tasks, 'Task');

    const projectId = await this.pushProject(org, project);

    if (backlogs && backlogs.length > 0) {
      const backlogNames = backlogs.map(b => b.name);
      await ensureProjectBacklogField(projectId, backlogNames);
    }

    // Cria as sprints como issues e as tasks do sprint associadas
    if (timeboxes && timeboxes.length > 0) {
      for (const sprint of timeboxes) {
        if (!sprint.name || !sprint.startDate || !sprint.endDate) {
          console.error(`Sprint inválida: ${JSON.stringify(sprint)}`);
          continue; // ou lance um erro
        }
        // Cria a issue da sprint
        const sprintIssues = await pushSprintsToGitHub(org, repo, [sprint]);
        const sprintIssue = sprintIssues[0];
        if (!sprintIssue) {
          console.error(`Falha ao criar a issue do sprint: ${sprint.name}`);
          continue;
        }
        for (const sprintItem of sprint.sprintItems) {
          const taskIssue: Issue = {
            ...sprintItem.issue,
            assignee: sprintItem.assignee,
            labels: [
              ...(sprintItem.issue.labels || []),
              sprint.name,
              sprint.status || ''
            ].filter(Boolean),
            depends: [
              ...(sprintItem.issue.depends || []),
              { id: sprintIssue.id, type: 'Sprint', subtype: '', title: sprint.name }
            ]
          };
          await this.issuePushService.createIssue(org, repo, taskIssue, [sprintItem.assignee.name]);
        }
      }
    }

    // Criação das issues e mapeamento de IDs para usar nos vínculos parent-child
    const epicResults = epics.length > 0
      ? await Promise.all(epics.map(e => this.pushIssue(org, repo, projectId, e, [], stories)))
      : [];
    const epicIdToGitHubId = new Map<string, string>();
    const epicIdToGitHubNumber = new Map<string, number>();
epics.forEach((epic, idx) => {
  if (epic.id && epicResults[idx]) {
    epicIdToGitHubId.set(epic.id, epicResults[idx].issueId);
    epicIdToGitHubNumber.set(epic.id, epicResults[idx].issueNumber);
  }
});

const storyResults = stories.length > 0
  ? await Promise.all(stories.map(s => this.pushIssue(org, repo, projectId, s, tasks, [], epicIdToGitHubId)))
  : [];
const storyIdToGitHubId = new Map<string, string>();
const storyIdToGitHubNumber = new Map<string, number>();
stories.forEach((story, idx) => {
  if (story.id && storyResults[idx]) {
    storyIdToGitHubId.set(story.id, storyResults[idx].issueId);
    storyIdToGitHubNumber.set(story.id, storyResults[idx].issueNumber);
  }
});

const taskResults = tasks.length > 0
  ? await Promise.all(tasks.map(t => this.pushIssue(org, repo, projectId, t, [], [], storyIdToGitHubId)))
  : [];

// Corrigido: use o mapa de número para as funções que esperam número
await this.linkTasksToStories(org, repo, tasks, taskResults, storyIdToGitHubNumber);
await this.linkStoriesToEpics(org, repo, stories, storyIdToGitHubNumber, epicIdToGitHubNumber);
  }

  public async ensureLabels(org: string, repo: string, backlogs?: Backlog[], sprintStatuses: string[] = [], timeboxes?: TimeBox[]) {
    await ensureLabelExists(org, repo, { name: 'Feature', color: '1d76db', description: 'Funcionalidade' });
    await ensureLabelExists(org, repo, { name: 'Task', color: 'cccccc', description: 'Tarefa' });
    await ensureLabelExists(org, repo, { name: 'Epic', color: '5319e7', description: 'Epic' });

    // Cria uma label para cada backlog, se houver
    if (backlogs && backlogs.length > 0) {
      for (const backlog of backlogs) {
        await ensureLabelExists(org, repo, { name: backlog.name, color: 'ededed', description: `Backlog: ${backlog.description || ''}` });
      }
    }

    // Cria labels de status de sprint
    for (const status of sprintStatuses) {
      await ensureLabelExists(org, repo, { name: status, color: 'ededed', description: `Sprint Status: ${status}` });
    }

    // Cria labels para cada sprint (nome da sprint)
    if (timeboxes && timeboxes.length > 0) {
      for (const sprint of timeboxes) {
        if (sprint.name) {
          await ensureLabelExists(org, repo, { name: sprint.name, color: 'ededed', description: `Sprint: ${sprint.name}` });
        }
      }
    }
  }
}