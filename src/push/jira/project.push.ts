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
  id: number;
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
  async getProjects(): Promise<JiraProject[]> {
    try {
      const response = await this.axiosInstance.get('/search');

      const projectData = response.data?.values;

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

      const response = await this.axiosInstance.post('', project);

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
}
