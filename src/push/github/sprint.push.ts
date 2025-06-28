import axios from 'axios';
import { TimeBox, SprintItem, Issue, Person } from '../../model/models';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { createOrEnsureLabel } from './label.push';
import { parseDate } from '../../util/date-util';

// Interface para representar uma Sprint Issue no GitHub
export interface GitHubSprintIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

// Interface para resposta da criação de Sprint
export interface GitHubSprintIssueCreated {
  id: number;
  number: number;
  node_id: string;
}

/**
 * Serviço simplificado para criar issues de Sprint usando REST API
 */
export class GitHubSprintPushService {
  private token: string;
  private restAxios: any;

  constructor(token: string) {
    this.token = token;
    if (!this.token) {
      throw new Error('GitHub token is required');
    }
    
    // Configura axios para REST API
    this.restAxios = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
  }

  /**
   * Cria labels para a sprint (nome da sprint e status)
   */
  async ensureSprintLabels(
    org: string,
    repo: string,
    sprintName: string,
    status: string
  ): Promise<void> {
    try {
      // Label para o nome da sprint
      await createOrEnsureLabel(
        org,
        repo,
        `sprint: ${sprintName}`,
        '0052CC',
        `Sprint ${sprintName}`
      );

      // Label para o status da sprint
      const statusColors: { [key: string]: string } = {
        'PLANNED': 'FEF2C0',
        'IN_PROGRESS': '0E8A16',
        'CLOSED': '5319E7'
      };

      await createOrEnsureLabel(
        org,
        repo,
        `status: ${status}`,
        statusColors[status] || 'CCCCCC',
        `Status: ${status}`
      );

      // Label para tipo sprint
      await createOrEnsureLabel(
        org,
        repo,
        'type: sprint',
        'B60205',
        'Sprint issue type'
      );

    } catch (error: any) {
      console.error(`❌ Erro ao criar labels para sprint ${sprintName}:`, error.message);
    }
  }

