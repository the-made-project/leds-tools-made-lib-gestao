import { GitHubService } from './GitHubService';
import { GitHubPushService } from './GitHubPushService';
import { GenericRepository } from '../repository/generic.repository';
import { Issue, Project, TimeBox, Milestone, Team } from '../model/models';

export class GitHubSyncService {
  private githubService: GitHubService;
  private pushService: GitHubPushService;

  constructor() {
    this.githubService = new GitHubService();
  }

  /**
   * Sincroniza dados do GitHub para o repositório interno
   */
  async syncFromGitHub(org: string, projectTitle: string): Promise<void> {
    console.log(`🔄 Iniciando sincronização do projeto "${projectTitle}" da organização "${org}"`);

    const projectExists = await this.projectExistsInGitHub(projectTitle);
    if (!projectExists) {
        console.warn(`⚠️ Projeto "${projectTitle}" não existe no GitHub. Sincronização abortada.`);
        return;
    }

    try {
      // 1. Extrair e carregar projeto
      await this.githubService.ETLProject(org, projectTitle);
      
      // 2. Extrair e carregar milestones
      await this.githubService.ETLMilestone(org, projectTitle);
      
      // 3. Extrair e carregar sprints/timeboxes
      await this.githubService.ETLTimeBox(org, projectTitle);
      
      // 4. Extrair e carregar issues
      await this.githubService.ETLIssue(org, projectTitle);
      
      // 5. Extrair e carregar backlog
      await this.githubService.ETLBacklog(org, projectTitle);

      // 6. Extrair e carregar teams
      await this.githubService.ETLTeam(org);

      console.log(`✅ Sincronização concluída para o projeto "${projectTitle}"`);
    } catch (error: any) {
      console.error(`❌ Erro na sincronização: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica se uma issue já existe no GitHub baseada no título
   */
  async issueExistsInGitHub(issueTitle: string): Promise<boolean> {
    try {
      const issueRepo = new GenericRepository<Issue>('./data/db', 'processed_issues.json');
      
      return issueRepo.exists(issue => 
        issue.title?.trim().toLowerCase() === issueTitle.trim().toLowerCase()
      );
    } catch (error) {
      // Se o arquivo não existir ou houver erro, assumir que a issue não existe
      console.warn(`⚠️ Erro ao verificar existência da issue "${issueTitle}": ${error}`);
      return false;
    }
  }

  /**
   * Verifica se um projeto já existe no GitHub baseado no nome
   */
  async projectExistsInGitHub(projectName: string): Promise<boolean> {
    try {
      const projectRepo = new GenericRepository<Project>('./data/db', 'processed_projects.json');
      
      return projectRepo.exists(project => 
        project.name?.trim().toLowerCase() === projectName.trim().toLowerCase()
      );
    } catch (error) {
      // Se o arquivo não existir ou houver erro, assumir que o projeto não existe
      console.warn(`⚠️ Erro ao verificar existência do projeto "${projectName}": ${error}`);
      return false;
    }
  }

  /**
   * Verifica se uma sprint já existe no GitHub baseada no nome
   * Sprints são representadas como TimeBox no nosso modelo
   */
  async sprintExistsInGitHub(sprintName: string): Promise<boolean> {
    try {
      // Sprints são armazenadas como TimeBox em processed_timeboxes.json
      const timeboxRepo = new GenericRepository<TimeBox>('./data/db', 'processed_timeboxes.json');
      
      return timeboxRepo.exists(timebox => 
        timebox.name?.trim().toLowerCase() === sprintName.trim().toLowerCase()
      );
    } catch (error) {
      // Se o arquivo não existir ou houver erro, assumir que a sprint não existe
      console.warn(`⚠️ Erro ao verificar existência da sprint "${sprintName}": ${error}`);
      return false;
    }
  }

  /**
   * Verifica se um team já existe no GitHub baseado no nome
   */
  async teamExistsInGitHub(teamName: string): Promise<boolean> {
    try {
      const teamRepo = new GenericRepository<Team>('./data/db', 'processed_teams.json');
      
      return teamRepo.exists(team => 
        team.name?.trim().toLowerCase() === teamName.trim().toLowerCase()
      );
    } catch (error) {
      // Se o arquivo não existir ou houver erro, assumir que o team não existe
      console.warn(`⚠️ Erro ao verificar existência do team "${teamName}": ${error}`);
      return false;
    }
  }

  /**
   * Filtra issues que não existem no GitHub
   */
  async filterNewIssues(issues: Issue[]): Promise<Issue[]> {
    const newIssues: Issue[] = [];
    
    for (const issue of issues) {
      if (issue.title) {
        const exists = await this.issueExistsInGitHub(issue.title);
        if (!exists) {
          newIssues.push(issue);
        } else {
          console.log(`⚠️ Issue "${issue.title}" já existe no GitHub, pulando...`);
        }
      } else {
        console.warn(`⚠️ Issue sem título encontrada: ${JSON.stringify(issue)}`);
      }
    }
    
    return newIssues;
  }

  /**
   * Filtra sprints que não existem no GitHub
   */
  async filterNewSprints(sprints: TimeBox[]): Promise<TimeBox[]> {
    const newSprints: TimeBox[] = [];
    
    for (const sprint of sprints) {
      if (sprint.name) {
        const exists = await this.sprintExistsInGitHub(sprint.name);
        if (!exists) {
          newSprints.push(sprint);
        } else {
          console.log(`⚠️ Sprint "${sprint.name}" já existe no GitHub, pulando...`);
        }
      }
    }
    
    return newSprints;
  }

  /**
   * Filtra teams que não existem no GitHub
   */
  async filterNewTeams(teams: Team[]): Promise<Team[]> {
    const newTeams: Team[] = [];
    
    for (const team of teams) {
      if (team.name) {
        const exists = await this.teamExistsInGitHub(team.name);
        if (!exists) {
          newTeams.push(team);
        } else {
          console.log(`⚠️ Team "${team.name}" já existe no GitHub, pulando...`);
        }
      }
    }
    
    return newTeams;
  }

  /**
   * Filtra projetos que não existem no GitHub
   */
  async filterNewProjects(projects: Project[]): Promise<Project[]> {
    const newProjects: Project[] = [];
    
    for (const project of projects) {
      if (project.name) {
        const exists = await this.projectExistsInGitHub(project.name);
        if (!exists) {
          newProjects.push(project);
        } else {
          console.log(`⚠️ Projeto "${project.name}" já existe no GitHub, pulando...`);
        }
      }
    }
    
    return newProjects;
  }
}