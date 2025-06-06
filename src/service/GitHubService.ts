// github.service.ts
import { GitHubIssue, IssueService } from '../extract/github/issue.extract';
import { GitHubMilestone, MilestoneService } from '../extract/github/milestone.extract';
import { GitHubProject, GitHubProjectService } from '../extract/github/project.extract';
import { GitHubSprint, GitHubSprintService } from '../extract/github/sprints.extract';
import { Backlog, Project, Milestone, Issue, TimeBox } from '../model/models';

import { GenericRepository } from "../push/repository/generic.repository";
/**
 * Serviço principal que coordena as operações do GitHub
 */
export class GitHubService {
  private milestoneService: MilestoneService;
  private issueService: IssueService;
  private projectService: GitHubProjectService;
  private sprintService: GitHubSprintService;
  
  constructor() {
    this.milestoneService = new MilestoneService();
    this.issueService = new IssueService();
    this.projectService = new GitHubProjectService();
    this.sprintService = new GitHubSprintService();
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

async ETLProject (
  org: string,  
  projectTitle: string
): Promise<Project | null> {
  const project = await this.getProjectByTitle(org, projectTitle);
  if (!project) {
    throw new Error(`Project ${projectTitle} not found`);
  }
  const mapped = await this.mapGitHubProjectToProject(project);
  const repository = new GenericRepository<Project>('./data/db','project.json');	
    
  repository.clear();  
  repository.add(mapped);
  return mapped;
    
}

async ETLMilestone (
  org: string,  
  projectTitle: string
): Promise<Milestone[] | null> {
  const project = await this.getProjectByTitle(org, projectTitle);
  if (!project) {
    throw new Error(`Project ${projectTitle} not found`);
  }
  
  if (!project) {
    throw new Error("Project not found");
  }
  const milestones = await this.getMilestonesFromProjectNumber(org,project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  const mapped = await Promise.all(
    milestones.map(milestone => this.mapGitHubMilestoneToMilestone(milestone))
  );
  
  const repository = new GenericRepository<Milestone>('./data/db','milestone.json');	
    
  repository.clear();
  await repository.add(mapped);
  
  return mapped;
    
}
async ETLTimeBox (
  org: string,  
  projectTitle: string
): Promise<TimeBox[] | null> {
  const project = await this.getProjectByTitle(org, projectTitle);
  if (!project) {
    throw new Error(`Project ${projectTitle} not found`);
  }
  
  if (!project) {
    throw new Error("Project not found");
  }
  const sprints = await this.getSprints(org,project.number);
  
  if (!sprints || sprints.length === 0) {
    throw new Error("Sprint not found");
  }
  
  const mapped = await Promise.all(
    sprints.map(sprint => this.mapGitHubSprintToTimeBox(sprint))
  );
  
  const repository = new GenericRepository<TimeBox>('./data/db','sprint.json');	
    
  repository.clear();
  await repository.add(mapped);
  
  return mapped;
    
}
async ETLBacklog (
  org: string,  
  projectTitle: string
): Promise<Backlog | null> {
  const project = await this.getProjectByTitle(org, projectTitle);
  if (!project) {
    throw new Error(`Project ${projectTitle} not found`);
  }
  
  if (!project) {
    throw new Error("Project not found");
  }
  const milestones = await this.getMilestonesFromProjectNumber(org,project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  
  const issues = (
    await Promise.all(
      milestones.map(async (milestone) => {
        const issues = await this.getIssuesFromMilestoneInProject(
          org,
          project.number,
          milestone.number
        );
        return Promise.all(
          issues.map(issue => this.mapGitHubIssueToIssue(issue))
        );
      })
    )
  ).flat();
    
  this.getIssesWithoutMilestoneInProject(org, project.number).then((issues) => {
    return Promise.all(
      issues.map(issue => this.mapGitHubIssueToIssue(issue))
    );
  }).then((issues) => {
    issues.forEach(issue => {
      issues.push(issue);
    });
  });
  const repository = new GenericRepository<Backlog>('./data/db','backlog.json');	
 
  repository.clear();
  
  const backlog: Backlog = {
    id: project.id,
    name: project.title,
    description: project.shortDescription ?? '',
    issues: issues
  };
  
  await repository.add(backlog);
  
  return backlog;
    
}

 
async ETLIssue (
  org: string,  
  projectTitle: string
): Promise<Issue[] | null> {
  const project = await this.getProjectByTitle(org, projectTitle);
  if (!project) {
    throw new Error(`Project ${projectTitle} not found`);
  }
  
  if (!project) {
    throw new Error("Project not found");
  }
  const milestones = await this.getMilestonesFromProjectNumber(org,project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  
  const issues = (
    await Promise.all(
      milestones.map(async (milestone) => {
        const issues = await this.getIssuesFromMilestoneInProject(
          org,
          project.number,
          milestone.number
        );
        return Promise.all(
          issues.map(issue => this.mapGitHubIssueToIssue(issue))
        );
      })
    )
  ).flat();
    
  this.getIssesWithoutMilestoneInProject(org, project.number).then((issues) => {
    return Promise.all(
      issues.map(issue => this.mapGitHubIssueToIssue(issue))
    );
  }).then((issues) => {
    issues.forEach(issue => {
      issues.push(issue);
    });
  });
  const repository = new GenericRepository<Issue>('./data/db','issue.json');	
 
  repository.clear();
  await repository.add(issues);
  
  return issues
    
}
  
  
}