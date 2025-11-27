import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';

export interface JiraProject {
  expand: string;
  self: string;
  id: string;
  key: string;
  name: string;
  avatarUrls: {
    [key: string]: string
  },
  projectTypeKey: string;
  simplified: boolean,
  style: string;
  isPrivate: false,
  properties: {},
  entityId: string;
  uuid: string;
}

export interface JiraProjectInput {
  key: string;
  name: string;
  assigneeType?: string;
  avatarId?: number;
  categoryId?: number;
  description?: string;
  issueSecurityScheme?: number;
  leadAccountId?: string;
  notificationScheme?: number;
  permissionScheme?: number;
  projectTemplateKey?: string;
  projectTypeKey?: string;
  url?: string;
}

export interface JiraProjectCreated {
  id: string;
  key: string;
  self: string
}

export class JiraProjectPushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'project');
  }

  /**
   * @description Get a Jira project
   * @author Douglas Lima
   * @date 30/10/2025
   * @return {*}  {Promise<JiraProject>}
   * @memberof JiraProjectPushService
   */
  async getProject(projectIdOrKey: string): Promise<JiraProject> {
    try {
      const response = await this.axiosInstance.get(`/${projectIdOrKey}`);

      // Check for request errors
      if (!response.data) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const projectData = response.data;

      if (!projectData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return projectData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Get all Jira projects
   * @author Douglas Lima
   * @date 29/10/2025
   * @return {*}  {Promise<JiraProject[]>}
   * @memberof JiraProjectPushService
   */
  async getProjects(projectName: string = '', startAt: number = 0, maxResults: number = 5): Promise<JiraProject[]> {
    try {
      return this.getProjectsPaginated(`/search?startAt=${startAt}&maxResults=${maxResults}&query=${encodeURIComponent(`name ~ "${projectName}"`)}`);

    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  private async getProjectsPaginated(urlSearch: string): Promise<JiraProject[]> {
    try {
      const response = await this.axiosInstance.get(urlSearch);

      if (!response.data) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }
      const nextPage = (!response.data.isLast ? [] : await this.getProjectsPaginated(response.data.nextPage));
      return [...response.data.values, ...nextPage];
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }
      throw error;
    }
  }

  async getProjectIdByName(projectName: string): Promise<string> {
    try {
      const projects = await this.getProjects(projectName);
      const project = projects.find(proj => proj.name.toLowerCase() === projectName.toLowerCase());
      return project ? project.id : '';
    } catch (error) {
      console.error('❌ Erro ao buscar projeto pelo nome:', error);
      throw error;
    }
  }

  /**
   * @description Create a Jira project
   * @author Douglas Lima
   * @date 30/10/2025
   * @param {JiraProjectInput} project
   * @return {*}  {Promise<JiraProjectCreated>}
   * @memberof JiraProjectPushService
   */
  async createProject(project: JiraProjectInput): Promise<JiraProjectCreated> {
    try {
      // Check for input errors
      if (!project.name) {
        throw new Error(`❌ Jira API errors: Project name does not defined`);
      }

      if (!project.key) {
        throw new Error(`❌ Jira API errors: Project key does not defined`);
      }

      try {
        // Verificando se o projeto existe
        const response = await this.axiosInstance.get(`/${project.key}`);
        const projectData = response.data;

        // Check for request errors
        if (!projectData) {
          throw new Error('❌ A resposta da API não contém os dados esperados.');
        }

        return projectData
      } catch (error: any) {
        if (error.response?.status === 422) {
          const errorData = error.response.data;
          throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
        }

        if (error.response?.status === 404) {
          const response = await this.axiosInstance.post('', project);
          const projectData = response.data;

          // Check for request errors
          if (!projectData) {
            throw new Error('❌ A resposta da API não contém os dados esperados.');
          }

          return projectData
        }

        throw error;
      }
    } catch (error: any) {
      throw error;
    }
  }
}
