import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';

export interface JiraWorkflowStatus {
  id: string;
  statusReference: string;
  name: string;
  statusCategory: string;
  scope: {
    type: "PROJECT";
    project: {
      id: string;
    }
  },
  description: string;
}

export interface JiraWorkflow {
  scope: {
    type: "PROJECT",
    project: {
      id: string
    }
  },
  version: {
    versionNumber: number;
    id: string;
  },
  id: string;
  name: string;
  description: string;
  isEditable: boolean;
  statuses: {
    statusReference: string;
    properties: {};
    deprecated: boolean;
  }[];
  transitions: {
    id: string;
    type: string;
    toStatusReference: string;
    links: {
      fromPort: number;
      fromStatusReference: string;
      toPort: number;
    }[];
    name: string;
    description: string;
    actions: [];
    validators: [];
    triggers: [];
    properties: {
      "jira.i18n.title": string
    }
  }[]
}

export interface JiraWorkflows {
  statuses: JiraWorkflowStatus[];
  workflows: JiraWorkflow[];
}

export interface JiraWorkflowsInput extends JiraWorkflows {
}

export interface JiraWorkflowsCreated extends JiraWorkflows {
}

export interface JiraWorkflowsQuery {
  projectAndIssueTypes?: string[]
  workflowIds?: string[]
  workflowNames?: string[]
}

export class JiraWorkflowPushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'workflows');
  }

  /**
   * @description Get all Jira workflows
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {JiraWorkflowsQuery} query
   * @return {*}  {Promise<JiraWorkflows>}
   * @memberof JiraWorkflowPushService
   */
  async getWorkflows(query: JiraWorkflowsQuery): Promise<JiraWorkflows> {
    try {
      const isValidQuery = (query?.projectAndIssueTypes?.length ?? 0) > 0 ||
        (query?.workflowIds?.length ?? 0) > 0 ||
        (query?.workflowNames?.length ?? 0) > 0;

      // Check for input errors
      if (!isValidQuery) {
        throw new Error(`❌ Jira API errors: Expected at least one set of workflow IDs, workflow names, or project and issue types`);
      }

      const response = await this.axiosInstance.post('', query);

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
   * @description Create a Jira workflows
   * @author Douglas Lima
   * @date 30/10/2025
   * @param {JiraWorkflowsInput} workflow
   * @return {*}  {Promise<JiraWorkflowsCreated>}
   * @memberof JiraWorkflowPushService
   */
  async createWorkflows(workflow: JiraWorkflowsInput): Promise<JiraWorkflowsCreated> {
    try {
      const response = await this.axiosInstance.post('', workflow);

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
