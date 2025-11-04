import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { JiraIssueLinkType } from './issueLinkType.push'
import { JiraIssueType } from './issueType.push'
import { JiraProject } from './project.push'

/**
 * Known types of MARKS that define inline text formatting and interface
 */
export type JiraADFMarkType = 'strong' | 'em' | 'link' | 'code' | 'strike' | 'subsup' | 'textColor' | 'underline' | 'backgroundColor' | string;
export interface JiraADFMark {
  type: JiraADFMarkType;
  attrs?: {
    [key: string]: string;
  };
}

/**
 * Know types of BLOCK and INLINE NODES
 */
export type JiraADFBlockNodeType = 'doc' | 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'codeBlock' | 'blockquote' | 'panel' | 'rule' | string;
export type JiraADFInlineNodeType = 'text' | 'hardBreak' | 'emoji' | 'mention' | 'status' | 'date' | string;
/**
 * Generic interface for any Block or Inline node
 */
export interface JiraADFGenericNode {
  type: JiraADFBlockNodeType | JiraADFInlineNodeType;
  text?: string;
  content?: JiraADFGenericNode[];
  attrs?: {
    [key: string]: string;
  }
  marks?: JiraADFMark[];
  version?: number;
}

/**
 * An interface for Jira ADF Root Node
 */
export interface JiraADFNode extends JiraADFGenericNode {
  content: JiraADFGenericNode[];
  type: 'doc';
  version: 1;
}

export interface JiraUser {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: {
    [key: string]: string;
  };
  active: boolean;
  displayName: string;
  timeZone: string;
  accountType: string;
}

export interface JiraIssueStatusCategory {
  id: number;
  key: string;
  name: string;
  colorName: string;
  self: string;
}

export interface JiraIssueStatus {
  id: string;
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  statusCategory: JiraIssueStatusCategory;
}

export interface JiraIssueFieldsBase {
  summary: string
  status: JiraIssueStatus;
  priority: {
    self: string;
    iconUrl: string;
    name: string;
    id: string;
  };
  issuetype: JiraIssueType;
}

export interface JiraIssueBase {
  id: string;
  self: string;
  key: string;
  fields: JiraIssueFieldsBase
}

