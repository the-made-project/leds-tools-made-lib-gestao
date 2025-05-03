// github.service.ts
import { GitHubIssue, IssueService } from './issue.extract';
import { GitHubMilestone, MilestoneService } from './milestone.extract';
import { GitHubProject,GitHubProjectService } from './project.extract';
import {GitHubSprintService, GitHubSprint} from './sprints.extract';
import { Project, Milestone, Issue, TimeBox } from '../../model/models';
/**
 * Serviço principal que coordena as operações do GitHub
 */
export class GitHubService {
  private milestoneService: MilestoneService;
  private issueService: IssueService;
  private projectService: GitHubProjectService;
  private sprintService: GitHubSprintService;
  /**
   * Construtor da classe
   * @param token Token de autenticação GitHub (opcional)
   */
  constructor(token: string) {
    this.milestoneService = new MilestoneService(token);
    this.issueService = new IssueService(token);
    this.projectService = new GitHubProjectService(token);
    this.sprintService = new GitHubSprintService(token);
  }
  
  async getSprints(
    org: string,
    projectNumber: number
  ): Promise<GitHubSprint[]> {
    return this.sprintService.getSprintsInProject(org, projectNumber);
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
  
  async mapGitHubProjectToProject(
    githubProject: GitHubProject
  ): Promise<Project> { 
    return await this.projectService.mapGitHubProjectToProject(githubProject);
  }
  
  async mapGitHubMilestoneToMilestone(
      githubMilestone: GitHubMilestone
    ): Promise<Milestone> {
    return await this.milestoneService.mapGitHubMilestoneToMilestone(githubMilestone);
  }

  async mapGitHubIssueToIssue(
    githubIssue: GitHubIssue
  ): Promise<Issue> {
    return await this.issueService.mapGitHubIssueToIssue(githubIssue);
  }
  async mapGitHubSprintToTimeBox(githubSprint: GitHubSprint): Promise<TimeBox> {
    return await this.sprintService.mapGitHubSprintToTimeBox(githubSprint);
  }
  async getAllIssuesFromProject(
    org: string,
    projectNumber: number
  ): Promise<GitHubIssue[]> {
   return await this.issueService.getAllIssuesFromProject(org, projectNumber);
  }
  
  
  
}