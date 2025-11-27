import { JiraIssuePushService } from '../push/jira/issue.push';
import { JiraProjectPushService } from '../push/jira/project.push';
import { JiraUserPushService } from '../push/jira/user.push';
// import { JiraSprintPushService } from '../push/jira/sprint.push';
// import { JiraRoadmapPushService } from '../push/jira/roadmap.push';
import { JiraTokenManager } from './JiraTokenManager';
import { Project, Issue, Backlog, Team, TimeBox, Roadmap } from '../model/models';
import { getProjectFieldIdByName, setProjectItemField } from '../push/jira/jiraApi';
import { axiosInstance } from '../util/axiosInstance';
import { GenericRepository } from '../repository/generic.repository';
import { Logger } from '../util/logger';
import { ISSUE_TYPES, PROJECT_FIELDS, LABEL_COLORS, STATUS_COLORS, DATA_PATHS, ERROR_MESSAGES } from '../util/constants';

// Serviço para enviar modelos MADE para o Jira
export class JiraPushService {
  private issuePushService: JiraIssuePushService;
  private projectPushService: JiraProjectPushService;
  private userPushService: JiraUserPushService;
  // private sprintPushService: JiraSprintPushService;
  // private roadmapPushService: JiraRoadmapPushService;

  constructor() {
    this.issuePushService = new JiraIssuePushService();
    this.projectPushService = new JiraProjectPushService();
    this.userPushService = new JiraUserPushService();
    // this.sprintPushService = new JiraSprintPushService();
    // this.roadmapPushService = new JiraRoadmapPushService();
  }

  // Cria um projeto no Jira a partir do modelo MADE Project
  async pushProject(project: Project): Promise<string> {

    // Verifica se o projeto já foi processado para este org específico
    // const projectRepo = new GenericRepository<any>('./data/db', 'processed_projects.json');

    // Cria o projeto no Jira
    const projectData = await this.projectPushService.createProject({ key: project.id, name: project.name });

    return projectData.id;
  }

  // Cria uma issue no Jira a partir do modelo MADE Issue e adiciona ao projeto
  async pushIssue(
    org: string,
    repo: string,
    projectId: string,
    issue: Issue,
    allTasks: Issue[] = [],
    allStories: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = [],
    storyResults: { issueId: string, issueNumber: number }[] = []
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }> {
    try {
      // Validate issue before processing
      this.validateIssue(issue);

      // Verifica se a issue já foi processada para este org/repo/projeto específico
      const issueRepo = new GenericRepository<any>('./data/db', 'processed_issues.json');

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

      if (issue.type) {
        try {
          const typeFieldId = await getProjectFieldIdByName(projectId, 'Type');
          if (typeFieldId) {
            await setProjectItemField(projectId, projectItemId, typeFieldId, issue.type);
          }
        } catch (error: any) {
          Logger.warn(`⚠️ Falha ao definir campo 'Type': ${error.message}`);
        }
      }

      if (issue.backlog) {
        try {
          const backlogFieldId = await getProjectFieldIdByName(projectId, 'Backlog');
          if (backlogFieldId) {
            await setProjectItemField(projectId, projectItemId, backlogFieldId, issue.backlog);
          }
        } catch (error: any) {
          Logger.warn(`⚠️ Falha ao definir campo 'Backlog': ${error.message}`);
        }
      }

      // Add the successfully created issue to the processed issues repository
      const processedIssueRepo = new GenericRepository<any>('./data/db', 'processed_issues.json');
      await processedIssueRepo.add({
        id: created.id,
        title: issue.title,
        number: created.number,
        uniqueKey: `${org}/${repo}/${created.id}`,
        org,
        repo,
        processedAt: new Date().toISOString()
      });

      return {
        issueId: created.id,
        issueNumber: created.number,
        projectItemId
      };
    } catch (error: any) {
      Logger.error(`❌ Erro ao processar issue ${issue.title || issue.id}:`, {
        error: error.message,
        issueId: issue.id,
        issueType: issue.type
      });
      throw error;
    }
  }

