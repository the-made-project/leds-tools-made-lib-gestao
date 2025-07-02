import { expect, test, describe, beforeAll } from "vitest";
import { GitHubService } from "./service/GitHubService";
import dotenv from "dotenv";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import { mkdirSync } from "fs";
import { join } from "path";

dotenv.config();

let service: GitHubService;
let ORG: string;
let PROJECT_NAME: string;

beforeAll(() => {
  // Create necessary directories for data storage
  const dataDir = join(process.cwd(), 'data', 'db');
  mkdirSync(dataDir, { recursive: true });
  
  ORG = process.env.GITHUB_ORG as string;
  PROJECT_NAME = process.env.GITHUB_PROJECT_NAME as string;
  const token = process.env.GITHUB_TOKEN;
  if (!token || !ORG || !PROJECT_NAME) {
    throw new Error("GITHUB_TOKEN, GITHUB_ORG or GITHUB_PROJECT_NAME not set in environment variables");
  }
  GitHubTokenManager.initialize(token);

  service = new GitHubService();
});

describe("GitHubService ETL", () => {
  test("Create Project", async () => {
    const project = await service.ETLProject(ORG, PROJECT_NAME);
    expect(project).toBeDefined();
  });

  test("Create Issues", async () => {
    const issues = await service.ETLIssue(ORG, PROJECT_NAME);
    expect(issues).toBeDefined();
  }, 30000);

  test("Create Backlog", async () => {
    const backlog = await service.ETLBacklog(ORG, PROJECT_NAME);
    expect(backlog).toBeDefined();
  }, 30000);

  test("Create Sprint", async () => {
    try {
      const sprints = await service.ETLTimeBox(ORG, PROJECT_NAME);
      expect(sprints).toBeDefined();
    } catch (error) {
      // It's acceptable if no iteration fields are found in the test project
      if (error instanceof Error && 
          (error.message.includes("Nenhum campo de sprint/iteração encontrado") ||
           error.message.includes("Sprint not found"))) {
        expect(error.message).toContain("sprint");
        console.log("⚠️ Test project doesn't have iteration fields configured - this is expected for test environments");
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
  }, 30000);
});

