import { createProject, addIssueToProject } from '../push/github/project.push';
import { GitHubIssuePushService } from '../push/github/issue.push';
import { GitHubSprintPushService } from '../push/github/sprint.push';
import { GitHubTokenManager } from './GitHubTokenManager';
import { Project, Issue, Backlog, Team, TimeBox } from '../model/models';
import { getProjectFieldIdByName, setProjectItemField, ensureLabelExists } from '../push/github/githubApi';
import { axiosInstance } from '../util/axiosInstance';
import { createOrEnsureTeam } from '../push/github/team.push';
import { addMemberToTeam } from '../push/github/teamMember.push';

// Serviço para enviar modelos MADE para o GitHub
export class GitHubPushService {
  private issuePushService: GitHubIssuePushService;
  private sprintPushService: GitHubSprintPushService;
  
  constructor() {
    this.issuePushService = new GitHubIssuePushService(GitHubTokenManager.getInstance().getToken());
    this.sprintPushService = new GitHubSprintPushService(GitHubTokenManager.getInstance().getToken());
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
    idToGitHubIdMap?: Map<string, string>,
    taskResults: { issueId: string, issueNumber: number }[] = [],
    storyResults: { issueId: string, issueNumber: number }[] = []
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }> {
    const assignees = this.issuePushService.getAssigneesForIssue(issue);
    let created;
    if (issue.type === 'Epic') {
      created = await this.issuePushService.createIssue(org, repo, issue, assignees, [], allStories, [], storyResults);
    } else if (issue.type === 'Feature' || issue.type === 'Story') {
      created = await this.issuePushService.createIssue(org, repo, issue, assignees, allTasks, [], taskResults, []);
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
    // Garante que todas as issues tenham labels inicializado como array
    [epics, stories, tasks].forEach(issueList => {
      issueList.forEach(issue => {
        if (!Array.isArray(issue.labels)) {
          issue.labels = [];
        }
      });
    });

    // Criar todas as labels necessárias antes de processar as issues
    await this.ensureLabels(org, repo, backlogs, timeboxes);

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

    this.prepareIssues(tasks, 'Task');
    this.prepareIssues(stories, 'Feature');
    this.prepareIssues(epics, 'Epic');

    const projectId = await this.pushProject(org, project);

    // Garante que o campo "Backlog" existe no projeto, se houver backlogs
    if (backlogs && backlogs.length > 0) {
      const backlogNames = backlogs.map(b => b.name);
      // TODO: Implement ensureProjectBacklogField if needed
      console.log(`📝 Backlogs detectados: ${backlogNames.join(', ')}`);
    }

    // 1. Crie Epics primeiro (são independentes)
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

    // 2. Crie Stories (agora com referência aos epics)
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

    // 3. Crie Tasks (agora com referência às stories)
    const taskResults = tasks.length > 0
      ? await Promise.all(tasks.map(t => this.pushIssue(org, repo, projectId, t, [], [], storyIdToGitHubId)))
      : [];
    const taskIdToGitHubId = new Map<string, string>();
    const taskIdToGitHubNumber = new Map<string, number>();
    tasks.forEach((task, idx) => {
      if (task.id && taskResults[idx]) {
        taskIdToGitHubId.set(task.id, taskResults[idx].issueId);
        taskIdToGitHubNumber.set(task.id, taskResults[idx].issueNumber);
      }
    });


    // Criação das issues (epics, stories, tasks) e mapeamento dos números do GitHub

    // Linkagem de dependências
    await this.linkTasksToStories(org, repo, tasks, taskResults, storyIdToGitHubNumber);
    await this.linkStoriesToEpics(org, repo, stories, storyIdToGitHubNumber, epicIdToGitHubNumber);

    // 4. Processar Timeboxes (Sprints)
    if (timeboxes && timeboxes.length > 0) {
      await this.processTimeboxes(org, repo, projectId, timeboxes, tasks, taskIdToGitHubNumber);
    }
  }

  /**
   * Processa timeboxes (sprints) criando as issues de sprint usando REST API
   */
  public async processTimeboxes(
    org: string,
    repo: string,
    projectId: string,
    timeboxes: TimeBox[],
    allTasks: Issue[],
    taskIdToGitHubNumber: Map<string, number>
  ) {
    console.log(`🚀 Iniciando processamento de ${timeboxes.length} timeboxes...`);

    for (const timebox of timeboxes) {
      try {
        console.log(`📋 Processando timebox: ${timebox.name}`);

        // Obter as tasks relacionadas a esta sprint
        const relatedTasks = timebox.sprintItems
          ? timebox.sprintItems.map(item => item.issue)
          : [];

        console.log(`📝 Encontradas ${relatedTasks.length} tasks relacionadas à sprint`);

        // Criar array de resultados das tasks para referência
        const taskResults = relatedTasks
          .map(task => {
            const taskNumber = taskIdToGitHubNumber.get(task.id);
            return taskNumber ? { issueId: task.id, issueNumber: taskNumber } : null;
          })
          .filter(result => result !== null) as { issueId: string, issueNumber: number }[];

        console.log(`🔗 ${taskResults.length} tasks mapeadas para números do GitHub`);

        // Criar a issue de sprint usando a nova implementação REST
        const sprintResult = await this.sprintPushService.createSprintIssue(
          org,
          repo,
          timebox,
          relatedTasks,
          taskResults
        );

        console.log(`✅ Sprint issue criada: #${sprintResult.number}`);

        // Adicionar labels de sprint às tasks relacionadas
        const taskNumbers = taskResults.map(result => result.issueNumber);
        if (taskNumbers.length > 0) {
          console.log(`🏷️ Adicionando labels de sprint a ${taskNumbers.length} tasks...`);
          await this.sprintPushService.addSprintLabelsToTasks(
            org,
            repo,
            timebox.name,
            taskNumbers
          );
        }

        console.log(`✅ Sprint "${timebox.name}" processada com sucesso: #${sprintResult.number}`);

      } catch (error: any) {
        console.error(`❌ Erro ao processar timebox "${timebox.name}":`, error.message);
        // Não interrompe o processo para outras sprints
        continue;
      }
    }

    console.log(`🎉 Processamento de timeboxes concluído!`);
  }

  public async ensureLabels(org: string, repo: string, backlogs?: Backlog[], timeboxes?: TimeBox[]) {
    await ensureLabelExists(org, repo, { name: 'Feature', color: '1d76db', description: 'Funcionalidade' });
    await ensureLabelExists(org, repo, { name: 'Task', color: 'cccccc', description: 'Tarefa' });
    await ensureLabelExists(org, repo, { name: 'Epic', color: '5319e7', description: 'Epic' });

    // Cria uma label para cada backlog, se houver
    if (backlogs && backlogs.length > 0) {
      for (const backlog of backlogs) {
        await ensureLabelExists(org, repo, { name: backlog.name, color: 'ededed', description: `Backlog: ${backlog.description || ''}` });
      }
    }

    // Cria labels para as sprints/timeboxes, se houver
    if (timeboxes && timeboxes.length > 0) {
      for (const timebox of timeboxes) {
        // Label do nome da sprint
        await ensureLabelExists(org, repo, { 
          name: `sprint: ${timebox.name}`, 
          color: '0052CC', 
          description: `Sprint ${timebox.name}` 
        });

        // Label do status da sprint
        const statusColors: { [key: string]: string } = {
          'PLANNED': 'FEF2C0',
          'IN_PROGRESS': '0E8A16',
          'CLOSED': '5319E7'
        };
        
        await ensureLabelExists(org, repo, { 
          name: `status: ${timebox.status || 'PLANNED'}`, 
          color: statusColors[timebox.status || 'PLANNED'] || 'CCCCCC', 
          description: `Status: ${timebox.status || 'PLANNED'}` 
        });
      }
      
      // Label genérica para tipo sprint
      await ensureLabelExists(org, repo, { name: 'type: sprint', color: 'B60205', description: 'Sprint issue type' });
    }
  }

}