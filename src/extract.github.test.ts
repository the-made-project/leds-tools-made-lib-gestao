import { expect, test } from "vitest";
import { GitHubService } from "./service/GitHubService";


import dotenv from 'dotenv';
dotenv.config(); // carrega o .env para process.env


let service: GitHubService;

const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  service = new GitHubService(token);

test("Baixando os Projetos", async () => {
  const value = await service.getProjects("leds-conectafapes");

  expect(value.length).toBeGreaterThan(0);
});


test("Baixando um projeto específico", async () => {
  const value = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");

  expect(value).not.toBeNull();
  expect(value?.title).toBe("ConectaFapes");
});

test("Baixando os Milestones de um projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  expect(value.length).toBeGreaterThan(0);
});

test("Baixando os Issues de um Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const milestone = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  if (!milestone || milestone.length === 0) {
    throw new Error("Milestone not found");
  }
  const value = await service.getIssuesFromMilestoneInProject("leds-conectafapes", project.number, milestone[0].number);
  
  expect(value.length).toBeGreaterThan(0);
},30000);

test("Baixando os Issues sem Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getIssesWithoutMilestoneInProject("leds-conectafapes", project.number);
  
  expect(value.length).toBeGreaterThan(0);
},30000);