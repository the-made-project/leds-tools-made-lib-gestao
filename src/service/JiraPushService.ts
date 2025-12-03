import { JiraIssuePushService } from "../push/jira/issue.push";
import { JiraIssueLinkPushService } from "../push/jira/issueLink.push";
import { JiraIssueLinkTypePushService } from "../push/jira/issueLinkType.push";
import {
  JiraIssueType,
  JiraIssueTypePushService,
} from "../push/jira/issueType.push";
import {
  JiraProjectCreated,
  JiraProjectPushService,
} from "../push/jira/project.push";
import { JiraRoadmapPushService } from "../push/jira/roadmap.push";
import { JiraUserPushService } from "../push/jira/user.push";
import { JiraBoardType, JiraSprintPushService } from "../push/jira/sprint.push";
import {
  Project,
  Issue,
  Backlog,
  Team,
  TimeBox,
  Roadmap,
  Release,
} from "../model/models";
import { Logger } from "../util/logger";
import { ISSUE_TYPES, ISSUE_TYPES_TRANSLATED } from "../util/constants";

// Serviço para enviar modelos MADE para o Jira
export class JiraPushService {
  private issuePushService: JiraIssuePushService;
  private issueLinkPushService: JiraIssueLinkPushService;
  private issueLinkTypePushService: JiraIssueLinkTypePushService;
  private issueTypePushService: JiraIssueTypePushService;
  private projectPushService: JiraProjectPushService;
  private roadmapPushService: JiraRoadmapPushService;
  private sprintPushService: JiraSprintPushService;
  private userPushService: JiraUserPushService;

  constructor() {
    this.issuePushService = new JiraIssuePushService();
    this.issueLinkPushService = new JiraIssueLinkPushService();
    this.issueLinkTypePushService = new JiraIssueLinkTypePushService();
    this.issueTypePushService = new JiraIssueTypePushService();
    this.projectPushService = new JiraProjectPushService();
    this.roadmapPushService = new JiraRoadmapPushService();
    this.sprintPushService = new JiraSprintPushService();
    this.userPushService = new JiraUserPushService();
  }

  /**
   * @description Cria um projeto no Jira a partir do modelo MADE Project
   * @author Douglas Lima
   * @date 30/11/2025
   * @param {Project} project
   * @param {string} accountId
   * @return {*}  {Promise<JiraProjectCreated>}
   * @memberof JiraPushService
   */
  async pushProject(
    project: Project,
    accountId: string
  ): Promise<JiraProjectCreated> {
    // Verifica se o projeto já foi processado para este org específico
    // const projectRepo = new GenericRepository<any>('./data/db', 'processed_projects.json');

    // Cria o projeto no Jira
    const projectData = await this.projectPushService.createProject({
      key: project.id,
      name: project.name,
      projectTypeKey: "software",
      projectTemplateKey:
        "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum",
      description:
        project.description || `Project - ${project.id} ${project.name}`,
      leadAccountId: accountId,
      assigneeType: "UNASSIGNED",
    });

    return {
      id: projectData.id,
      key: projectData.key,
    } as JiraProjectCreated;
  }

  /**
   * @description Normaliza e valida issues
   * @author Douglas Lima
   * @date 30/11/2025
   * @param {any[]} issues
   * @param {string} type
   * @memberof JiraPushService
   */
  public prepareIssues(issues: any[], type: string) {
    for (const issue of issues) {
      issue.type = this.normalizeType(type);
      this.validateIssue(issue);
    }
  }

  /**
   * @description Normaliza o campo type
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {string} type
   * @return {*}  {string}
   * @memberof JiraPushService
   */
  private normalizeType(type: string): string {
    if (!type) return "";
    const t = type.toLowerCase();
    if (t === "epic") return ISSUE_TYPES.EPIC;
    if (t === "feature" || t === "story") return ISSUE_TYPES.STORY;
    if (t === "subtask") return ISSUE_TYPES.SUBTASK;
    return type;
  }

  /**
   * @description Valida campos obrigatórios
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {*} issue
   * @memberof JiraPushService
   */
  private validateIssue(issue: any) {
    if (!issue.title)
      throw new Error(`Issue sem título detectada: ${JSON.stringify(issue)}`);
    if (!issue.id)
      throw new Error(`Issue sem id detectada: ${JSON.stringify(issue)}`);
  }

