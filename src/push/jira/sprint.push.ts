import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { TimeBox } from '../../model/models';

const JiraBoardTypeName: { [key: string]: string } = {
  scrum: 'Scrum',
  kanban: 'Kanban',
}

export enum JiraBoardType {
  scrum = 'scrum',
  kanban = 'kanban'
}

export interface JiraBoard {
  id: string;
  self: string;
  name: string;
  type: string;
  location: {
    projectId: string;
    displayName: string;
    projectName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
    name: string;
  },
  isPrivate: boolean
}

export interface JiraFilterSearchOutput {
  id: string;
  name: string;
  self: string;
  expand: string;
}

export interface JiraSprint {
}

export interface JiraSprintSearchOutput {
  id: string;
  self: string;
  state: string;
  name: string;
  createdDate: string;
  originBoardId: string;
}

export class JiraSprintPushService {
  private axiosBoardInstance: AxiosInstance;
  private axiosFilterInstance: AxiosInstance;
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosBoardInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'board', true);
    this.axiosFilterInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'filter');
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'sprint', true);
  }

  /**
   * @description Ensure if sprint exists
   * @author Douglas Lima
   * @date 30/11/2025
   * @param {string} projectKey
   * @param {string} type
   * @param {TimeBox} timebox
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  async createSprint(projectKey: string, type: string, timebox: TimeBox): Promise<string> {
    try {
      // Check for input errors
      if (!projectKey) {
        console.error(`   ❌ Jira API errors: Sprint Project Key not defined to ensure a sprint exists`);
        return '';
      }
      if (!type) {
        console.error(`   ❌ Jira API errors: Sprint Type not defined to ensure a sprint exists`);
        return '';
      }
      if (!timebox || !timebox.sprintItems || !timebox.sprintItems.length) {
        console.error(`   ❌ Jira API errors: Sprint Issues not defined`);
        return '';
      }

      // Buscando o boardId para a sprint
      const boardId = await this.ensureBoardExists(projectKey, type);

      const {
        description,
        startDate,
        endDate,
        name
      } = timebox;

      try {
        console.log(`ℹ️ Verificando se a Sprint "${name}" existe.`);
        const searchResponse = await this.axiosInstance.get(`/agile/1.0/board/${boardId}/sprint`);
        const existingSprint = (searchResponse?.data?.values as JiraSprintSearchOutput[]).find(s => s.name === name);

        if (existingSprint) {
          console.log(`   ✅ Sprint '${name}' já existe. ID: ${existingSprint.id}`);
          return existingSprint.id;
        }
      } catch (error) {
        console.warn('    ⚠️ Não foi possível listar Sprints (pode ser problema de permissão). Tentando criar...');
      }

      // Criando o novo Sprint
      try {
        const startDateISO = `${startDate}T00:00:00.000Z`;
        const endDateISO = `${endDate}T23:59:59.000Z`;

        const createPayload = {
          name,
          goal: description,
          startDate: startDateISO,
          endDate: endDateISO,
          originBoardId: boardId
        };

        const createResponse = await this.axiosInstance.post('', createPayload);
        console.log(`   ✅ Sprint criado com sucesso! ID: ${createResponse.data.id}`);
        return createResponse.data.id;
      } catch (error: any) {
        throw error;
      }
    } catch (error: any) {
      console.error('   🛑 Erro ao criar Sprint:', error.response?.data?.errorMessages || error.message);
      return '';
    }
  }

  /**
   * @description Add issues to Sprint
   * @author Douglas Lima
   * @date 30/11/2025
   * @param {string} sprintId
   * @param {string[]} jiraIssueKeys
   * @return {*}  {Promise<void>}
   * @memberof JiraSprintPushService
   */
  async addIssuesToSprint(sprintId: string, jiraIssueKeys: string[]): Promise<void> {
    try {
      // Check for input errors
      if (!sprintId) {
        console.error(`   ❌ Jira API errors: Sprint Id not defined to add issues to the Sprint`);
        return;
      }
      if (!jiraIssueKeys || !jiraIssueKeys.length) {
        console.error(`   ❌ Jira API errors: Issues not defined to add issues to the Sprint`);
        return;
      }

      console.log(`📋 Atribuindo ${jiraIssueKeys.length} issues na Sprint '${sprintId}'`);

      const payload = {
        issues: jiraIssueKeys
      };

      // A resposta de sucesso geralmente é 204 No Content
      await this.axiosInstance.post(`/${sprintId}/issue`, payload);
      console.log(`   ✅ Todas as Issues atribuídas ao Sprint ${sprintId} com sucesso!`);

    } catch (error: any) {
      console.error(`   ❌ Tivemos um problema ao atribuir as Issues na Sprint ID '${sprintId}': `, error.response?.data?.errorMessages || error.message);
      return;
    }
  }

  /**
   * @description Ensure if project board exists
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {string} projectKey
   * @param {string} type
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  private async ensureBoardExists(projectKey: string, type: string): Promise<string> {
    try {
      // Check for input errors
      if (!projectKey) {
        console.error(`   ❌ Jira API errors: Project Key not defined to ensure a board exists`);
        return '';
      }
      if (!type) {
        console.error(`   ❌ Jira API errors: Board type not defined to ensure a board exists`);
        return '';
      }
      if (Object.keys(JiraBoardTypeName).includes(type)) {
        console.error(`   ❌ Jira API errors: Board type not recognized to ensure a board exists`);
        return '';
      }

      // Tenta buscar Boards associados ao projeto
      const searchResponse = await this.axiosInstance.get(`/agile/1.0/board?projectKeyOrId=${projectKey}`);
      const existingBoard = searchResponse.data.values.find((board: JiraBoard) => board.type === type);

      if (existingBoard) {
        console.log(`   ✅ Board: ${existingBoard.name} já existe. ID: ${existingBoard.id}`);
        return existingBoard.id;
      }

      // Se não existir, cria um novo Board
      const boardType = JiraBoardTypeName[type]
      console.log(`   ❌ Board ${boardType} não encontrado. Criando um novo...`);

      // Buscando o filter id para criar a board
      const filterId = await this.ensureFilterExists(projectKey, type)
      const createPayload = {
        name: `${projectKey} ${boardType} Board`,
        type,
        filterId,
        location: {
          projectKeyOrId: projectKey,
          type: 'project'
        }
      };

      const createResponse = await this.axiosBoardInstance.post('', createPayload);
      console.log(`   ✅ Board criado com sucesso! ID: ${createResponse.data.id}`);
      return createResponse.data.id;
    } catch (error: any) {
      console.error('   ❌ Erro ao verificar/criar Board: ', error.response?.data?.errorMessages || error.message);
      return '';
    }
  }

  /**
   * @description Ensure if project filter exists
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {string} projectKey
   * @param {string} type
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  private async ensureFilterExists(projectKey: string, type: string): Promise<string> {
    try {
      // Check for input errors
      if (!projectKey) {
        console.error(`   ❌ Jira API errors: Project Key not defined to ensure a board filter exists`);
        return '';
      }
      if (!type) {
        console.error(`   ❌ Jira API errors: Board type not defined to ensure a board filter exists`);
        return '';
      }
      if (Object.keys(JiraBoardTypeName).includes(type)) {
        console.error(`   ❌ Jira API errors: Board type not recognized to ensure a board filter exists`);
        return '';
      }

      const filterName = `${projectKey} ${JiraBoardTypeName[type]} Filter`;

      try {
        const response = await this.axiosFilterInstance.get(`/search?filterName=${encodeURIComponent(filterName)}`);

        // A API de filtro/search retorna um objeto com um array 'values'
        const existingFilter = (response?.data?.values as JiraFilterSearchOutput[]).find(f => f.name === filterName);

        if (existingFilter) {
          console.log(`   ✅ Filtro: ${filterName} encontrado! ID: ${existingFilter.id}`);
          return existingFilter.id;
        }
      } catch (error: any) {
        console.warn('    ⚠️ Aviso: Falha ao buscar filtro por nome. Prosseguindo para criação.');
      }

      // O Papel de Projeto ID 10000 geralmente corresponde ao 'Administradores' ou 'Usuários' padrão.
      const createPayload = {
        name: filterName,
        description: `Filtro base para o novo Board ${JiraBoardTypeName[type]} do projeto ${projectKey}.`,
        jql: `project = ${projectKey} ORDER BY Rank ASC`,
        sharePermissions: [
          {
            "type": "project",
            "project": { "id": projectKey }
          }
        ]
      };

      const createResponse = await this.axiosFilterInstance.post('/filter', createPayload);
      console.log(`   ✅ Filtro criado com sucesso! ID: ${createResponse.data.id}`);

      return createResponse.data.id;
    } catch (error: any) {
      console.error('   ❌ Não conseguimos criar filtro: ', error.response?.data?.errorMessages || error.message);
      return '';
    }
  }
}
