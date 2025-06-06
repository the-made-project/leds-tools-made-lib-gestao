import { expect, test } from "vitest";
import { GitHubService } from "./service/GitHubService";
import dotenv from 'dotenv';
import { GitHubTokenManager } from "./extract/github/GitHubTokenManager";

dotenv.config(); // carrega o .env para process.env

let service: GitHubService;

const org_name = "made-test";
const project_name = "project-test"

const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  GitHubTokenManager.initialize(token);
  service = new GitHubService();

test("Baixando os Projetos", async () => {
  const value = await service.getProjects(org_name);

  expect(value.length).toBeGreaterThan(0);
});


test("Baixando um projeto específico", async () => {
  const value = await service.getProjectByTitle(org_name, project_name);

  expect(value).not.toBeNull();
  expect(value?.title).toBe(project_name);
});

test("Baixando os Milestones de um projeto", async () => {
  const project = await service.getProjectByTitle(org_name, project_name);
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getMilestonesFromProjectNumber(org_name,project.number);
  
  expect(value.length).toBeGreaterThan(0);
});

test("Baixando os Issues de um Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle(org_name, project_name);
  if (!project) {
    throw new Error("Project not found");
  }
  const milestone = await service.getMilestonesFromProjectNumber(org_name,project.number);
  
  if (!milestone || milestone.length === 0) {
    throw new Error("Milestone not found");
  }
  const value = await service.getIssuesFromMilestoneInProject(org_name, project.number, milestone[0].number);
  
  expect(value.length).toBeGreaterThan(0);
},30000);

test("Baixando os Issues sem Milestone de um projeto", async () => {
  const project = await service.getProjectByTitle(org_name, project_name);
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getIssesWithoutMilestoneInProject(org_name, project.number);
  
  expect(value.length).toBeGreaterThan(0);
},30000);