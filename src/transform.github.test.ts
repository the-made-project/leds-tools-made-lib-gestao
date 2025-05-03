import { expect, test } from "vitest";
import { GitHubService } from "./extract/github/GitHubService";

test("Map GithuProject to Project", async () => {
  const service = new GitHubService("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");
  const projects = await service.getProjects("leds-conectafapes");
  const mapped = await service.mapGitHubProjectToProject(projects[0]);


  expect(mapped).toBeDefined;
});

