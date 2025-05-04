import { expect, test } from "vitest";
import { GitHubService } from "./service/GitHubService";

import dotenv from 'dotenv';
dotenv.config(); // carrega o .env para process.env


let service: GitHubService;

const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  service = new GitHubService(token);



test("Create Projetct", async () => {
  const project = await service.ETLProject("leds-conectafapes", "ConectaFapes");

  expect(project).toBeDefined;
});

test("Create Issues", async () => {
  
  const issues = await service.ETLIssue("leds-conectafapes", "ConectaFapes");


  expect(issues).toBeDefined;
},30000);


test("Create Backlog", async () => {

  const backlog = await service.ETLBacklog("leds-conectafapes", "ConectaFapes");
  expect(backlog).toBeDefined;

},30000);


test("Create Sprint", async () => {

  const sprints = await service.ETLTimeBox("leds-conectafapes", "ConectaFapes");
  expect(sprints).toBeDefined;
},30000);

