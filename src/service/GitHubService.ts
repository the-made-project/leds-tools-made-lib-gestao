// github.service.ts
import { GitHubIssue, IssueService } from '../extract/github/issue.extract';
import { GitHubMilestone, MilestoneService } from '../extract/github/milestone.extract';
import { GitHubProject, GitHubProjectService } from '../extract/github/project.extract';
import { GitHubSprint, GitHubSprintService } from '../extract/github/sprints.extract';
import { Backlog, Project, Milestone, Issue, TimeBox, Team } from '../model/models';

import { GenericRepository } from "../repository/generic.repository";
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
  const repository = new GenericRepository<Project>('./data/db','processed_projects.json');	
    
  // Clear and add the project (ETL should refresh data)
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
  
  const repository = new GenericRepository<Milestone>('./data/db','processed_milestones.json');	
    
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
  
  const repository = new GenericRepository<TimeBox>('./data/db','processed_timeboxes.json');	
    
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
  
  const milestones = await this.getMilestonesFromProjectNumber(org,project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  // Get issues from milestones
  const issuesFromMilestones = (
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
  
  // Get issues without milestones
  const issuesWithoutMilestone = await this.getIssesWithoutMilestoneInProject(org, project.number);
  const mappedIssuesWithoutMilestone = await Promise.all(
    issuesWithoutMilestone.map(issue => this.mapGitHubIssueToIssue(issue))
  );
  
  // Combine all issues
  const allIssues = [...issuesFromMilestones, ...mappedIssuesWithoutMilestone];
    
  const repository = new GenericRepository<Backlog>('./data/db','processed_backlogs.json');	
 
  repository.clear();
  
  const backlog: Backlog = {
    id: project.id,
    name: project.title,
    description: project.shortDescription ?? '',
    issues: allIssues
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
  
  const milestones = await this.getMilestonesFromProjectNumber(org,project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  // Get issues from milestones
  const issuesFromMilestones = (
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
  
  // Get issues without milestones
  const issuesWithoutMilestone = await this.getIssesWithoutMilestoneInProject(org, project.number);
  const mappedIssuesWithoutMilestone = await Promise.all(
    issuesWithoutMilestone.map(issue => this.mapGitHubIssueToIssue(issue))
  );
  
  // Combine all issues
  const allIssues = [...issuesFromMilestones, ...mappedIssuesWithoutMilestone];
  
  const repository = new GenericRepository<Issue>('./data/db','processed_issues.json');	
 
  repository.clear();
  await repository.add(allIssues);
  
  return allIssues;
}

async getAllTeams(org: string): Promise<any[]> {
  // Busca todos os times de uma organização no GitHub
  const axios = require('axios');
  const token = require('./GitHubTokenManager').GitHubTokenManager.getInstance().getToken();
  const url = `https://api.github.com/orgs/${org}/teams`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

async mapGitHubTeamToTeam(githubTeam: any): Promise<Team> {
  // Mapeia um time do GitHub para o modelo Team local
  return {
    id: githubTeam.id?.toString() || githubTeam.slug,
    name: githubTeam.name,
    description: githubTeam.description || '',
    teamMembers: [] // Pode ser preenchido depois com membros
  };
}

async ETLTeam(
  org: string
): Promise<Team[] | null> {
  // ETL para times do GitHub
  const githubTeams = await this.getAllTeams(org);
  if (!githubTeams || githubTeams.length === 0) {
    throw new Error('Nenhum time encontrado');
  }
  const mapped = await Promise.all(
    githubTeams.map(team => this.mapGitHubTeamToTeam(team))
  );
  const repository = new GenericRepository<Team>('./data/db', 'processed_teams.json');
  repository.clear();
  await repository.add(mapped);
  return mapped;
}
  
  
}