import { expect, test } from "vitest";
import { GitHubService } from "./service/GitHubService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import dotenv from 'dotenv';
dotenv.config(); // carrega o .env para process.env


let service: GitHubService;

const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  GitHubTokenManager.initialize(token);
  service = new GitHubService();

test("Map GithuProject to Project", async () => {
  const projects = await service.getProjects("made-test");
  const mapped = await service.mapGitHubProjectToProject(projects[0]);
  
  expect(mapped).toBeDefined;
});

test("Map GithuMileStone to MileStone", async () => {
  // Create mock milestone data
  const mockMilestone = {
    id: 1,
    title: 'Test Milestone',
    description: 'Test milestone description',
    state: 'open' as 'open',
    due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
    html_url: 'https://github.com/test-owner/test-repo/milestone/1',
    number: 1
  };
  
  const mapped = await service.mapGitHubMilestoneToMilestone(mockMilestone);
  
  expect(mapped).toBeDefined();
  expect(mapped.id).toBe('1');
  expect(mapped.name).toBe('Test Milestone');
});

test("Mapeando uma issue de um Milestone de um projeto", async () => {
  const mockGitHubIssue = {
    number: 123,
    title: "Test Issue with Milestone",
    body: "Test description",
    url: "https://github.com/test-owner/test-repo/issues/123",
    state: "OPEN" as const,
    repositoryOwner: "test-owner",
    repository: "test-repo",
    author: "test-author",
    assignees: [],
    labels: [],
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    closedAt: null,
    milestoneNumber: 1,
    type: "Feature",
    dependencies: [],
    dependents: [],
    customFields: {
      description: "Test description",
      type: "Feature"
    },
    milestone: {
      number: 1,
      title: "Test Milestone",
      description: "Test milestone description",
      state: "open",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      closedAt: null,
      dueOn: "2023-12-31T00:00:00Z"
    }
  };
  
  const mapped = await service.mapGitHubIssueToIssue(mockGitHubIssue);
  expect(mapped).toBeDefined();
  expect(mapped.id).toBe("123");
  expect(mapped.title).toBe("Test Issue with Milestone");
},30000);

test("Mapeando uma issue sem Milestone de um projeto", async () => {
  // Create a mock issue without milestone
  const mockGitHubIssueWithoutMilestone = {
    number: 124,
    title: "Test Issue without Milestone",
    url: "https://github.com/test-owner/test-repo/issues/124",
    state: "OPEN" as const,
    repositoryOwner: "test-owner",
    repository: "test-repo",
    author: "test-author",
    assignees: [],
    labels: ["enhancement"],
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    milestoneNumber: 0, // No milestone
    type: "Task",
    dependencies: [],
    dependents: [],
    customFields: {
      description: "Test description for issue without milestone",
      type: "Task"
    }
  };
  
  const mapped = await service.mapGitHubIssueToIssue(mockGitHubIssueWithoutMilestone);
  expect(mapped).toBeDefined();
  expect(mapped.id).toBe("124");
  expect(mapped.title).toBe("Test Issue without Milestone");
  expect(mapped.subtype).toBe("Task");
},30000);


test("Mapeando os Sprints de um  projeto", async () => {
  // Create a mock sprint
  const mockGitHubSprint = {
    id: "sprint-1",
    title: "Test Sprint 1",
    startDate: "2023-01-01T00:00:00Z",
    duration: 14, // 2 weeks
    endDate: "2023-01-15T00:00:00Z",
    items: [
      {
        id: "item-1",
        contentType: "Issue",
        number: 123,
        title: "Test Item",
        url: "https://github.com/test-owner/test-repo/issues/123",
        state: "OPEN",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        repository: "test-repo",
        repositoryOwner: "test-owner",
        author: "test-author",
        type: "Feature",
        labels: ["enhancement"],
        dependencies: [],
        dependents: [],
        customFields: {
          description: "Test item description",
          type: "Feature"
        }
      }
    ]
  };
  
  const mapped = await service.mapGitHubSprintToTimeBox(mockGitHubSprint);
  expect(mapped).toBeDefined();
  expect(mapped.id).toBe("sprint-1");
  expect(mapped.name).toBe("Test Sprint 1");
},30000);
