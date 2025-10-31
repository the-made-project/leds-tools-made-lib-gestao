import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  untranslatedName: string;
  subtask: boolean;
  avatarId: number;
  hierarchyLevel: number;
  scope: {
    type: "PROJECT";
    project: {
      id: string;
    }
  }
  self: string;
}

export interface JiraIssueTypeInput {
  name: string;
  description?: string;
}

export interface JiraIssueTypeCreated {
  id: string;
  name: string;
  description: string;
  entityId: string;
  avatarId: number;
  hierarchyLevel: number;
  iconUrl: string;
  scope: {
    project: {
      id: string;
      key: string;
      name: string;
      self: string;
      projectTypeKey: string;
      projectCategory: {},
      avatarUrls: {},
      simplified: boolean
    },
    type: "PROJECT";
  },
  self: string;
  subtask: boolean
}

export class JiraIssueTypePushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issuetype');
  }

  /**
   * @description Get all Jira issue types
   * @author Douglas Lima
   * @date 29/10/2025
   * @return {*}  {Promise<JiraIssueType[]>}
   * @memberof JiraIssueTypePushService
   */
  async getIssueTypes(): Promise<JiraIssueType[]> {
    try {
      const response = await this.axiosInstance.get('');

      // Check for request errors
      if (!response.data) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const issueTypeData = response.data;
      if (!issueTypeData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueTypeData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }
}