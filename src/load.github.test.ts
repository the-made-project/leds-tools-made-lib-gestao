import { expect, test, describe, beforeAll } from "vitest";
import { GitHubService } from "./service/GitHubService";
import dotenv from "dotenv";
import { GitHubTokenManager } from "./extract/github/GitHubTokenManager";

dotenv.config();

let service: GitHubService;

const ORG = "made-test";
const PROJECT_NAME = "project-test";

beforeAll(() => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN não definido no .env");
  }
  GitHubTokenManager.initialize(token);

  service = new GitHubService();
});

describe("GitHubService ETL", () => {
  test("Create Project", async () => {
    const project = await service.ETLProject(ORG, PROJECT_NAME);
    console.log("Project:", project);
    expect(project).toBeDefined();
  });

  test("Create Issues", async () => {
    const issues = await service.ETLIssue(ORG, PROJECT_NAME);
    console.log("Issues:", issues);
    expect(issues).toBeDefined();
  }, 30000);

  test("Create Backlog", async () => {
    const backlog = await service.ETLBacklog(ORG, PROJECT_NAME);
    console.log("Backlog:", backlog);
    expect(backlog).toBeDefined();
  }, 30000);

  test("Create Sprint", async () => {
    const sprints = await service.ETLTimeBox(ORG, PROJECT_NAME);
    console.log("Sprints:", sprints);
    expect(sprints).toBeDefined();
  }, 30000);
});