  // Exemplo: envia um projeto e suas issues
  async pushProjectWithIssues(
    org: string,
    repo: string,
    project: Project,
    issues: Issue[],
    allTasks: Issue[] = []
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }[]> {
    const projectId = await this.pushProject(project);
    const results: { issueId: string; issueNumber: number; projectItemId: string }[] = [];
    for (const issue of issues) {
      const result = await this.pushIssue(
        org,
        repo,
        projectId,
        issue,
        allTasks,
        [],
        [],
        []
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

  // Cria issues no Jira
  public async pushIssues(org: string, repo: string, project: any, issues: any[], allTasks: Issue[] = []) {
    return await this.pushProjectWithIssues(org, repo, project, issues, allTasks);
  }

  // Mapeia id MADE -> issueNumber Jira
  public mapIdToJiraNumber(issues: any[], results: any[]) {
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
    storyIdToJiraNumber: Map<string, number>
  ) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskResult = taskResults[i];
      const depends = Array.isArray(task.depends) ? task.depends : [];
      const storyDep = depends.find((dep: any) => storyIdToJiraNumber.has(dep.id));
      if (storyDep) {
        const storyJiraNumber = storyIdToJiraNumber.get(storyDep.id)!;
        try {
          await this.linkIssues(
            org,
            repo,
            taskResult.issueNumber,
            storyJiraNumber,
            'blocks'
          );
        } catch { }
      }
    }
  }

  // Relaciona stories com suas epics
  public async linkStoriesToEpics(
    org: string,
    repo: string,
    stories: any[],
    storyIdToJiraNumber: Map<string, number>,
    epicIdToJiraNumber: Map<string, number>
  ) {
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const depends = Array.isArray(story.depends) ? story.depends : [];
      const epicDep = depends.find((dep: any) => epicIdToJiraNumber.has(dep.id));
      if (epicDep) {
        const epicJiraNumber = epicIdToJiraNumber.get(epicDep.id)!;
        const storyJiraNumber = storyIdToJiraNumber.get(story.id)!;
        try {
          await this.linkIssues(
            org,
            repo,
            storyJiraNumber,
            epicJiraNumber,
            'blocks'
          );
        } catch { }
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
    const url = `https://api.jira.com/repos/${organizationName}/${repositoryName}/issues/${childIssueNumber}/comments`;
    let body = '';
    if (relation === 'blocks') {
      body = `Depende de #${parentIssueNumber}`;
    } else if (relation === 'is blocked by') {
      body = `Bloqueado por #${parentIssueNumber}`;
    } else {
      body = `Relacionado a #${parentIssueNumber}`;
    }
    const axios_instance = axiosInstance(JiraTokenManager.getInstance().getToken());
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
    timeboxes?: TimeBox[],
    roadmaps?: Roadmap[]
  ) {
    // O projeto precisa ser criado antes de tudo
    const projectId = await this.pushProject(project);

    // Cria as labels necessárias
    await this.ensureLabels(projectId, backlogs, timeboxes, roadmaps);

    // Process all valid issues without existence checking
    const newEpics = epics.filter(issue => issue.title); // Only include issues with titles
    const newStories = stories.filter(issue => issue.title);
    const newTasks = tasks.filter(issue => issue.title);
    const newTimeboxes = timeboxes || [];

    // Adiciona teams antes do restante do fluxo
    if (teams && teams.length > 0) {
      for (const team of teams) {
        // Process team without checking if already exists
        const group = await this.userPushService.createOrEnsureUserGroup({ name: team.name, description: team.description });
        if (team.teamMembers && team.teamMembers.length > 0) {
          for (const member of team.teamMembers) {
            if (member.email) {
              const accountId = await this.userPushService.getAccountId(member.email)
              if (accountId) await this.userPushService.addUserToGroup(group.groupId, accountId);
            }
          }
        }
      }
    }

    // Normaliza e valida issues
    this.prepareIssues(newTasks, 'Task');
    this.prepareIssues(newStories, 'Feature');
    this.prepareIssues(newEpics, 'Epic');

    // 1. Crie Tasks primeiro (são as folhas da árvore de dependências)
    const taskResults = newTasks.length > 0
      ? await this.processIssuesInBatches(org, repo, projectId, newTasks, [], [], [], [])
      : [];
    const taskIdToJiraId = new Map<string, string>();
    const taskIdToJiraNumber = new Map<string, number>();
    newTasks.forEach((task: Issue, idx: number) => {
      if (task.id && taskResults[idx]) {
        taskIdToJiraId.set(task.id, taskResults[idx].issueId);
        taskIdToJiraNumber.set(task.id, taskResults[idx].issueNumber);
      }
    });
    const storyResults = newStories.length > 0
      ? await this.processIssuesInBatches(org, repo, projectId, newStories, newTasks, [], taskResults, [])
      : [];
    const storyIdToJiraId = new Map<string, string>();
    const storyIdToJiraNumber = new Map<string, number>();
    newStories.forEach((story: Issue, idx: number) => {
      if (story.id && storyResults[idx]) {
        storyIdToJiraId.set(story.id, storyResults[idx].issueId);
        storyIdToJiraNumber.set(story.id, storyResults[idx].issueNumber);
      }
    });
    const epicResults = newEpics.length > 0
      ? await this.processIssuesInBatches(org, repo, projectId, newEpics, [], newStories, [], storyResults)
      : [];
    const epicIdToJiraId = new Map<string, string>();
    const epicIdToJiraNumber = new Map<string, number>();
    newEpics.forEach((epic: Issue, idx: number) => {
      if (epic.id && epicResults[idx]) {
        epicIdToJiraId.set(epic.id, epicResults[idx].issueId);
        epicIdToJiraNumber.set(epic.id, epicResults[idx].issueNumber);
      }
    });
    await this.linkTasksToStories(org, repo, newTasks, taskResults, storyIdToJiraNumber);
    await this.linkStoriesToEpics(org, repo, newStories, storyIdToJiraNumber, epicIdToJiraNumber);
    if (roadmaps && roadmaps.length > 0) {
      await this.processRoadmaps(org, repo, roadmaps);
    }
    if (newTimeboxes && newTimeboxes.length > 0) {
      await this.processTimeboxes(org, repo, projectId, newTimeboxes, newTasks, taskIdToJiraNumber);
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
    taskIdToJiraNumber: Map<string, number>
  ) {
    const timeboxRepo = new GenericRepository<any>('./data/db', 'processed_timeboxes.json');

    for (const timebox of timeboxes) {
      try {

        // Obter as tasks relacionadas a esta sprint
        const relatedTasks = timebox.sprintItems
          ? timebox.sprintItems.map(item => item.issue)
          : [];

        // Criar array de resultados das tasks para referência
        const taskResults = relatedTasks
          .map(task => {
            const taskNumber = taskIdToJiraNumber.get(task.id);
            return taskNumber ? { issueId: task.id, issueNumber: taskNumber } : null;
          })
          .filter(result => result !== null) as { issueId: string, issueNumber: number }[];

        // Sprint functionality is currently disabled
        Logger.info(`ℹ️ Sprint functionality is disabled. Skipping sprint issue creation for: ${timebox.name}`);

        // TODO: Re-enable when sprint functionality is restored
        // const sprintResult = await this.sprintPushService.createSprintIssue(
        //   org,
        //   repo,
        //   timebox,
        //   relatedTasks,
        //   taskResults
        // );

        // const taskNumbers = taskResults.map(result => result.issueNumber);
        // if (taskNumbers.length > 0) {
        //   await this.sprintPushService.addSprintLabelsToTasks(
        //     org,
        //     repo,
        //     timebox.name,
        //     taskNumbers
        //   );
        // }

      } catch (error: any) {
        Logger.error(`❌ Erro ao processar timebox "${timebox.name}":`, error.message);
        // Não interrompe o processo para outras sprints
        continue;
      }
    }

    Logger.success(`🎉 Processamento de timeboxes concluído!`);
  }

  /**
   * Processa roadmaps criando milestones e labels correspondentes
   */
  public async processRoadmaps(
    org: string,
    repo: string,
    roadmaps: Roadmap[]
  ) {
    for (const roadmap of roadmaps) {
      try {

        // Criar labels específicas do roadmap
        await this.roadmapPushService.createRoadmapLabels(org, repo, roadmap);

        // Criar milestones do roadmap
        const roadmapResult = await this.roadmapPushService.createRoadmap(org, repo, roadmap);

      } catch (error: any) {
        Logger.error(`❌ Erro ao processar roadmap "${roadmap.name}":`, error.message);
        // Não interrompe o processo para outros roadmaps
        continue;
      }
    }
  }

  public async ensureLabels(projectId: string, backlogs?: Backlog[], timeboxes?: TimeBox[], roadmaps?: Roadmap[]) {
    Logger.info('🏷️ Criando labels necessárias...');
    // Label dos tipos de issues
    const issueTypeLabels = [ISSUE_TYPES.FEATURE, ISSUE_TYPES.TASK, ISSUE_TYPES.EPIC];

    // Cria labels para cada backlog, se houver
    // Label dos backlog, se houver
    const backlogLabels = (backlogs && backlogs.length > 0) ? backlogs.map(backlog => backlog.name) : [];

    // Cria labels para as sprints/timeboxes, se houver
    // Label do nome da sprint
    const timeboxLabels = (timeboxes && timeboxes.length > 0) ? timeboxes.map(timebox => `sprint: ${timebox.name}`) : [];
    // Label do status da sprint
    const timeboxStatusLabels = (timeboxes && timeboxes.length > 0) ? timeboxes.map(timebox => `status: ${timebox.status || 'PLANNED'}`) : [];
    // Label genérica para tipo sprint
    const timeboxGenericLabels = (timeboxes && timeboxes.length > 0) ? ['type: sprint'] : [];

    // Cria labels para roadmaps, se houver
    // Labels genéricas para roadmap
    const roadmapGenericLabels = ['type: roadmap', 'type: milestone'];
    // Labels para status de milestones
    const statusesLabelable = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'].map(status => `milestone: ${status.toLowerCase()}`);
    // Labels para status de releases
    const releaseStatuses = ['PLANNED', 'IN_DEVELOPMENT', 'TESTING', 'RELEASED'].map(status => `release: ${status.toLowerCase()}`);
    // Label para o roadmap
    const roadmapNames = (roadmaps && roadmaps.length > 0) ? roadmaps.map(roadmap => roadmap.name ? roadmap.name : '').filter(label => !!label) : [];
    const roadmapLabels = roadmapNames.map(roadmapName => `roadmap: ${roadmapName}`);
    const roadmapNameExpressions = roadmapNames.join(', ')

    // Criando todas as labels de uma vez
    await this.issuePushService.ensureLabelExists(projectId, [...issueTypeLabels, ...backlogLabels, ...timeboxLabels, ...timeboxStatusLabels, ...timeboxGenericLabels, ...roadmapGenericLabels, ...roadmapLabels, ...statusesLabelable, ...releaseStatuses]);

    if (roadmapNameExpressions) {
      console.log(`✅ Labels do(s) roadmap(s) "${roadmapNameExpressions}" criadas com sucesso`);
    }
  }

  /**
   * Processa issues em batches para reduzir sobrecarga na API
   */
  private async processIssuesInBatches(
    org: string,
    repo: string,
    projectId: string,
    issues: Issue[],
    allTasks: Issue[] = [],
    allStories: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = [],
    storyResults: { issueId: string, issueNumber: number }[] = [],
    batchSize: number = 3 // Reduzir tamanho do batch
  ): Promise<{ issueId: string; issueNumber: number; projectItemId: string }[]> {
    const results: { issueId: string; issueNumber: number; projectItemId: string }[] = [];

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);

      try {
        const batchResults = await Promise.all(
          batch.map(issue => this.pushIssue(org, repo, projectId, issue, allTasks, allStories, taskResults, storyResults))
        );
        results.push(...batchResults);

        // Delay entre batches para evitar rate limiting
        if (i + batchSize < issues.length) {
          const delay = 1000; // 1 segundo entre batches
          Logger.info(`⏳ Aguardando ${delay}ms antes do próximo batch...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        Logger.error(`❌ Erro no batch ${Math.floor(i / batchSize) + 1}:`, error.message);

        // Tentar processar individualmente em caso de erro no batch
        Logger.info(`🔄 Tentando processar issues individualmente...`);
        for (const issue of batch) {
          try {
            const result = await this.pushIssue(org, repo, projectId, issue, allTasks, allStories, taskResults, storyResults);
            results.push(result);

            // Delay entre issues individuais
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (individualError: any) {
            Logger.error(`❌ Falha ao processar issue individual ${issue.title || issue.id}:`, individualError.message);
            // Continuar com as outras issues
          }
        }
      }
    }

    Logger.success(`✅ Processamento concluído: ${results.length}/${issues.length} issues processadas com sucesso`);
    return results;
  }
}
