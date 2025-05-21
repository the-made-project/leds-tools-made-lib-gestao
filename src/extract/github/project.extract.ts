import {Project} from "../../model/models";

export interface GitHubProject {
  id: string;
  number: number;
  title: string;
  shortDescription: string | null;
  createdAt: string;
  updatedAt: string;
  closed: boolean;
}

export class GitHubProjectService {
  private GITHUB_API_URL = "https://api.github.com/graphql";

  constructor(private token: string) {}

  async getAll(org: string): Promise<GitHubProject[]> {
    const query = `
      query($org: String!, $after: String) {
        organization(login: $org) {
          projectsV2(first: 20, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              number
              title
              shortDescription
              createdAt
              updatedAt
              closed
            }
          }
        }
      }
    `;

    let projects: GitHubProject[] = [];
    let hasNextPage = true;
    let after: string | null = null;

    while (hasNextPage) {
      const response = await fetch(this.GITHUB_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables: { org, after } }),
      });

      const json = await response.json();
      const data = json.data.organization.projectsV2;

      for (const p of data.nodes) {
        projects.push({
          id: p.id,
          number: p.number,
          title: p.title,
          shortDescription: p.shortDescription,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          closed: p.closed
        });
      }

      hasNextPage = data.pageInfo.hasNextPage;
      after = data.pageInfo.endCursor;
    }

    return projects;
  }

  async getByNumber(org: string, projectNumber: number): Promise<GitHubProject | null> {
    const projects = await this.getAll(org);
    const project = projects.find((p) => p.number === projectNumber);
    return project ?? null;
  }

  async getByTitle(org: string, projectTitle: string): Promise<GitHubProject | null> {
    const projects = await this.getAll(org);
    const project = projects.find((p) => p.title.toLowerCase() === projectTitle.toLowerCase());
    return project ?? null;
  }

  
  /**
   * Mapeia um projeto do GitHub para o formato Project
   * @param githubProject Projeto do GitHub a ser convertido
   * @returns Projeto no formato padronizado
   */
  async mapGitHubProjectToProject(githubProject: GitHubProject): Promise<Project> {
    // Criamos uma data de vencimento estimada (3 meses após a criação)
    const createdDate = new Date(githubProject.createdAt);
    const estimatedDueDate = new Date(createdDate);
    estimatedDueDate.setMonth(createdDate.getMonth() + 3);
    
    // Se o projeto estiver fechado, usamos a data de atualização como data de conclusão
    const completedDate = githubProject.closed ? githubProject.updatedAt : undefined;
    
    return {
      id: githubProject.id,
      name: githubProject.title,
      description: githubProject.shortDescription || undefined,
      startDate: githubProject.createdAt,
      dueDate: estimatedDueDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
      completedDate: completedDate
    };
  }
}