  /**
   * Formata uma data para exibição
   */
  private formatDate(dateStr: string): string {
    try {
      const date = parseDate(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * Constrói o corpo da issue de Sprint
   */
  private buildSprintBody(
    timebox: TimeBox,
    relatedTasks: Issue[],
    taskResults: { issueId: string, issueNumber: number }[] = []
  ): string {
    const idToNumber = new Map<string, number>();
    taskResults.forEach(res => idToNumber.set(res.issueId, res.issueNumber));

    let body = `# [SPRINT] ${timebox.name}\n\n`;
    
    if (timebox.description) {
      body += `## Descrição\n${timebox.description}\n\n`;
    }

    // Informações da Sprint
    body += `## Dados da Sprint\n`;
    body += `* **Goal**: ${timebox.description || timebox.name}\n`;
    body += `* **Data Início**: ${this.formatDate(timebox.startDate)}\n`;
    body += `* **Data Fim**: ${this.formatDate(timebox.endDate)}\n`;
    if (timebox.completeDate) {
      body += `* **Data Conclusão**: ${this.formatDate(timebox.completeDate)}\n`;
    }
    body += `* **Status**: ${timebox.status || 'PLANNED'}\n\n`;

    // Sprint Backlog
    if (timebox.sprintItems && timebox.sprintItems.length > 0) {
      body += `## Sprint Backlog\n\n`;
      body += `| Nome | Responsável | Data Início Planejada | Data Fim Planejada | Status |\n`;
      body += `|------|-------------|:--------------------:|:------------------:|:------:|\n`;

      timebox.sprintItems.forEach(item => {
        const taskNumber = idToNumber.get(item.issue.id);
        const taskTitle = taskNumber ? `[${item.issue.title || item.issue.id}](#${taskNumber})` : (item.issue.title || item.issue.id);
        const assignee = item.assignee?.name || 'Não atribuído';
        const plannedStart = item.plannedStartDate ? this.formatDate(item.plannedStartDate) : '-';
        const plannedDue = item.plannedDueDate ? this.formatDate(item.plannedDueDate) : '-';
        const status = item.status || 'TODO';

        body += `| ${taskTitle} | ${assignee} | ${plannedStart} | ${plannedDue} | ${status} |\n`;
      });
      body += `\n`;
    }

    // Dependências (comentários sobre tasks relacionadas)
    if (relatedTasks.length > 1) {
      body += `## Dependências e Ordem de Execução\n\n`;
      body += `As tasks desta sprint possuem as seguintes dependências:\n\n`;
      
      relatedTasks.forEach((task, index) => {
        const taskNumber = idToNumber.get(task.id);
        const taskReference = taskNumber ? `#${taskNumber}` : task.title || task.id;
        
        if (task.depends && task.depends.length > 0) {
          const dependencies = task.depends.map(dep => {
            const depNumber = idToNumber.get(dep.id);
            return depNumber ? `#${depNumber}` : dep.title || dep.id;
          }).join(', ');
          body += `- **${taskReference}** depende de: ${dependencies}\n`;
        } else if (index === 0) {
          body += `- **${taskReference}** pode ser iniciada imediatamente\n`;
        }
      });
      body += `\n`;
    }

    return body;
  }

  /**
   * Converte um TimeBox para o modelo de entrada do GitHub
   */
  mapTimeBoxToGitHubSprintInput(
    timebox: TimeBox,
    relatedTasks: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = []
  ): GitHubSprintIssueInput {
    const sprintLabels = [
      `sprint: ${timebox.name}`,
      `status: ${timebox.status || 'PLANNED'}`,
      'type: sprint'
    ];

    return {
      title: `Sprint: ${timebox.name}`,
      body: this.buildSprintBody(timebox, relatedTasks, taskResults),
      labels: sprintLabels,
      assignees: []
    };
  }

  /**
   * Cria uma issue de Sprint no GitHub usando REST API
   */
  async createSprintIssue(
    org: string,
    repo: string,
    timebox: TimeBox,
    relatedTasks: Issue[] = [],
    taskResults: { issueId: string, issueNumber: number }[] = []
  ): Promise<GitHubSprintIssueCreated> {
    try {
      // Primeiro, garante que as labels existem
      await this.ensureSprintLabels(
        org,
        repo,
        timebox.name,
        timebox.status || 'PLANNED'
      );

      const sprintInput = this.mapTimeBoxToGitHubSprintInput(timebox, relatedTasks, taskResults);

      // Cria a issue usando REST API
      const response = await this.restAxios.post(`/repos/${org}/${repo}/issues`, {
        title: sprintInput.title,
        body: sprintInput.body,
        labels: sprintInput.labels,
        assignees: sprintInput.assignees
      });

      const issue = response.data;

      return {
        id: issue.id,
        number: issue.number,
        node_id: issue.node_id
      };

    } catch (error: any) {
      console.error('❌ Erro ao criar sprint issue:', error.response?.data || error.message);
      throw new Error(`Falha ao criar sprint issue: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Adiciona labels de sprint às tasks relacionadas usando REST API
   */
  async addSprintLabelsToTasks(
    org: string,
    repo: string,
    sprintName: string,
    taskNumbers: number[]
  ): Promise<void> {
    const sprintLabel = `sprint: ${sprintName}`;

    for (const taskNumber of taskNumbers) {
      try {
        // Busca as labels atuais da issue
        const issueResponse = await this.restAxios.get(`/repos/${org}/${repo}/issues/${taskNumber}`);
        const currentLabels = issueResponse.data.labels.map((label: any) => label.name);

        // Adiciona a label da sprint se não existir
        if (!currentLabels.includes(sprintLabel)) {
          const newLabels = [...currentLabels, sprintLabel];
          
          await this.restAxios.patch(`/repos/${org}/${repo}/issues/${taskNumber}`, {
            labels: newLabels
          });
        }

      } catch (error: any) {
        console.error(`❌ Erro ao adicionar label à task #${taskNumber}:`, error.response?.data || error.message);
      }
    }
  }
}

/**
 * Função utilitária para criar uma sprint de forma simplificada
 */
export async function createSprint(
  org: string,
  repo: string,
  timebox: TimeBox,
  relatedTasks: Issue[] = [],
  taskResults: { issueId: string, issueNumber: number }[] = []
): Promise<GitHubSprintIssueCreated> {
  const service = new GitHubSprintPushService(GitHubTokenManager.getInstance().getToken());
  return service.createSprintIssue(org, repo, timebox, relatedTasks, taskResults);
}
