import { expect, test, beforeAll, beforeEach, afterEach } from "vitest";
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import { Project, Issue } from "./model/models";
import dotenv from 'dotenv';
import nock from 'nock';

dotenv.config();

const org = process.env.GITHUB_ORG;
const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
if (!token) {
  throw new Error('GITHUB_TOKEN not set');
}
GitHubTokenManager.initialize(token);
const pushService = new GitHubPushService();

beforeEach(() => {
  // Mock para criar projeto (mais específico, vem primeiro)
  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('createProjectV2'))
    .reply(200, {
      data: { createProjectV2: { projectV2: { id: 'fake-project-id' } } }
    })
    .persist();

  // Mock para obter o ID do repositório
  nock('https://api.github.com')
  .post('/graphql', body => typeof body.query === 'string' && body.query.includes('repository(name: $repositoryName)'))
  .reply(200, {
    data: {
      organization: {
        repository: {
          id: 'fake-repo-id', // Aqui você simula o ID do repositório
        },
      },
    },
  })
  .persist();


  // Mock para obter labels do repositório
  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('labels'))
    .reply(200, {
      data: {
        repository: {
          labels: {
            nodes: [
              { id: 'fake-label-id-1', name: 'test' },
              { id: 'fake-label-id-2', name: 'bug' },
            ],
          },
        },
      },
    })
    .persist();

  // Mock para obter o ID da organização
  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('organization'))
    .reply(200, {
      data: { organization: { id: 'fake-org-id' } }
    })
    .persist();

  // Mock para criar issue
  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/issues`)
    .reply(201, {
      id: 123,
      number: 456,
      title: "Issue de Teste"
    })
    .persist();

  // Mock para criar issue via GraphQL
  nock('https://api.github.com')
    .post('/graphql', body =>
      typeof body.query === 'string' && body.query.includes('createIssue')
    )
    .reply(200, {
      data: {
        createIssue: {
          issue: {
            id: 'fake-issue-id',
            number: 456
          }
        }
      }
    })
    .persist();

  // Mock para adicionar issue ao projeto
  nock('https://api.github.com')
    .post('/graphql', body => typeof body.query === 'string' && body.query.includes('addProjectV2ItemById'))
    .reply(200, {
      data: { addProjectV2ItemById: { item: { id: 'fake-project-item-id' } } }
    })
    .persist();

  // Mock para adicionar labels a uma issue
  nock('https://api.github.com')
    .post('/graphql', body =>
      typeof body.query === 'string' && body.query.includes('addLabelsToLabelable')
    )
    .reply(200, {
      data: {
        addLabelsToLabelable: {
          labelable: {
            __typename: 'Issue',
          },
        },
      },
    })
    .persist();
});

afterEach(() => {
  nock.cleanAll();
});

test("Push Project to GitHub", async () => {
  const project: Project = {
    id: "test-id",
    name: "Projeto Teste Integração",
    description: "Projeto criado via teste de integração",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 dias
  };
  const projectId = await pushService.pushProject(org, project);
  expect(projectId).toBeDefined();
}, 30000);

test("Push Issue to GitHub and add to Project", async () => {
  const project: Project = {
    id: "test-id",
    name: "Projeto Teste Integração",
    description: "Projeto criado via teste de integração",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const projectId = await pushService.pushProject(org, project);

  const issue: Issue = {
    id: "issue-id",
    type: "github",
    subtype: "task",
    title: "Issue de Teste",
    description: "Criada via teste de integração",
    labels: ["test"],
  };

  // Mock de timebox com sprintItem e assignee
  const timebox = {
    sprintItems: [
      {
        issue: { id: "issue-id" },
        assignee: { discord: "usuario-github" }
      }
    ]
  };

  const result = await pushService.pushIssue(org, repo, projectId, issue, timebox as any);
  expect(result.issueId).toBeDefined();
  expect(result.issueNumber).toBeGreaterThan(0);
  expect(result.projectItemId).toBeDefined();
}, 30000);

test("Push Project with Issues", async () => {
  const project: Project = {
    id: "test-id",
    name: "Projeto Teste Integração",
    description: "Projeto criado via teste de integração",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const issues: Issue[] = [
    {
      id: "issue-1",
      type: "github",
      subtype: "task",
      title: "Primeira Issue",
      description: "Primeira issue do teste",
      labels: ["test"],
    },
    {
      id: "issue-2",
      type: "github",
      subtype: "bug",
      title: "Segunda Issue",
      description: "Segunda issue do teste",
      labels: ["bug"],
    },
  ];

  // Mock de timebox para passar como argumento
  const timebox = {
    sprintItems: [
      {
        issue: { id: "issue-1" },
        assignee: { discord: "usuario-github" }
      },
      {
        issue: { id: "issue-2" },
        assignee: { discord: "usuario-github" }
      }
    ]
  };

  await pushService.pushProjectWithIssues(org, repo, project, issues, timebox as any);
  expect(true).toBe(true);
}, 60000);