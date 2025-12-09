import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { TimeBox } from '../../model/models';

const JiraBoardTypeName: { [key: string]: string } = {
  scrum: 'Scrum',
  kanban: 'Kanban',
  simple: 'Simple',
}

export enum JiraBoardType {
  scrum = 'scrum',
  kanban = 'kanban',
  simple = 'simple'
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
   * @param {string} projectId
   * @param {string} projectKey
   * @param {string} type
   * @param {TimeBox} timebox
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  async ensureSprintExists(projectId: string, projectKey: string, type: string, timebox: TimeBox): Promise<string> {
    try {
      // Check for input errors
      if (!projectId) {
        console.error(`   ❌ Jira API errors: Sprint Project Id not defined to ensure a sprint exists`);
        return '';
      }
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
      const boardId = await this.ensureBoardExists(projectId, projectKey, type);

      const {
        description,
        startDate,
        endDate,
        name
      } = timebox;
      // Deafult sprint name
      const nameToDelete = `${projectKey} Sprint 1`

      try {
        console.log(`ℹ️ Verificando se a Sprint "${name}" existe.`);
        const searchResponse = await this.axiosBoardInstance.get(`/${boardId}/sprint`);

        // Delete default sprint if exists
        const sprintToDelete = (searchResponse?.data?.values as JiraSprintSearchOutput[]).find(s => s.name === nameToDelete);

        if (sprintToDelete) {
          await this.axiosInstance.delete(`/${sprintToDelete.id}`);
          console.log(`   ℹ️ Removido a Sprint padrão "${nameToDelete}" para criar pelo made.`);
        }

        // Getting existing sprint to update and return it
        const existingSprint = (searchResponse?.data?.values as JiraSprintSearchOutput[]).find(s => s.name === name);

        if (existingSprint) {
          console.log(`   ✅ Sprint "${name}" já existe. ID: "${existingSprint.id}"`);
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

        console.log(`ℹ️ Criando Sprint "${name}"`);
        const createResponse = await this.axiosInstance.post('', createPayload);
        const sprintData = createResponse.data;

        // // Ativando a sprint após a criação(isso permite que issues sejam adicionadas)
        // try {
        //   if (sprintData && sprintData.id) await this.axiosInstance.put(`/${sprintData.id}`, { state: 'active' });
        // } catch (error: any) {
        //   console.log(`   ℹ️ Não foi possível ativar a Sprint "${name}".`, error.response?.data?.errorMessages || error.message);
        // }

        console.log(`   ✅ Sprint criado com sucesso! ID: "${sprintData.id}"`);

        return sprintData.id;
      } catch (error: any) {
        throw error;
      }
    } catch (error: any) {
      console.error('   ❌ Erro ao criar Sprint:', error.response?.data?.errorMessages || error.message);
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

      console.log(`📋 Atribuindo ${jiraIssueKeys.length} issues na Sprint "${sprintId}"`);

      const payload = {
        issues: jiraIssueKeys
      };

      // A resposta de sucesso geralmente é 204 No Content
      await this.axiosInstance.post(`/${sprintId}/issue`, payload);
      console.log(`   ✅ Issues atribuídas ao Sprint "${sprintId}" com sucesso!`);

    } catch (error: any) {
      console.error(`   ❌ Tivemos um problema ao atribuir as Issues na Sprint ID "${sprintId}": `, error.response?.data?.errorMessages || error.message);
      return;
    }
  }

  /**
   * @description Ensure if project board exists
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {string} projectId
   * @param {string} projectKey
   * @param {string} type
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  private async ensureBoardExists(projectId: string, projectKey: string, type: string): Promise<string> {
    try {
      // Check for input errors
      if (!projectId) {
        console.error(`   ❌ Jira API errors: Project Id not defined to ensure a board exists`);
        return '';
      }
      if (!projectKey) {
        console.error(`   ❌ Jira API errors: Project Key not defined to ensure a board exists`);
        return '';
      }
      if (!type) {
        console.error(`   ❌ Jira API errors: Board type not defined to ensure a board exists`);
        return '';
      }
      if (!Object.keys(JiraBoardType).includes(type)) {
        console.error(`   ❌ Jira API errors: Board type not recognized to ensure a board exists`);
        return '';
      }

      // Define the defaul board name
      const boardName = `${projectKey} board`

      // Tenta buscar Boards associados ao projeto
      const searchResponse = await this.axiosBoardInstance.get(`?projectKeyOrId=${projectKey}`);
      const existingBoard = (searchResponse.data?.values || []).find((board: JiraBoard) => board.name === boardName && board.type === type);

      if (existingBoard) {
        console.log(`   ✅ Board: ${existingBoard.name} já existe. ID: "${existingBoard.id}"`);
        return existingBoard.id;
      }

      // Se não existir, cria um novo Board
      console.log(`   ℹ️ "${boardName}" não encontrada. Criando uma nova...`);

      // Buscando o filter id para criar a board
      const filterId = await this.ensureFilterExists(projectId, projectKey, type)
      const createPayload = {
        name: boardName,
        type,
        filterId,
        location: {
          projectKeyOrId: projectKey,
          type: 'project'
        }
      };

      const createResponse = await this.axiosBoardInstance.post('', createPayload);
      console.log(`   ✅ Board criado com sucesso! ID: "${createResponse.data.id}"`);

      return createResponse.data.id;
    } catch (error: any) {
      if (error.response?.status === 422 || error.response?.status === 400) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      console.error('   ❌ Erro ao verificar/criar Board: ', error.response?.data?.errorMessages || error.message);
      return '';
    }
  }

  /**
   * @description Ensure if project filter exists
   * @author Douglas Lima
   * @date 30/11/2025
   * @private
   * @param {string} projectId
   * @param {string} projectKey
   * @param {string} type
   * @return {*}  {Promise<string>}
   * @memberof JiraSprintPushService
   */
  private async ensureFilterExists(projectId: string, projectKey: string, type: string): Promise<string> {
    try {
      // Check for input errors
      if (!projectId) {
        console.error(`   ❌ Jira API errors: Project Id not defined to ensure a board filter exists`);
        return '';
      }
      if (!projectKey) {
        console.error(`   ❌ Jira API errors: Project Key not defined to ensure a board filter exists`);
        return '';
      }
      if (!type) {
        console.error(`   ❌ Jira API errors: Board type not defined to ensure a board filter exists`);
        return '';
      }
      if (!Object.keys(JiraBoardType).includes(type)) {
        console.error(`   ❌ Jira API errors: Board type not recognized to ensure a board filter exists`);
        return '';
      }

      const filterName = `${projectKey} ${JiraBoardTypeName[type]} Filter`;

      try {
        const response = await this.axiosFilterInstance.get(`/search`);

        // A API de filtro/search retorna um objeto com um array 'values'
        const existingFilter = (response?.data?.values as JiraFilterSearchOutput[]).find(f => f.name === filterName);

        if (existingFilter) {
          console.log(`   ✅ Filtro: ${filterName} encontrado! ID: ${existingFilter.id}`);
          return existingFilter.id;
        }
      } catch (error: any) {
        console.error('    ⚠️ Aviso: Falha ao buscar filtro por nome. Prosseguindo para criação.');
      }

      console.log(`   ℹ️ Filtro "${filterName}" não encontrado. Criando um novo...`);

      // O Papel de Projeto ID 10000 geralmente corresponde ao 'Administradores' ou 'Usuários' padrão.
      const createPayload = {
        name: filterName,
        description: `Filtro base para o novo Board ${JiraBoardTypeName[type]} do projeto ${projectKey}.`,
        jql: `project = ${projectKey} ORDER BY Rank ASC`,
        sharePermissions: [
          {
            "type": "project",
            "project": { "id": projectId }
          }
        ]
      };

      const createResponse = await this.axiosFilterInstance.post('', createPayload);
      console.log(`   ✅ Filtro criado com sucesso! ID: ${createResponse.data.id}`);

      return createResponse.data.id;
    } catch (error: any) {
      console.error('   ❌ Não conseguimos criar filtro: ', error.response?.data?.errorMessages && error.response?.data?.errorMessages.length ? error.response?.data?.errorMessages : error.message);
      return '';
    }
  }
}
