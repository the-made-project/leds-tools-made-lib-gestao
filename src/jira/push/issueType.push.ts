import { JiraTokenManager } from '../service/JiraTokenManager';
import { axiosInstance } from '../util/axiosInstance';

export interface JiraIssueType {
  id: string;
  self: string;
  name: string;
  description: string;
  iconUrl: string;
  untranslatedName: string;
  subtask: boolean;
  avatarId: number;
  hierarchyLevel: number;
}

export interface JiraIssueTypeInput {
  name: string;
  description?: string;
}

// Interface para resposta da criação
export interface JiraIssueTypeCreated {
  id: string;
  number: number;
}

export class JiraIssueTypePushService {
  /**
   * 
   */
  async getIssueTypes(): Promise<JiraIssueType[]> {
    const jiraTokenManager = JiraTokenManager.getInstance();
    const axios_instance = axiosInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issuetype');

    try {
      const response = await axios_instance.get('');

      // Check for GraphQL errors
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