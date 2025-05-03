import { expect, test } from "vitest";
import { GitHubService } from "./extract/github/GitHubService";
import { ProjectRepository } from "./repository/project.repository";
import { IssueRepository } from "./repository/issue.repository"; 
import { BacklogRepository } from "./repository/backlog.repository"; 
import { Backlog } from "./model/models";
import { TimeBoxRepository } from "./repository/timebox.repository"; 


test("Create Projetct", async () => {
  const service = new GitHubService("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");
  const projects = await service.getProjects("leds-conectafapes");
  const mapped = await service.mapGitHubProjectToProject(projects[0]);
  const projectRepository = new ProjectRepository('./data/db');
  
  projectRepository.clear();
  
  projectRepository.add(mapped);
  
  const all = projectRepository.getAll();
  
  const project = all[0];

  expect(project).toBeDefined;
  
  expect(mapped).toBeDefined;
});

test("Create Issues", async () => {

  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");

  if (!project) {
    throw new Error("Project not found");
  }
  const milestones = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  
  const issues = (
    await Promise.all(
      milestones.map(async (milestone) => {
        const issues = await service.getIssuesFromMilestoneInProject(
          "leds-conectafapes",
          project.number,
          milestone.number
        );
        return Promise.all(
          issues.map(issue => service.mapGitHubIssueToIssue(issue))
        );
      })
    )
  ).flat();
    
  service.getIssesWithoutMilestoneInProject("leds-conectafapes", project.number).then((issues) => {
    return Promise.all(
      issues.map(issue => service.mapGitHubIssueToIssue(issue))
    );
  }).then((issues) => {
    issues.forEach(issue => {
      issues.push(issue);
    });
  });

  
  const issueRepository = new IssueRepository('./data/db');
  issueRepository.clear();
  await issueRepository.add(issues);


  expect(issues.length).toBeGreaterThan(0);
},30000);


test("Create Backlog", async () => {

  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");

  if (!project) {
    throw new Error("Project not found");
  }
  const milestones = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  if (!milestones || milestones.length === 0) {
    throw new Error("Milestone not found");
  }
  
  
  const issues = (
    await Promise.all(
      milestones.map(async (milestone) => {
        const issues = await service.getIssuesFromMilestoneInProject(
          "leds-conectafapes",
          project.number,
          milestone.number
        );
        return Promise.all(
          issues.map(issue => service.mapGitHubIssueToIssue(issue))
        );
      })
    )
  ).flat();
    
  service.getIssesWithoutMilestoneInProject("leds-conectafapes", project.number).then((issues) => {
    return Promise.all(
      issues.map(issue => service.mapGitHubIssueToIssue(issue))
    );
  }).then((issues) => {
    issues.forEach(issue => {
      issues.push(issue);
    });
  });

  const backlogRepository = new BacklogRepository('./data/db');
  //limpar o backlog
  backlogRepository.clear();

  

  const backlog: Backlog = {
    id: project.id,
    name: project.name,
    description: project.description,
    issues: issues
  };
  await backlogRepository.add(backlog);


  expect(issues.length).toBeGreaterThan(0);
},30000);


test("Create Sprint", async () => {

  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getSprints("leds-conectafapes", project.number);
  const sprints = await Promise.all (value.map(sprint => service.mapGitHubSprintToTimeBox(sprint)));
  const timeBoxRepository = new TimeBoxRepository('./data/db');
  timeBoxRepository.clear();
  timeBoxRepository.add(sprints);
  

  expect(sprints.length).toBeGreaterThan(0);
},30000);