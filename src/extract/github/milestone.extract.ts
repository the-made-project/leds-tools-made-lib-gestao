import { Milestone } from '../../model/models';
import { DefaultMilestoneAdapter } from './Adapters/MilestoneAdapter';
import { GitHubTokenManager } from './GitHubTokenManager';

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  due_on: string | null;
  closed_at: string | null;
  html_url: string;
}

/**
 * Serviço responsável por interagir com milestones do GitHub
 */
export class MilestoneService {
  private baseUrl: string = 'https://api.github.com';
  private token: string = GitHubTokenManager.getInstance().getToken();
 
  /**
   * Obtém todos os milestones com suporte a paginação
   * @param owner Nome do proprietário do repositório
   * @param repo Nome do repositório
   * @param state Estado dos milestones ('open', 'closed', 'all')
   * @returns Promise com todos os milestones do repositório
   */
  async getAll(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'all'
  ): Promise<GitHubMilestone[]> {
    let allMilestones: GitHubMilestone[] = [];
    let page = 1;
    let hasMorePages = true;
    
    try {
      // Continua buscando páginas até não haver mais resultados
      while (hasMorePages) {
        const pageMilestones = await this.getMilestonesPage(owner, repo, state, page);
        
        if (pageMilestones.length === 0) {
          // Se não retornou resultados, não há mais páginas
          hasMorePages = false;
        } else {
          // Adiciona os milestones desta página ao resultado total
          allMilestones = [...allMilestones, ...pageMilestones];
          page++;
        }
      }
      
      return allMilestones;
    } catch (error) {
      console.error('Erro ao obter todos os milestones:', error);
      throw error;
    }
  }

  /**
   * Obtém uma página específica de milestones
   * @param owner Nome do proprietário do repositório
   * @param repo Nome do repositório
   * @param state Estado dos milestones
   * @param page Número da página
   * @param perPage Itens por página (máximo 100)
   * @returns Promise com os milestones da página solicitada
   */
  private async getMilestonesPage(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all',
    page: number,
    perPage: number = 100
  ): Promise<GitHubMilestone[]> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/milestones?state=${state}&page=${page}&per_page=${perPage}`;
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };
      
      // Adicionar token de autenticação se fornecido
      if (this.token) {
        headers['Authorization'] = `token ${this.token}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }
      
      return await response.json() as GitHubMilestone[];
    } catch (error) {
      console.error(`Erro ao obter página ${page} de milestones:`, error);
      throw error;
    }
  }
  async getFromProject(org: string, projectNumber: number): Promise<GitHubMilestone[]> {
    const query = `
      query($login: String!, $projectNumber: Int!, $after: String) {
        organization(login: $login) {
          projectV2(number: $projectNumber) {
            items(first: 50, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                content {
                  ... on Issue {
                    number
                    repository {
                      name
                      owner { login }
                    }
                    milestone {
                      number
                      title
                      description
                      state
                      createdAt
                      updatedAt
                      dueOn
                      closedAt
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  
    const milestonesMap = new Map<number, GitHubMilestone>();
    let hasNextPage = true;
    let after: string | null = null;
  
    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { login: org, projectNumber, after },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", json.errors);
        throw new Error("Erro ao buscar dados do projeto");
      }
  
      const projectData = json.data?.organization?.projectV2;
      if (!projectData) {
        throw new Error(`❌ Projeto #${projectNumber} não encontrado na organização '${org}'`);
      }
  
      const items = projectData.items;
  
      for (const node of items.nodes) {
        const issue = node.content;
        if (issue?.milestone) {
          const m = issue.milestone;
          if (!milestonesMap.has(m.number)) {
            milestonesMap.set(m.number, {
              id: m.number,
              number: m.number,
              title: m.title,
              description: m.description,
              state: m.state.toLowerCase() as 'open' | 'closed',
              created_at: m.createdAt,
              updated_at: m.updatedAt,
              due_on: m.dueOn,
              closed_at: m.closedAt,
              html_url: m.url,
            });
          }
        }
      }
  
      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
  
    return Array.from(milestonesMap.values());
  }
  
  
  /**
   * Mapeia um milestone do GitHub para o formato Milestone
   * @param githubMilestone Milestone do GitHub a ser convertido
   * @returns Milestone no formato padronizado
   */
  mapGitHubMilestoneToMilestone(
    githubMilestone: GitHubMilestone
  ): Milestone {
    let milestoneAdapter: DefaultMilestoneAdapter = new DefaultMilestoneAdapter();
    return milestoneAdapter.toInternalFormat(githubMilestone);
  }

  
}