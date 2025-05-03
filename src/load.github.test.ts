import { expect, test } from "vitest";
import { GitHubService } from "./extract/github/GitHubService";
import { GenericRepository } from "./repository/generic.repository"; 
import { Backlog, Issue, Project, TimeBox } from "./model/models";


test("Create Projetct", async () => {
  const service = new GitHubService("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");
  const projects = await service.getProjects("leds-conectafapes");
  const mapped = await service.mapGitHubProjectToProject(projects[0]);
  const repository = new GenericRepository<Project>('./data/db','project.json');	
  
  repository.clear();  
  repository.add(mapped);
  

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
  const repository = new GenericRepository<Issue>('./data/db','issue.json');	
 
  repository.clear();
  await repository.add(issues);


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
  const repository = new GenericRepository<Backlog>('./data/db','backlog.json');	
 
 
  const backlog: Backlog = {
    id: project.id,
    name: project.name,
    description: project.description,
    issues: issues
  };
  await repository.add(backlog);


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
  
  const repository = new GenericRepository<TimeBox>('./data/db','timebox.json');	
 
  
  repository.clear();
  repository.add(sprints);
  

  expect(sprints.length).toBeGreaterThan(0);
},30000);