export interface JiraIssueFields extends JiraIssueFieldsBase {
  project: JiraProject;
  description: string;
  parent: JiraIssueBase;
  subtasks: JiraIssue[];
  statuscategorychangedate: string;
  components: [];
  timespent: string;
  timeoriginalestimate: string;
  fixVersions: [];
  aggregatetimespent: string;
  statusCategory: {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
  workratio: number;
  watches: {
    self: string;
    watchCount: number;
    isWatching: boolean;
  },
  lastViewed: string;
  creator: JiraUser;
  created: string;
  reporter: JiraUser;
  aggregateprogress: {
    progress: number;
    total: number;
  };
  labels: [];
  environment: string;
  timeestimate: string;
  aggregatetimeoriginalestimate: string;
  versions: string[];
  duedate: string;
  progress: {
    progress: number;
    total: number;
  };
  issuelinks: JiraIssueLinkType[];
  votes: {
    self: string;
    votes: number
    hasVoted: boolean;
  };
  assignee: JiraUser;
  updated: string;
  comment: {
    comments: [];
    self: string;
    maxResults: number;
    total: number;
    startAt: number;
  },
  worklog: {
    startAt: number;
    maxResults: number;
    total: number;
    worklogs: [];
  }
}

export interface JiraIssue extends JiraIssueBase {
  expand: string;
  fields: JiraIssueFields
}

export interface JiraIssueInput {
  fields: {
    summary: string;
    project: {
      id: string;
    };
    issuetype: {
      id: string
    };
    parent?: {
      key: string
    };
    assignee?: {
      id: string
    };
    description?: JiraADFNode;
    priority?: {
      id: string;
    };
    reporter?: {
      id: string;
    };
    labels?: string[];
    components?: {
      id: string;
    }[];
    fixVersions?: {
      id: string;
    }[];
    versions?: {
      id: string;
    }[];
    security?: {
      id: string;
    };
    environment?: JiraADFNode;
    duedate?: string;
    timetracking?: {
      originalEstimate: string;
      remainingEstimate: string;
    };
  };
  update: {
    issuelinks?: {
      add: {
        type: {
          id: string
        };
        inwardIssue?: {
          key: string;
        };
        outwardIssue?: {
          key: string;
        }
      }
    }
  };
}

export interface JiraIssueCreated {
  id: string;
  key: string;
  self: string;
}

export interface JiraIssueError {
  id: string;
  errorMessage: string;
}

export interface JiraIssueBulkFetch {
  expand: string,
  issues: JiraIssue[];
  issueErrors: JiraIssueError[]
}

export interface JiraIssueBulkCreate {
  issueUpdates: JiraIssueInput[]
}

export class JiraIssuePushService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issue');
  }

  /**
   * @description Get a Jira issue by id or key
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {string} issueIdOrKey
   * @return {*}  {Promise<JiraIssue[]>}
   * @memberof JiraIssuePushService
   */
  async getIssue(issueIdOrKey: string): Promise<JiraIssue[]> {
    try {
      // Check for input errors
      if (!issueIdOrKey) {
        throw new Error(`❌ Jira API errors: An issue id or key does not defined`);
      }

      const response = await this.axiosInstance.get(`/${issueIdOrKey}`);
      const issueData = response.data;

      if (!issueData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Get a list of Jira issues
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {string[]} issueIdsOrKeys
   * @param {string[]} [fields]
   * @return {*}  {Promise<JiraIssue[]>}
   * @memberof JiraIssuePushService
   */
  async bulkFetchIssues(issueIdsOrKeys: string[], fields?: string[]): Promise<JiraIssue[]> {
    try {
      // Check for input errors
      if (!issueIdsOrKeys || issueIdsOrKeys.length === 0) {
        throw new Error(`❌ Jira API errors: At least one issue id or key is required`);
      }

      const body = {
        issueIdsOrKeys,
        ...((fields && fields?.length > 0 && { fields }) ?? {})
      };
      const response = await this.axiosInstance.post('/bulkfetch', body);
      const responseData = response.data as JiraIssueBulkFetch;

      // Check for request errors
      if (responseData?.issueErrors && responseData?.issueErrors?.length > 0) {
        const errorMessages = responseData.issueErrors.map((err: JiraIssueError) => err.errorMessage).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const issueData = responseData?.issues;
      if (!issueData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Create a Jira issue
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {JiraIssueInput} issue
   * @return {*}  {Promise<JiraIssueCreated>}
   * @memberof JiraIssuePushService
   */
  async createIssue(issue: JiraIssueInput): Promise<JiraIssueCreated> {
    try {
      // Check for input errors
      if (!issue.fields) {
        throw new Error(`❌ Jira API errors: Issue fields does not defined`);
      }
      if (!issue.fields.summary || !issue.fields.project || !issue.fields.issuetype) {
        throw new Error(`❌ Jira API errors: Summary, project and issue type are required`);
      }

      const response = await this.axiosInstance.post('', issue);
      const issueData = response.data;

      if (!issueData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Create many Jira issues
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {JiraIssueInput[]} issueUpdates
   * @return {*}  {Promise<JiraIssueCreated[]>}
   * @memberof JiraIssuePushService
   */
  async bulkCreateIssues(issueUpdates: JiraIssueInput[]): Promise<JiraIssueCreated[]> {
    try {
      // Check for input errors
      if (!issueUpdates || issueUpdates?.length === 0) {
        throw new Error(`❌ Jira API errors: Issues does not defined`);
      }

      const response = await this.axiosInstance.post('', { issueUpdates });

      // Check for request errors
      if (response.data?.errors && response.data?.errors?.length > 0) {
        const errorMessages = response.data.errors.map((err: any) => err.message).join(', ');
        throw new Error(`❌ Jira API errors: ${errorMessages}`);
      }

      const issueData = response.data.issues;

      if (!issueData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      return issueData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }
}
