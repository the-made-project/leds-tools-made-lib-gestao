// github.service.ts
import { GitHubIssue, IssueService } from './issue.service';
import { GitHubMilestone, MilestoneService } from './milestone.service';
import { GitHubProject,GitHubProjectService } from './project.service';

/**
 * Serviço principal que coordena as operações do GitHub
 */
export class GitHubService {
  private milestoneService: MilestoneService;
  private issueService: IssueService;
  private projectService: GitHubProjectService;
  /**
   * Construtor da classe
   * @param token Token de autenticação GitHub (opcional)
   */
  constructor(token: string) {
    this.milestoneService = new MilestoneService(token);
    this.issueService = new IssueService(token);
    this.projectService = new GitHubProjectService(token);
  }
  
  async getMilestonesFromProjectNumber(org: string, projectNumber: number): Promise<GitHubMilestone[]> {
    return this.milestoneService.getFromProject(org, projectNumber);
  }

  async getIssuesFromMilestoneInProject(
    org: string,
    projectNumber: number,
    milestoneNumber: number
  ): Promise<GitHubIssue[]> {
    return this.issueService.getFromMilestoneInProject(
      org,
      projectNumber,
      milestoneNumber
    );
  }

  async getIssesWithoutMilestoneInProject(
    org: string,
    projectNumber: number
  ): Promise<GitHubIssue[]> {
    return this.issueService.getWithoutMilestonesInProject(org, projectNumber);
  }

 
  async getProjects(
    owner: string
  ): Promise<GitHubProject[]> {
    return this.projectService.getAll(owner);
  }

  async getProjectByTitle(
    org: string, 
    projectTitle: string
  ):  Promise<GitHubProject | null> {
    return this.projectService.getByTitle(org, projectTitle);
  }
  
  
  
  
}