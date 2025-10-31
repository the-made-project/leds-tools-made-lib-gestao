import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';

export interface JiraIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
}

export interface JiraIssueLinkTypeInput {
  name: string;
  inward?: string;
  outward?: string;
}

export interface JiraIssueLinkTypeCreated {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
}

export class JiraIssueLinkTypePushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issueLinkType');
  }

  /**
   * @description Get all Jira issue link types
   * @author Douglas Lima
   * @date 29/10/2025
   * @return {*}  {Promise<JiraIssueLinkType[]>}
   * @memberof JiraIssueLinkTypePushService
   */
  async getIssueLinkTypes(): Promise<JiraIssueLinkType[]> {
    try {
      const response = await this.axiosInstance.get('');

      // Check for request errors
      if (!response.data) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const issueLinkTypeData = response.data?.issueLinkTypes;
      if (!issueLinkTypeData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueLinkTypeData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }
}