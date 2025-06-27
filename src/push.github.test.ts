import { expect, test, beforeAll, beforeEach, afterEach } from "vitest";
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import { Project, Issue, Roadmap, Milestone } from "./model/models";
import dotenv from 'dotenv';
import nock from 'nock';

dotenv.config();

const org = process.env.GITHUB_ORG;
const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
if (!token) {
  throw new Error('GITHUB_TOKEN not set');
}
if (!org) {
  throw new Error('GITHUB_ORG not set');
}
if (!repo) {
  throw new Error('GITHUB_REPO not set');
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

  // Mock para obter campos do projeto (getProjectFieldIdByName)
  nock('https://api.github.com')
    .post('/graphql', body =>
      typeof body.query === 'string' && body.query.includes('fields(first: 20)')
    )
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

  // Mock para busca de issues (para atribuição de milestones)
  nock('https://api.github.com')
    .get('/search/issues')
    .query(true) // Aceita qualquer query parameter
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
    .get('/search/issues')
    .query(true) // Aceita qualquer query parameter
    .reply(200, {
      items: [
        {
          number: 2,
          title: "Setup database schema",
          html_url: `https://github.com/${org}/${repo}/issues/2`
        }
      ]
    })
    .persist();

  // Mock para atribuição de milestone às issues
  nock('https://api.github.com')
    .patch(`/repos/${org}/${repo}/issues/1`)
    .reply(200, {
      number: 1,
      title: "Implement authentication system",
      milestone: { number: 1, title: "Q1 2025" }
    })
    .persist();

  nock('https://api.github.com')
    .patch(`/repos/${org}/${repo}/issues/2`)
    .reply(200, {
      number: 2,
      title: "Setup database schema", 
      milestone: { number: 1, title: "Q1 2025" }
    })
    .persist();

  // Mock para criação de labels de releases
  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/labels`)
    .reply(201, { name: "release: 1.0", color: "0052CC" })
    .persist();

  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/labels`)
    .reply(201, { name: "release: 2.0", color: "0052CC" })
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

  const result = await pushService.pushIssue(org, repo, projectId, issue, [], [], [], []);
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

test("Push Project with Roadmaps and Milestones", async () => {
  const project: Project = {
    id: "test-id",
    name: "Projeto Teste Integração",
    description: "Projeto criado via teste de integração",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const roadmap: Roadmap = {
    id: "roadmap-1",
    name: "Roadmap 2025",
    description: "Planejamento estratégico para 2025",
    milestones: [
      {
        id: "milestone-1",
        name: "Q1 2025",
        description: "Primeira entrega trimestral",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // +90 dias
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
              },
              {
                id: "issue-2", 
                title: "Setup database schema",
                description: "Create initial database structure",
                type: "Task",
                subtype: "task"
              }
            ]
          }
        ]
      },
      {
        id: "milestone-2", 
        name: "Q2 2025",
        description: "Segunda entrega trimestral",
        startDate: new Date(Date.now() + 91 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // +180 dias
        status: 'PLANNED',
        releases: [
          {
            id: "release-2.0",
            version: "2.0",
            name: "Second Release",
            description: "Enhanced features and improvements",
            dueDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'PLANNED',
            issues: [
              {
                id: "issue-3",
                title: "Add reporting dashboard",
                description: "Create comprehensive reporting interface",
                type: "Feature",
                subtype: "feature"
              }
            ]
          }
        ]
      }
    ]
  };

  // Mock específico para criação de milestones
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
    .post(`/repos/${org}/${repo}/milestones`)
    .reply(201, {
      id: 123457,
      number: 2,
      title: "Q2 2025",
      state: "open", 
      due_on: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      html_url: `https://github.com/${org}/${repo}/milestone/2`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .persist();

  // Mock para buscar milestones existentes (verificação de duplicatas)
  nock('https://api.github.com')
    .get(`/repos/${org}/${repo}/milestones`)
    .query({ state: 'open', per_page: 100 })
    .reply(200, [])
    .persist();

  nock('https://api.github.com')
    .get(`/repos/${org}/${repo}/milestones`)
    .query({ state: 'closed', per_page: 100 })
    .reply(200, [])
    .persist();

  // Mock para criação de labels de roadmap
  nock('https://api.github.com')
    .post(`/repos/${org}/${repo}/labels`)
    .reply(201, { name: "roadmap: Roadmap 2025", color: "8B5CF6" })
    .persist();

  const projectId = await pushService.pushProject(org, project);
  
  // Executa o fullPush com roadmaps
  await pushService.fullPush(org, repo, project, [], [], [], undefined, undefined, undefined, [roadmap]);
  
  expect(projectId).toBeDefined();
}, 60000);