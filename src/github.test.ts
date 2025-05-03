import { expect, test } from "vitest";
import { GitHubService } from "./github/GitHubService";

test("Baixando os Projetos", async () => {
  const service = new GitHubService("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");
  const value = await service.getProjects("leds-conectafapes");

  expect(value.length).toBeGreaterThan(0);
});


test("Baixando um projeto específico", async () => {
  const service = new GitHubService("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");
  const value = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");

  expect(value).not.toBeNull();
  expect(value?.title).toBe("ConectaFapes");
});

test("Baixando os Milestones de um projeto", async () => {
  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getMilestonesFromProjectNumber("leds-conectafapes",project.number);
  
  expect(value.length).toBeGreaterThan(0);
});

test("Baixando os Issues de um Milestone de um projeto", async () => {
  const service = new GitHubService("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");
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
  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getIssesWithoutMilestoneInProject("leds-conectafapes", project.number);
  
  expect(value.length).toBeGreaterThan(0);
},30000);

test("Baixando os Sprints de um  projeto", async () => {
  const service = new GitHubService("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");
  const project = await service.getProjectByTitle("leds-conectafapes", "ConectaFapes");
  if (!project) {
    throw new Error("Project not found");
  }
  const value = await service.getSprints("leds-conectafapes", project.number);
  console.log(JSON.stringify(value, null, 2));
  expect(value.length).toBeGreaterThan(0);
},30000);