  /**
   * @description Apply the process to all Made data
   * @author Douglas Lima
   * @date 30/11/2025
   * @param {Project} project
   * @param {Issue[]} epics
   * @param {Issue[]} stories
   * @param {Issue[]} tasks
   * @param {Backlog[]} [backlogs]
   * @param {Team[]} [teams]
   * @param {TimeBox[]} [timeboxes]
   * @param {Roadmap[]} [roadmaps]
   * @memberof JiraPushService
   */
  public async fullPush(
    project: Project,
    epics: Issue[],
    stories: Issue[],
    tasks: Issue[],
    backlogs?: Backlog[],
    teams?: Team[],
    timeboxes?: TimeBox[],
    roadmaps?: Roadmap[]
  ) {
    // Definindo o accountId do usuário líder do projeto
    console.log(`ℹ️ Buscando Jira Account Id para ser o Líder do projeto`);
    const userEmail =
      teams &&
      teams.length &&
      teams[0].teamMembers &&
      teams[0].teamMembers.length
        ? teams[0].teamMembers[0].email
        : "";
    const accountId = await this.userPushService.getAccountId(userEmail);
    console.log(
      `✅ Jira Account Id do Líder do projeto encontrado: userEmail=${userEmail} accountId=${accountId}`
    );

    // O projeto precisa ser criado antes de tudo
    const { key: projectKey, id: projectId } = await this.pushProject(
      project,
      accountId || ""
    );

    // Cria as labels necessárias
    await this.ensureLabels(projectId, backlogs, timeboxes, roadmaps);

    // Process all valid issues without existence checking
    const newEpics = epics.filter((issue) => issue.title); // Only include issues with titles
    const newStories = stories.filter((issue) => issue.title);
    const newTasks = tasks.filter((issue) => issue.title);
    const newTimeboxes = timeboxes || [];

    // Adiciona teams antes do restante do fluxo
    const memberToJiraAccountId = new Map<string, string>();
    if (teams && teams.length) {
      for (const team of teams) {
        // Process team without checking if already exists
        const group = await this.userPushService.createOrEnsureUserGroup({
          name: team.name,
          description: team.description,
        });

        if (team.teamMembers && team.teamMembers.length) {
          const usersInGroup = await this.userPushService.getUsersInGroup(
            group.groupId
          );

          for (const member of team.teamMembers) {
            if (member.email) {
              const accountId = await this.userPushService.getAccountId(
                member.email
              );
              if (accountId) {
                memberToJiraAccountId.set(member.email, accountId);
                if (!usersInGroup.includes(accountId))
                  await this.userPushService.addUserToGroup(
                    group.groupId,
                    accountId
                  );
              }
            }
          }
        }
      }
    }

    // Normaliza e valida as issues
    this.prepareIssues(newTasks, ISSUE_TYPES.SUBTASK);
    this.prepareIssues(newStories, ISSUE_TYPES.STORY);
    this.prepareIssues(newEpics, ISSUE_TYPES.EPIC);

    // Buscando todas issueTypes e issueLinkTypes
    const issueTypes = await this.getAllIssueTypesFromProject(projectId);
    const projectIssueTypes = issueTypes.filter(
      (type) =>
        type.scope &&
        type.scope.project &&
        type.scope.project.id &&
        type.scope.project.id === projectId
    );
    const issueLinkTypes =
      await this.issueLinkTypePushService.getIssueLinkTypes();
    const issueLinkType = issueLinkTypes.find(
      (link) => link.outward === "blocks"
    )!;
    const issueLinksToCreate: {
      issueLinkTypeId: string;
      issueKey: string;
      parentKey: string;
    }[] = [];

    // 1. Criando as Epics (1º nível na hierarquia de Issues)
    const epicResults = newEpics.length
      ? await this.processIssuesInBatches(
          projectId,
          newEpics,
          projectIssueTypes,
          new Map<string, string>(),
          memberToJiraAccountId
        )
      : [];
    const epicIdToJiraIssueKey = new Map<string, string>();
    newEpics.forEach((epic: Issue, idx: number) => {
      if (epic.id && epicResults[idx]) {
        epicIdToJiraIssueKey.set(epic.id, epicResults[idx].issueKey);
      }
    });

    // 2. Criando as Stories (2º nível na hierarquia de Issues)
    const storyResults = newStories.length
      ? await this.processIssuesInBatches(
          projectId,
          newStories,
          projectIssueTypes,
          epicIdToJiraIssueKey,
          memberToJiraAccountId
        )
      : [];
    const storyIdToJiraIssueKey = new Map<string, string>();
    newStories.forEach((story: Issue, idx: number) => {
      if (story.id && storyResults[idx]) {
        const issueKey = storyResults[idx].issueKey;
        const parentKey = epicIdToJiraIssueKey.get(
          (story.depends || [])[0]?.id || ""
        )!;

        storyIdToJiraIssueKey.set(story.id, issueKey);
        issueLinksToCreate.push({
          issueLinkTypeId: issueLinkType.id,
          issueKey,
          parentKey,
        });
      }
    });

    // 3. Criando as Tasks (3º nível na hierarquia de Issues)
    const taskResults = newTasks.length
      ? await this.processIssuesInBatches(
          projectId,
          newTasks,
          projectIssueTypes,
          storyIdToJiraIssueKey,
          memberToJiraAccountId
        )
      : [];
    const taskIdToJiraIssueKey = new Map<string, string>();
    newTasks.forEach((task: Issue, idx: number) => {
      if (task.id && taskResults[idx]) {
        const issueKey = taskResults[idx].issueKey;
        const parentKey = storyIdToJiraIssueKey.get(
          (task.depends || [])[0]?.id || ""
        )!;

        taskIdToJiraIssueKey.set(task.id, issueKey);
        issueLinksToCreate.push({
          issueLinkTypeId: issueLinkType.id,
          issueKey,
          parentKey,
        });
      }
    });

    // 4. Realizando os links entre as issues de acordo com a hierarquia
    await this.processIssueLinksInBatches(issueLinksToCreate);

    // Processando os roadmaps
    if (roadmaps && roadmaps.length) {
      await this.processRoadmaps(
        projectId,
        roadmaps,
        new Map([
          ...epicIdToJiraIssueKey,
          ...storyIdToJiraIssueKey,
          ...taskIdToJiraIssueKey,
        ])
      );
    }

    // Processando os timeboxes
    if (newTimeboxes && newTimeboxes.length) {
      await this.processTimeboxes(
        projectId,
        projectKey,
        newTimeboxes,
        taskIdToJiraIssueKey
      );
    }
  }

