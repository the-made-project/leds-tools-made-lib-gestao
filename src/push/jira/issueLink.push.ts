import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { JiraIssueLinkType } from './issueLinkType.push';
import { JiraIssue } from './issue.push';
import { Logger } from '../../util/logger';

export interface JiraIssueLinkWard {
  id: string;
  key: string;
  self: string;
  fields: JiraIssue;
}

export interface JiraIssueLink {
  id: string;
  self: string;
  type: JiraIssueLinkType;
  inwardIssue: JiraIssueLinkWard;
  outwardIssue: JiraIssueLinkWard;
}

export interface JiraIssueLinkInput {
  type: {
    id: string;
  };
  inwardIssue: {
    key: string;
  };
  outwardIssue: {
    key: string;
  };
}

export class JiraIssueLinkPushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issueLink');
  }

  /**
   * @description Create a link between two issues
   * @author Douglas Lima
   * @date 28/11/2025
   * @param {string} issueLinkTypeId
   * @param {string} issueKey
   * @param {string} parentKey
   * @return {*}  {Promise<void>}
   * @memberof JiraIssueLinkPushService
   */
  async createIssueLink(issueLinkTypeId: string, issueKey: string, parentKey: string): Promise<void> {
    try {
      const issueLink = this.prepareIssueLink(issueLinkTypeId, issueKey, parentKey)

      if (issueLink) {
        const response = await this.axiosInstance.post('', issueLink);

        // Check for request errors
        if (!response.data) {
          const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
          Logger.error(`❌ Jira API errors: ${errorMessages}`);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        Logger.error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      Logger.error(`❌ Error link between issues '${issueKey}' and '${parentKey}'. Error: ${JSON.stringify(error.response.data)}`);
    }
  }

  /**
   * @description Prepare the data to link two issues
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {string | undefined} issueLinkTypeId
   * @param {string | undefined} issueKey
   * @param {string | undefined} parentKey
   * @return {*}  {JiraIssueLinkInput}
   * @memberof JiraIssueLinkPushService
   */
  private prepareIssueLink(issueLinkTypeId: string | undefined, issueKey: string | undefined, parentKey: string | undefined): JiraIssueLinkInput | null {
    if (!issueLinkTypeId || !issueKey || !parentKey) return null

    return {
      type: {
        id: issueLinkTypeId
      },
      // A Issue que recebe o 'is blocked by'
      inwardIssue: {
        key: parentKey
      },
      // A Issue que aplica 'blocks'
      outwardIssue: {
        key: issueKey
      }
    }
  }
}
