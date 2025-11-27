import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';

export interface JiraUser {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: {
    [key: string]: string;
  };
  active: boolean;
  displayName: string;
  accountType: string;
  timeZone?: string;
}

export interface JiraUserGroupInput {
  name: string
  description?: string
}

export interface JiraUserGroup extends JiraUserGroupInput {
  expand: string;
  groupId: string;
  self: string;
  users: {
    items: JiraUser[];
    size: number;
    "start-index": number;
    "end-index": number;
    "max-results": number;
  }
}

export class JiraUserPushService {
  private axiosInstance: AxiosInstance;
  private axiosUserGroupInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'user');
    this.axiosUserGroupInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'group');
  }

  /**
   * @description Get account id by user email
   * @author Douglas Lima
   * @date 26/11/2025
   * @param {string} userEmail
   * @return {*}  {Promise<string | null>}
   * @memberof JiraUserPushService
   */
  async getAccountId(userEmail: string): Promise<string | null> {
    try {
      const response = await this.axiosInstance.get(`/search?query=${userEmail}`);

      // Check for request errors
      if (!response.data) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const userData = response.data.find((user: any) => user.emailAddress === userEmail);

      return userData ? userData.accountId : null;
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Create a user group
   * @author Douglas Lima
   * @date 26/11/2025
   * @param {JiraUserGroupInput} userGroup
   * @return {*}  {Promise<JiraUserGroup>}
   * @memberof JiraUserPushService
   */
  async createOrEnsureUserGroup(userGroup: JiraUserGroupInput): Promise<JiraUserGroup> {
    try {
      // Check input data
      if (!userGroup || !userGroup.name) {
        throw new Error('❌ Group data is not defined');
      }

      const groupName = userGroup.name.toLowerCase().replace(/ /g, '-')

      const response = await this.axiosUserGroupInstance.get(`?groupname=${groupName}}`);
      const groupData = response.data

      // Check for request errors
      if (groupData && groupData.name === groupName) {
        return groupData
      }

      const group: JiraUserGroupInput = {
        name: groupName,
        description: userGroup.description || ''
      }
      const groupResponse = await this.axiosUserGroupInstance.post('', group);

      // Check for request errors
      if (!groupResponse.data) {
        const errorMessages = groupResponse.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      return groupResponse.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Add a user to group
   * @author Douglas Lima
   * @date 26/11/2025
   * @param {string} groupId
   * @param {string} accountId
   * @return {*}  {Promise<JiraUserGroup>}
   * @memberof JiraUserPushService
   */
  async addUserToGroup(groupId: string, accountId: string): Promise<JiraUserGroup> {
    try {
      // Check input data
      if (!groupId) {
        throw new Error('❌ Group data is not defined');
      }
      if (!accountId) {
        throw new Error('❌ User data is not defined');
      }

      const user = {
        accountId
      }
      const groupResponse = await this.axiosUserGroupInstance.post(`/user?groupId=${groupId}`, user);

      // Check for request errors
      if (!groupResponse.data) {
        const errorMessages = groupResponse.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      return groupResponse.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }
}
