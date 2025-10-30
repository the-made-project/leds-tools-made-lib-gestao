import { JiraTokenManager } from '../service/JiraTokenManager';
import { axiosInstance } from '../util/axiosInstance';

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

// Interface para resposta da criação
export interface JiraProjectCreated {
  id: number;
  key: string;
  self: string
}

export class JiraProjectPushService {
  /**
   * 
   */
  async getProjects(): Promise<JiraProject[]> {
    const jiraTokenManager = JiraTokenManager.getInstance();
    const axios_instance = axiosInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'project');

    try {
      const response = await axios_instance.get('');

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