  /**
   * Processa timeboxes (sprints) criando as issues de sprint usando REST API
   */
  public async processTimeboxes(
    projectId: string,
    projectKey: string,
    timeboxes: TimeBox[],
    taskIdToJiraIssueKey: Map<string, string>
  ): Promise<void> {
    console.log(`🗺️ Processando TimeBoxes...`);

    // const timeboxRepo = new GenericRepository<any>('./data/db', 'processed_timeboxes.json');

    for (const timebox of timeboxes) {
      try {
        console.log(
          `ℹ️ Inserindo a timebox/sprint: ${timebox.name || "Unnamed Timebox"}`
        );

        // Obter as task keys relacionadas a esta sprint
        const relatedTaskKeys = ((timebox && timebox.sprintItems) ?? [])
          .map((item) => item.issue)
          .map((task) => taskIdToJiraIssueKey.get(task.id))
          .filter((result) => !!result) as string[];

        // Criando a sprint se não houver ainda
        const sprintId = await this.sprintPushService.createSprint(
          projectId,
          projectKey,
          JiraBoardType.scrum,
          timebox
        );

        if (relatedTaskKeys.length) {
          await this.sprintPushService.addIssuesToSprint(
            sprintId,
            relatedTaskKeys
          );
        }

        console.log(
          `✅ Timebox/sprint "${timebox.name}" processada com sucesso.`
        );
      } catch (error: any) {
        Logger.error(
          `❌ Erro ao processar timebox "${timebox.name}":`,
          error.message
        );
        continue;
      }
    }

    Logger.success(`✅ Processamento de timeboxes concluído!`);
  }

  /**
   * Processa roadmaps criando milestones e labels correspondentes
   */
  public async processRoadmaps(
    projectId: string,
    roadmaps: Roadmap[],
    issueIdToJiraIssueKey: Map<string, string>
  ) {
    for (const roadmap of roadmaps) {
      try {
        // Criar milestones do roadmap
        await this.roadmapPushService.createRoadmap(
          projectId,
          roadmap,
          issueIdToJiraIssueKey
        );
      } catch (error: any) {
        Logger.error(
          `❌ Erro ao processar roadmap "${roadmap.name}":`,
          error.message
        );
        // Não interrompe o processo para outros roadmaps
        continue;
      }
    }
  }

