import { expect, test, beforeEach, afterEach, describe } from "vitest";
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import { Project, Issue, Roadmap, Backlog, Team, TimeBox } from "./model/models";
import dotenv from 'dotenv';
import nock from 'nock';

dotenv.config();

const org = 'test-org-mock';
const repo = 'test-repo-mock';
const token = 'fake-token-for-tests';

GitHubTokenManager.initialize(token);
const pushService = new GitHubPushService();

beforeEach(() => {
  // Clear all repositories before each test to avoid cached data
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.resolve('./data/db');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  // Core GraphQL operations
  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('createProjectV2'))
    .reply(200, {
      data: { createProjectV2: { projectV2: { id: 'fake-project-id' } } }
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('repository(name: $repositoryName)'))
    .reply(200, {
      data: {
        organization: {
          repository: { id: 'fake-repo-id' },
        },
      },
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('labels'))
    .reply(200, {
      data: {
        repository: {
          labels: {
            nodes: [
              { id: 'fake-label-id-1', name: 'test' },
              { id: 'fake-label-id-2', name: 'bug' },
              { id: 'fake-label-id-3', name: 'Feature' },
              { id: 'fake-label-id-4', name: 'Epic' },
              { id: 'fake-label-id-5', name: 'Story' },
              { id: 'fake-label-id-6', name: 'Task' },
              { id: 'fake-label-id-7', name: 'Backlog' },
              { id: 'fake-label-id-8', name: 'Sprint' },
            ],
          },
        },
      },
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('organization'))
    .reply(200, { data: { organization: { id: 'fake-org-id' } } })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('createIssue'))
    .reply(200, {
      data: {
        createIssue: {
          issue: { id: 'fake-issue-id', number: 456 }
        }
      }
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('addProjectV2ItemById'))
    .reply(200, {
      data: { addProjectV2ItemById: { item: { id: 'fake-project-item-id' } } }
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('addLabelsToLabelable'))
    .reply(200, {
      data: {
        addLabelsToLabelable: {
          labelable: { __typename: 'Issue' },
        },
      },
    })
    .persist();

  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('fields(first: 20)'))
    .reply(200, {
      data: {
        node: {
          fields: {
            nodes: [
              { id: 'fake-status-field-id', name: 'Status' },
              { id: 'fake-assignee-field-id', name: 'Assignees' },
              { id: 'fake-priority-field-id', name: 'Priority' }
            ]
          }
        }
      }
    })
    .persist();

  // REST API operations
  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/issues`)
    .reply(201, { id: 123, number: 456, title: "Test Issue" })
    .persist();

  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/labels`)
    .reply(201, { id: 'new-label-id', name: 'new-label' })
    .persist();

  nock('https://api.github.com')
    .get(/\/repos\/.*\/labels\/.*/)
    .reply(404, { message: 'Label not found' })
    .persist();

  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/milestones`)
    .reply(201, {
      id: 123456,
      number: 1,
      title: "Q1 2025",
      state: "open",
      due_on: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      html_url: `https://github.com/${org}/${repo}/milestone/1`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .persist();

  nock('https://api.github.com')
    .get(`/repos/${org}/${repo}/milestones`)
    .query(true)
    .reply(200, [])
    .persist();

  nock('https://api.github.com')
    .get('/search/issues')
    .query(true)
    .reply(200, {
      items: [
        {
          number: 1,
          title: "Implement authentication system",
          html_url: `https://github.com/${org}/${repo}/issues/1`
        }
      ]
    })
    .persist();

  nock('https://api.github.com')
    .patch(`/repos/${org}/${repo}/issues/1`)
    .reply(200, {
      number: 1,
      title: "Implement authentication system",
      milestone: { number: 1, title: "Q1 2025" }
    })
    .persist();

  // Team management
  nock('https://api.github.com')
    .get(/\/orgs\/.*\/teams\/.*/)
    .reply(404)
    .post(/\/orgs\/.*\/teams/)
    .reply(201, { id: 123, name: "Test Team" })
    .put(/\/orgs\/.*\/teams\/.*\/memberships\/.*/)
    .reply(200, { state: "active" })
    .persist();
});

afterEach(() => {
  nock.cleanAll();
});

describe('GitHub Push Service', () => {
  const createTestProject = (): Project => ({
    id: "test-project-id",
    name: "Test Project",
    description: "Test project for integration testing",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const createTestIssue = (id: string, title: string, type: string = "Feature"): Issue => ({
    id,
    type,
    subtype: "task",
    title,
    description: `Test issue: ${title}`,
    labels: ["test"],
  });

  describe('Project Management', () => {
    test("should create project successfully", async () => {
      const project = createTestProject();
      const projectId = await pushService.pushProject(org, project);
      expect(projectId).toBe('fake-project-id');
    }, 30000);

    test("should handle project creation errors", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .reply(500, { message: 'Internal Server Error' });

      const project = createTestProject();
      await expect(pushService.pushProject(org, project)).rejects.toThrow();
    }, 30000);
  });

  describe('Issue Management', () => {
    test("should create and add issue to project", async () => {
      const project = createTestProject();
      const issue = createTestIssue("issue-1", "Test Issue");
      
      const projectId = await pushService.pushProject(org, project);
      const result = await pushService.pushIssue(org, repo, projectId, issue, [], [], [], []);
      
      expect(result.issueId).toBe('fake-issue-id');
      expect(result.issueNumber).toBe(456);
      expect(result.projectItemId).toBe('fake-project-item-id');
    }, 30000);

    test("should handle different issue types", async () => {
      const project = createTestProject();
      const epic = createTestIssue("epic-1", "Test Epic", "Epic");
      const story = createTestIssue("story-1", "Test Story", "Story");
      const task = createTestIssue("task-1", "Test Task", "Task");
      
      const projectId = await pushService.pushProject(org, project);
      
      await expect(pushService.pushIssue(org, repo, projectId, epic, [], [], [], [])).resolves.toBeDefined();
      await expect(pushService.pushIssue(org, repo, projectId, story, [], [], [], [])).resolves.toBeDefined();
      await expect(pushService.pushIssue(org, repo, projectId, task, [], [], [], [])).resolves.toBeDefined();
    }, 30000);

    test("should handle issue creation errors", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .reply(400, { message: 'Bad Request' });

      const project = createTestProject();
      const issue = createTestIssue("issue-error", "Error Issue");
      const projectId = 'fake-project-id';
      
      await expect(pushService.pushIssue(org, repo, projectId, issue, [], [], [], [])).rejects.toThrow();
    }, 30000);
  });

  describe('Roadmap and Milestone Management', () => {
    test("should create roadmap with milestones and issues", async () => {
      const project = createTestProject();
      const roadmap: Roadmap = {
        id: "roadmap-1",
        name: "Test Roadmap 2025",
        description: "Strategic planning for 2025",
        milestones: [
          {
            id: "milestone-1",
            name: "Q1 2025",
            description: "First quarter delivery",
            startDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'PLANNED',
            releases: [
              {
                id: "release-1.0",
                version: "1.0",
                name: "First Release",
                description: "Initial release with core features",
                dueDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'IN_DEVELOPMENT',
                issues: [
                  {
                    id: "issue-1",
                    title: "Implement authentication system",
                    description: "Create secure login and authentication",
                    type: "Feature",
                    subtype: "feature"
                  }
                ]
              }
            ]
          }
        ]
      };

      await pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, undefined, [roadmap]);
      expect(true).toBe(true);
    }, 60000);

    test("should handle empty roadmaps gracefully", async () => {
      const project = createTestProject();
      const emptyRoadmap: Roadmap = {
        id: "empty-roadmap",
        name: "Empty Roadmap",
        description: "Roadmap without milestones"
      };

      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, undefined, [emptyRoadmap]))
        .resolves.not.toThrow();
    }, 30000);

    test("should handle milestone creation errors", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post(`/repos/${org}/${repo}/milestones`)
        .reply(422, { message: 'Milestone already exists' });

      const project = createTestProject();
      const roadmap: Roadmap = {
        id: "roadmap-error",
        name: "Error Roadmap",
        milestones: [
          {
            id: "milestone-error",
            name: "Error Milestone",
            description: "Test milestone for error handling",
            startDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'PLANNED'
          }
        ]
      };

      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, undefined, [roadmap]))
        .rejects.toThrow();
    }, 60000);
  });

  describe('Team Management', () => {
    test("should create teams with members", async () => {
      const teams: Team[] = [
        {
          id: "team-1",
          name: "Development Team",
          description: "Core development team",
          teamMembers: [
            {
              id: "dev-1",
              name: "John Doe",
              email: "john@example.com",
              discord: "johndoe"
            }
          ]
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, teams, undefined, undefined))
        .resolves.not.toThrow();
    }, 60000);

    test("should handle empty teams", async () => {
      const teams: Team[] = [
        {
          id: "empty-team",
          name: "Empty Team",
          description: "Team without members",
          teamMembers: []
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, teams, undefined, undefined))
        .resolves.not.toThrow();
    }, 30000);
  });

  describe('TimeBox (Sprint) Management', () => {
    test("should create timeboxes with sprint items", async () => {
      const timeboxes: TimeBox[] = [
        {
          id: "sprint-1",
          name: "Sprint 1",
          description: "First sprint",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'IN_PROGRESS',
          sprintItems: [
            {
              id: "sprint-item-1",
              assignee: {
                id: "dev-1",
                name: "John Doe",
                email: "john@example.com",
                discord: "johndoe"
              },
              issue: createTestIssue("sprint-issue-1", "Sprint Task")
            }
          ]
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, timeboxes, undefined))
        .resolves.not.toThrow();
    }, 60000);

    test("should handle different sprint statuses", async () => {
      const timeboxes: TimeBox[] = [
        {
          id: "sprint-planned",
          name: "Planned Sprint",
          description: "Sprint in planning phase",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'PLANNED',
          sprintItems: []
        },
        {
          id: "sprint-closed",
          name: "Closed Sprint",
          description: "Completed sprint",
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          status: 'CLOSED',
          completeDate: new Date().toISOString(),
          sprintItems: []
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, timeboxes, undefined))
        .resolves.not.toThrow();
    }, 60000);
  });

  describe('Backlog Management', () => {
    test("should create backlogs with issues", async () => {
      const backlogs: Backlog[] = [
        {
          id: "backlog-1",
          name: "Product Backlog",
          description: "Main product backlog",
          issues: [
            createTestIssue("backlog-issue-1", "Backlog Issue 1"),
            createTestIssue("backlog-issue-2", "Backlog Issue 2")
          ]
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], backlogs, undefined, undefined, undefined))
        .resolves.not.toThrow();
    }, 60000);

    test("should handle empty backlogs", async () => {
      const backlogs: Backlog[] = [
        {
          id: "empty-backlog",
          name: "Empty Backlog",
          description: "Backlog without issues"
        }
      ];

      const project = createTestProject();
      await expect(pushService.fullPush(org, repo, project, [], [], [], backlogs, undefined, undefined, undefined))
        .resolves.not.toThrow();
    }, 30000);
  });

  describe('Full Integration Tests', () => {
    test("should execute comprehensive push with all components", async () => {
      const project = createTestProject();
      const epics = [createTestIssue("epic-1", "Test Epic", "Epic")];
      const stories = [createTestIssue("story-1", "Test Story", "Story")];
      const tasks = [createTestIssue("task-1", "Test Task", "Task")];
      
      const backlogs: Backlog[] = [{
        id: "backlog-1",
        name: "Test Backlog",
        description: "Test backlog description",
        issues: [createTestIssue("backlog-task", "Backlog Task")]
      }];

      const teams: Team[] = [{
        id: "team-1",
        name: "Test Team",
        description: "Test team description",
        teamMembers: [{
          id: "member-1",
          name: "Test Member",
          email: "test@example.com",
          discord: "testmember"
        }]
      }];

      const timeboxes: TimeBox[] = [{
        id: "timebox-1",
        name: "Test Sprint",
        description: "Test sprint description",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        sprintItems: [{
          id: "sprint-item-1",
          assignee: teams[0].teamMembers[0],
          issue: tasks[0]
        }]
      }];

      const roadmaps: Roadmap[] = [{
        id: "roadmap-1",
        name: "Test Roadmap",
        description: "Test roadmap description",
        milestones: [{
          id: "milestone-1",
          name: "Test Milestone",
          description: "Test milestone description",
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'PLANNED'
        }]
      }];

      await expect(pushService.fullPush(
        org, repo, project, epics, stories, tasks, 
        backlogs, teams, timeboxes, roadmaps
      )).resolves.not.toThrow();
    }, 120000);

    test("should validate input parameters", async () => {
      const project = createTestProject();
      
      await expect(pushService.fullPush('', repo, project, [], [], []))
        .rejects.toThrow();

      await expect(pushService.fullPush(org, '', project, [], [], []))
        .rejects.toThrow();

      await expect(pushService.fullPush(org, repo, { ...project, name: '' }, [], [], []))
        .rejects.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test("should handle network timeouts gracefully", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .delay(31000)
        .reply(200, {});

      const project = createTestProject();
      await expect(pushService.pushProject(org, project)).rejects.toThrow();
    }, 35000);

    test("should handle API rate limiting", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .reply(403, { 
          message: 'API rate limit exceeded',
          documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
        });

      const project = createTestProject();
      await expect(pushService.pushProject(org, project)).rejects.toThrow();
    }, 30000);

    test("should handle malformed API responses", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, { invalid: 'response', missing: 'data' });

      const project = createTestProject();
      await expect(pushService.pushProject(org, project)).rejects.toThrow();
    }, 30000);

    test("should handle authentication errors", async () => {
      nock.cleanAll();
      nock('https://api.github.com')
        .post('/graphql')
        .reply(401, { message: 'Bad credentials' });

      const project = createTestProject();
      await expect(pushService.pushProject(org, project)).rejects.toThrow();
    }, 30000);

    test("should handle issues with missing required fields", async () => {
      const project = createTestProject();
      const invalidIssue: Issue = {
        id: "",
        type: "",
        subtype: "",
        // Missing title completely
        description: "Issue without required fields"
      };
      
      const projectId = 'fake-project-id';
      await expect(pushService.pushIssue(org, repo, projectId, invalidIssue, [], [], [], []))
        .rejects.toThrow();
    }, 30000);

    test("should handle large batch operations", async () => {
      const project = createTestProject();
      const largeBatchOfIssues = Array.from({ length: 50 }, (_, i) => 
        createTestIssue(`bulk-issue-${i}`, `Bulk Issue ${i}`)
      );
      
      await expect(pushService.fullPush(org, repo, project, largeBatchOfIssues, [], [], undefined, undefined, undefined, undefined))
        .resolves.not.toThrow();
    }, 120000);

    test("should handle mixed valid and invalid data", async () => {
      const project = createTestProject();
      const validIssue = createTestIssue("valid-issue", "Valid Issue");
      const invalidIssue: Issue = {
        id: "",
        type: "",
        subtype: "",
        description: "Invalid issue"
      };
      
      await expect(pushService.fullPush(org, repo, project, [validIssue, invalidIssue], [], [], undefined, undefined, undefined, undefined))
        .rejects.toThrow();
    }, 60000);
  });

  describe('Performance and Concurrency', () => {
    test("should handle concurrent requests gracefully", async () => {
      const project = createTestProject();
      const issues = Array.from({ length: 10 }, (_, i) => 
        createTestIssue(`concurrent-issue-${i}`, `Concurrent Issue ${i}`)
      );
      
      const promises = issues.map(issue => 
        pushService.pushIssue(org, repo, 'fake-project-id', issue, [], [], [], [])
      );
      
      await expect(Promise.all(promises)).resolves.toHaveLength(10);
    }, 60000);

    test("should maintain data consistency across operations", async () => {
      const project = createTestProject();
      const epic = createTestIssue("epic-consistency", "Consistency Epic", "Epic");
      const story = createTestIssue("story-consistency", "Consistency Story", "Story");
      const task = createTestIssue("task-consistency", "Consistency Task", "Task");
      
      const projectId = await pushService.pushProject(org, project);
      expect(projectId).toBe('fake-project-id');
      
      const epicResult = await pushService.pushIssue(org, repo, projectId, epic, [], [], [], []);
      const storyResult = await pushService.pushIssue(org, repo, projectId, story, [], [], [], []);
      const taskResult = await pushService.pushIssue(org, repo, projectId, task, [], [], [], []);
      
      expect(epicResult.projectItemId).toBe('fake-project-item-id');
      expect(storyResult.projectItemId).toBe('fake-project-item-id');
      expect(taskResult.projectItemId).toBe('fake-project-item-id');
    }, 60000);
  });
});