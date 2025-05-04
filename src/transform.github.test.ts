import { expect, test } from "vitest";
import { GitHubService } from "./service/GitHubService";


import dotenv from 'dotenv';
dotenv.config(); // carrega o .env para process.env


let service: GitHubService;

const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  service = new GitHubService(token);

test("Map GithuProject to Project", async () => {
  const projects = await service.getProjects("leds-conectafapes");
  const mapped = await service.mapGitHubProjectToProject(projects[0]);
  
  expect(mapped).toBeDefined;
});

test("Map GithuMileStone to MileStone", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  const mapped = await service.mapGitHubMilestoneToMilestone(value[0]);
  
  expect(mapped).toBeDefined;
});

test("Mapeando uma issue de um Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const milestone = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  if (!milestone || milestone.length === 0) {
    throw new Error("Milestone not found");
  }
  const value = await service.getIssuesFromMilestoneInProject("leds-conectafapes", project.number, milestone[0].number);
  const mapped = await service.mapGitHubIssueToIssue(value[0]);
  expect(value.length).toBeGreaterThan(0);
},30000);

test("Mapeando uma issue sem Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getIssesWithoutMilestoneInProject("leds-conectafapes", project.number);
  const mapped = await service.mapGitHubIssueToIssue(value[0]);
  expect(value.length).toBeGreaterThan(0);
},30000);


test("Mapeando os Sprints de um  projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getSprints("leds-conectafapes", project.number);
  const mapped = await service.mapGitHubSprintToTimeBox(value[0]);
  expect(value.length).toBeGreaterThan(0);
},30000);