  public async ensureLabels(
    projectId: string,
    backlogs?: Backlog[],
    timeboxes?: TimeBox[],
    roadmaps?: Roadmap[]
  ) {
    Logger.info("🏷️ Criando labels necessárias...");
    // Label dos tipos de issues
    const issueTypeLabels = Object.values(ISSUE_TYPES);

    // Cria labels para cada backlog, se houver
    // Label dos backlog, se houver
    const backlogLabels =
      backlogs && backlogs.length
        ? backlogs.map((backlog) => backlog.name)
        : [];

    // Cria labels para as sprints/timeboxes, se houver
    // Label do nome da sprint
    const timeboxLabels =
      timeboxes && timeboxes.length
        ? timeboxes.map((timebox) => `sprint:${timebox.name}`)
        : [];
    // Label do status da sprint
    const timeboxStatusLabels =
      timeboxes && timeboxes.length
        ? timeboxes.map((timebox) => `status:${timebox.status || "PLANNED"}`)
        : [];
    // Label genérica para tipo sprint
    const timeboxGenericLabels =
      timeboxes && timeboxes.length ? ["type:sprint"] : [];

    // Cria labels para roadmaps, se houver
    // Labels genéricas para roadmap
    const roadmapGenericLabels = ["type:roadmap", "type:milestone"];
    // Labels para status de milestones
    const milestoneStatusesLabelable = [
      "PLANNED",
      "IN_PROGRESS",
      "COMPLETED",
      "DELAYED",
    ].map((status) => `milestone:${status.toLowerCase()}`);
    // Labels para status de releases
    const releaseStatuses = [
      "PLANNED",
      "IN_DEVELOPMENT",
      "TESTING",
      "RELEASED",
    ].map((status) => `release:${status.toLowerCase()}`);
    // Label para o roadmap
    const roadmapNames =
      roadmaps && roadmaps.length
        ? roadmaps
            .map((roadmap) => (roadmap.name ? roadmap.name : ""))
            .filter((label) => !!label)
        : [];
    const roadmapLabels = roadmapNames.map(
      (roadmapName) => `roadmap:${roadmapName}`
    );
    const roadmapNameExpressions = roadmapNames.join(", ");

    // Label para as releases
    const roadmapMilestoneReleases = (roadmaps ?? []).reduce(
      (acc: Release[], roadmap) => {
        (roadmap.milestones ?? []).forEach((milestone) => {
          // Concatena o array de releases deste milestone no acumulador (acc)
          acc = acc.concat(milestone.releases ?? []);
        });
        return acc;
      },
      []
    );
    const releaseLabelable = roadmapMilestoneReleases
      .filter((release) => !!release && release.version)
      .map((release) => `release: ${release.version}`);

    // Criando todas as labels de uma vez
    await this.issuePushService.ensureLabelExists(projectId, [
      ...issueTypeLabels,
      ...backlogLabels,
      ...timeboxLabels,
      ...timeboxStatusLabels,
      ...timeboxGenericLabels,
      ...roadmapGenericLabels,
      ...roadmapLabels,
      ...milestoneStatusesLabelable,
      ...releaseStatuses,
      ...releaseLabelable,
    ]);

    if (roadmapNameExpressions) {
      console.log(
        `✅ Labels do(s) roadmap(s) "${roadmapNameExpressions}" criadas com sucesso`
      );
    }
  }

  /**
   * Processa issues em batches para reduzir sobrecarga na API
   */
  private async processIssuesInBatches(
    projectId: string,
    issues: Issue[],
    issueTypes: JiraIssueType[],
    parentIssues: Map<string, string>,
    members: Map<string, string>,
    batchSize: number = 3
  ): Promise<{ issueId: string; issueKey: string }[]> {
    const results: { issueId: string; issueKey: string }[] = [];
    const delay = 1000; // 1 segundo entre batches

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);

