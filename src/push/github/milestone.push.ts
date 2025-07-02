import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { axiosInstance } from '../../util/axiosInstance';
import { Milestone, Release, Issue } from '../../model/models';
import axios from 'axios';

export interface GitHubMilestoneInput {
  title: string;
  description?: string;
  due_on?: string;
  state?: 'open' | 'closed';
}

export interface GitHubMilestoneCreated {
  id: number;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed';
  due_on: string | null;
  html_url: string;
}

export class GitHubMilestonePushService {
  private token: string;

  constructor(token: string) {
    this.token = token;
    if (!this.token) {
      throw new Error('❌ GITHUB_TOKEN não está definido. Configure-o como uma variável de ambiente.');
    }
  }

  /**
   * Converte uma data para o formato ISO 8601 necessário para a API do GitHub
   */
  private formatDateForGitHub(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      // Se já estiver no formato ISO correto, retorna como está
      if (dateStr.includes('T') && dateStr.includes('Z')) {
        return dateStr;
      }
      
      // Se estiver no formato YYYY-MM-DD, adiciona a hora
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return `${dateStr}T23:59:59Z`;
      }
      
      // Se estiver no formato DD/MM/YYYY, converte para YYYY-MM-DD
      const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        return `${year}-${month}-${day}T23:59:59Z`;
      }
      
      // Tenta converter outras variações
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Data inválida: ${dateStr}, usando undefined`);
        return undefined;
      }
      
      return date.toISOString();
    } catch (error) {
      console.warn(`⚠️ Erro ao formatar data: ${dateStr}, usando undefined`);
      return undefined;
    }
  }

  /**
   * Cria um milestone no GitHub usando REST API
   */
  async createMilestone(
    org: string,
    repo: string,
    milestone: Milestone
  ): Promise<GitHubMilestoneCreated> {
    try {
      console.log(`📋 Criando milestone: ${milestone.name}`);

      const restAxios = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
        },
      });

      const milestoneData: GitHubMilestoneInput = {
        title: milestone.name,
        description: milestone.description || '',
        due_on: this.formatDateForGitHub(milestone.dueDate),
        state: milestone.status === 'COMPLETED' ? 'closed' : 'open'
      };

      const response = await restAxios.post(
        `/repos/${org}/${repo}/milestones`,
        milestoneData
      );

      const created = response.data as GitHubMilestoneCreated;
      console.log(`✅ Milestone criado: ${created.title} (#${created.number})`);

      return created;
    } catch (error: any) {
      console.error(`❌ Erro ao criar milestone "${milestone.name}":`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Atualiza um milestone existente
   */
  async updateMilestone(
    org: string,
    repo: string,
    milestoneNumber: number,
    milestone: Milestone
  ): Promise<GitHubMilestoneCreated> {
    try {
      console.log(`🔄 Atualizando milestone #${milestoneNumber}: ${milestone.name}`);

      const restAxios = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
        },
      });

      const milestoneData: GitHubMilestoneInput = {
        title: milestone.name,
        description: milestone.description || '',
        due_on: this.formatDateForGitHub(milestone.dueDate),
        state: milestone.status === 'COMPLETED' ? 'closed' : 'open'
      };

      const response = await restAxios.patch(
        `/repos/${org}/${repo}/milestones/${milestoneNumber}`,
        milestoneData
      );

      const updated = response.data as GitHubMilestoneCreated;
      console.log(`✅ Milestone atualizado: ${updated.title} (#${updated.number})`);

      return updated;
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar milestone #${milestoneNumber}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verifica se um milestone já existe no repositório
   */
  async milestoneExists(
    org: string,
    repo: string,
    milestoneName: string
  ): Promise<GitHubMilestoneCreated | null> {
    try {
      const restAxios = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
        },
      });

      // Busca todos os milestones (open e closed)
      let allMilestones: GitHubMilestoneCreated[] = [];
      for (const state of ['open', 'closed']) {
        const response = await restAxios.get(
          `/repos/${org}/${repo}/milestones?state=${state}&per_page=100`
        );
        allMilestones = [...allMilestones, ...response.data];
      }

      const existing = allMilestones.find(m => m.title === milestoneName);
      return existing || null;
    } catch (error: any) {
      console.error(`❌ Erro ao verificar milestone "${milestoneName}":`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Cria ou atualiza um milestone
   */
  async createOrUpdateMilestone(
    org: string,
    repo: string,
    milestone: Milestone
  ): Promise<GitHubMilestoneCreated> {
    const existing = await this.milestoneExists(org, repo, milestone.name);
    
    if (existing) {
      return await this.updateMilestone(org, repo, existing.number, milestone);
    } else {
      return await this.createMilestone(org, repo, milestone);
    }
  }

  /**
   * Cria labels para as releases de um milestone
   */
  async createReleaseLabels(
    org: string,
    repo: string,
    releases: Release[]
  ): Promise<void> {
    if (!releases?.length) return;

    const restAxios = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
    });

    for (const release of releases) {
      try {
        // Label para a versão da release
        await restAxios.post(
          `/repos/${org}/${repo}/labels`,
          {
            name: `release: ${release.version}`,
            color: '0052CC',
            description: `Release ${release.version} - ${release.name}`
          }
        );
        console.log(`✅ Label criada para release: ${release.version}`);
      } catch (error: any) {
        // Se a label já existe, apenas log a informação
        if (error.response?.status === 422) {
          console.log(`ℹ️ Label "release: ${release.version}" já existe`);
        } else {
          console.error(`❌ Erro ao criar label para release ${release.version}:`, error.response?.data || error.message);
        }
      }
    }
  }

  /**
   * Atribui um milestone às issues de uma release
   */
  async assignMilestoneToIssues(
    org: string,
    repo: string,
    milestoneNumber: number,
    issues: Issue[]
  ): Promise<void> {
    if (!issues?.length) return;

    const restAxios = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
    });

    for (const issue of issues) {
      try {
        // Busca a issue no GitHub pelo título ou ID
        const issuesResponse = await restAxios.get(
          `/repos/${org}/${repo}/issues`,
          {
            params: {
              state: 'all',
              per_page: 100
            }
          }
        );

        const gitHubIssue = issuesResponse.data.find((ghIssue: any) => 
          ghIssue.title.includes(issue.title || issue.id) ||
          ghIssue.title.includes(issue.id)
        );

        if (gitHubIssue) {
          // Atribui o milestone à issue
          await restAxios.patch(
            `/repos/${org}/${repo}/issues/${gitHubIssue.number}`,
            {
              milestone: milestoneNumber
            }
          );
          console.log(`✅ Milestone #${milestoneNumber} atribuído à issue #${gitHubIssue.number}: ${gitHubIssue.title}`);
        } else {
          console.warn(`⚠️ Issue não encontrada no GitHub: ${issue.title || issue.id}`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao atribuir milestone à issue ${issue.title || issue.id}:`, error.response?.data || error.message);
        // Continua para as próximas issues
      }
    }
  }

  /**
   * Atribui issues das releases de um milestone ao milestone no GitHub
   */
  async assignIssuesToMilestone(
    org: string,
    repo: string,
    milestoneNumber: number,
    releases: Release[]
  ): Promise<void> {
    if (!releases?.length) return;

    console.log(`📎 Atribuindo issues das releases ao milestone #${milestoneNumber}...`);

    const restAxios = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
    });

    // Coleta todas as issues de todas as releases
    const allIssues: Issue[] = [];
    for (const release of releases) {
      if (release.issues?.length) {
        allIssues.push(...release.issues);
      }
    }

    if (allIssues.length === 0) {
      console.log(`ℹ️ Nenhuma issue encontrada nas releases do milestone #${milestoneNumber}`);
      return;
    }

    console.log(`📝 Processando ${allIssues.length} issues das releases...`);

    for (const issue of allIssues) {
      try {
        // Verifica se a issue tem pelo menos um identificador válido
        const hasValidTitle = issue.title && issue.title.trim() !== '' && issue.title !== 'undefined';
        const hasValidId = issue.id && issue.id.toString().trim() !== '' && issue.id.toString() !== 'undefined';
        const hasValidKey = issue.key && issue.key.trim() !== '' && issue.key !== 'undefined';
        const hasValidExternalId = issue.externalId && issue.externalId.trim() !== '' && issue.externalId !== 'undefined';
        
        if (!hasValidTitle && !hasValidId && !hasValidKey && !hasValidExternalId) {
          console.warn(`⚠️ Issue sem identificadores válidos encontrada, pulando: ${JSON.stringify({
            title: issue.title,
            id: issue.id,
            key: issue.key,
            externalId: issue.externalId
          })}`);
          continue;
        }

        const issueInfo = issue.title || issue.id || issue.key || issue.externalId || 'sem identificador';
        console.log(`🔍 Buscando issue: "${issueInfo}"`);
        
        // Usa a nova função de busca com múltiplas estratégias
        const gitHubIssue = await this.findGitHubIssue(restAxios, org, repo, issue);
        
        if (gitHubIssue) {
          // Atribui o milestone à issue
          await restAxios.patch(
            `/repos/${org}/${repo}/issues/${gitHubIssue.number}`,
            {
              milestone: milestoneNumber
            }
          );
          
          console.log(`✅ Milestone #${milestoneNumber} atribuído à issue #${gitHubIssue.number}: ${gitHubIssue.title}`);
        } else {
          console.warn(`⚠️ Issue não encontrada no GitHub após todas as tentativas: "${issueInfo}"`);
        }
      } catch (error: any) {
        const issueIdentifier = issue.title || issue.id || issue.key || issue.externalId || 'Unknown';
        console.error(`❌ Erro ao atribuir milestone à issue "${issueIdentifier}":`, error.response?.data || error.message);
        // Continua para as próximas issues
      }
    }

    console.log(`✅ Processamento de atribuição de issues concluído para milestone #${milestoneNumber}`);
  }

  /**
   * Busca uma issue no GitHub usando múltiplas estratégias
   */
  private async findGitHubIssue(
    restAxios: any,
    org: string,
    repo: string,
    issue: Issue
  ): Promise<any | null> {
    const strategies: { name: string; query: string }[] = [];
    
    // Estratégia 1: Buscar por título completo se disponível
    if (issue.title && issue.title.trim() !== '' && issue.title !== 'undefined') {
      strategies.push({
        name: 'título',
        query: `"${issue.title.trim()}" repo:${org}/${repo}`,
      });
    }
    
    // Estratégia 2: Buscar por ID se disponível e válido
    if (issue.id && issue.id.toString().trim() !== '' && issue.id.toString() !== 'undefined') {
      strategies.push({
        name: 'ID',
        query: `${issue.id} repo:${org}/${repo}`,
      });
    }
    
    // Estratégia 3: Buscar por key se disponível e válido
    if (issue.key && issue.key.trim() !== '' && issue.key !== 'undefined') {
      strategies.push({
        name: 'key',
        query: `${issue.key} repo:${org}/${repo}`,
      });
    }
    
    // Estratégia 4: Buscar por externalId se disponível e válido
    if (issue.externalId && issue.externalId.trim() !== '' && issue.externalId !== 'undefined') {
      strategies.push({
        name: 'externalId',
        query: `${issue.externalId} repo:${org}/${repo}`,
      });
    }
    
    // Se nenhuma estratégia foi criada, não há como buscar
    if (strategies.length === 0) {
      console.warn(`⚠️ Issue sem identificadores válidos: ${JSON.stringify({
        title: issue.title,
        id: issue.id,
        key: issue.key,
        externalId: issue.externalId
      })}`);
      return null;
    }
    
    for (const strategy of strategies) {
      try {
        console.log(`🔍 Buscando issue por ${strategy.name}: ${strategy.query}`);
        
        const searchResponse = await restAxios.get(
          `/search/issues?q=${encodeURIComponent(strategy.query)}&type=issue`
        );
        
        if (searchResponse.data?.items?.length > 0) {
          const gitHubIssue = searchResponse.data.items[0];
          console.log(`✅ Issue encontrada por ${strategy.name}: #${gitHubIssue.number} - ${gitHubIssue.title}`);
          return gitHubIssue;
        } else {
          console.log(`ℹ️ Nenhuma issue encontrada por ${strategy.name}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Erro na busca por ${strategy.name}:`, error.response?.data || error.message);
      }
    }
    
    return null;
  }
}