      try {
        const batchResults = await Promise.all(
          batch.map((issue) =>
            this.issuePushService.prepareAndCreateIssue(
              projectId,
              issue,
              issueTypes,
              parentIssues,
              members
            )
          )
        );
        batch.forEach((issue: Issue, idx: number) => {
          if (issue.id && batchResults[idx]) {
            results.push({
              issueId: issue.id,
              issueKey: batchResults[idx].key,
            });
          }
        });

        // Delay entre batches para evitar rate limiting
        if (i + batchSize < issues.length) {
          Logger.info(`⏳ Aguardando ${delay}ms antes do próximo batch...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error: any) {
        Logger.error(
          `❌ Erro no batch ${Math.floor(i / batchSize) + 1}:`,
          error.message
        );

        // Tentar processar individualmente em caso de erro no batch
        Logger.info(`🔄 Tentando processar issues individualmente...`);
        for (const issue of batch) {
          try {
            const result = await this.issuePushService.prepareAndCreateIssue(
              projectId,
              issue,
              issueTypes,
              parentIssues,
              members
            );
            results.push({ issueId: issue.id, issueKey: result.key });

            // Delay entre issues individuais
            await new Promise((resolve) => setTimeout(resolve, delay / 2));
          } catch (individualError: any) {
            Logger.error(
              `❌ Falha ao processar issue individual ${
                issue.title || issue.id
              }:`,
              individualError.message
            );
            // Continuar com as outras issues
          }
        }
      }
    }

    Logger.success(
      `✅ Processamento concluído: ${results.length}/${issues.length} issues processadas com sucesso`
    );
    return results;
  }

  /**
   * Processa issues em batches para reduzir sobrecarga na API
   */
  private async processIssueLinksInBatches(
    issueLinks: {
      issueLinkTypeId: string;
      issueKey: string;
      parentKey: string;
    }[],
    batchSize: number = 3
  ): Promise<void> {
    const results = [];

    console.log(
      `ℹ️ Realizando os links entres as issues, respeitando a hierarquia entre eles`
    );

    for (let i = 0; i < issueLinks.length; i += batchSize) {
      const batch = issueLinks.slice(i, i + batchSize);

      try {
        const batchResults = await Promise.all(
          batch.map((issueLink) =>
            this.issueLinkPushService.createIssueLink(
              issueLink.issueLinkTypeId,
              issueLink.issueKey,
              issueLink.parentKey
            )
          )
        );
        results.push(...batchResults);

        // Delay entre batches para evitar rate limiting
        if (i + batchSize < issueLinks.length) {
          const delay = 1000; // 1 segundo entre batches
          Logger.info(`⏳ Aguardando ${delay}ms antes do próximo batch...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error: any) {
        Logger.error(
          `❌ Erro no batch ${Math.floor(i / batchSize) + 1}:`,
          error.message
        );

        // Tentar processar individualmente em caso de erro no batch
        Logger.info(`🔄 Tentando processar os issue links individualmente...`);
        for (const issue of batch) {
          try {
            const result = await this.issueLinkPushService.createIssueLink(
              issue.issueLinkTypeId,
              issue.issueKey,
              issue.parentKey
            );
            results.push(result);

            // Delay entre issues individuais
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (individualError: any) {
            Logger.error(
              `❌ Falha ao processar o link individual entre as issues ${issue.issueKey} e ${issue.parentKey}:`,
              individualError.message
            );
            // Continuar com as outras issues
          }
        }
      }
    }

    Logger.success(
      `✅ Processamento concluído: ${results.length}/${issueLinks.length} issue links processados com sucesso`
    );
  }

  /**
   * Get all issue types from a project, retrying if none are found
   * @param projectId
   * @returns
   */
  private async getAllIssueTypesFromProject(
    projectId: string
  ): Promise<JiraIssueType[]> {
    const issueTypes = await this.issueTypePushService.getIssueTypesForProject(
      projectId
    );
    const issuTypesToFilter = [
      ISSUE_TYPES.EPIC,
      ISSUE_TYPES.STORY,
      ISSUE_TYPES.SUBTASK,
    ];
    const issueType = issueTypes.filter(
      (type) =>
        issuTypesToFilter.includes(type.untranslatedName as any) ||
        issuTypesToFilter.includes(
          ISSUE_TYPES_TRANSLATED[type.untranslatedName] as any
        )
    );

    if (!issueTypes || issueTypes.length < 3) {
      console.log(
        `ℹ️ Identificando os issue types do projeto, tentando buscá-los novamente...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return this.getAllIssueTypesFromProject(projectId);
    }

    return issueTypes;
  }
}
