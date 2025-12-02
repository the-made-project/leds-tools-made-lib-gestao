import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { JiraIssueLinkType } from './issueLinkType.push'
import { JiraIssueType, JiraIssueTypePushService } from './issueType.push'
import { JiraProject } from './project.push'
import { JiraUser, JiraUserPushService } from './user.push'
import { Logger } from '../../util/logger';
import { Issue, Release } from '../../model/models';
import { ISSUE_TYPES } from '../../util/constants';
import { epicBody, storyBody, subtaskBody } from '../../templates/jira/index'

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
  fields?: {
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
    description?: JiraADFNode | Object;
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
  update?: {
    labels?: {
      [key: string]: string | string[];
    }[],
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
  }
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
  private axiosLabelInstance: AxiosInstance;
  private axiosSearchInstance: AxiosInstance;
  private issueTypeInstance: JiraIssueTypePushService = new JiraIssueTypePushService();
  private userInstance: JiraUserPushService = new JiraUserPushService();

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'issue');
    this.axiosLabelInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'label');
    this.axiosSearchInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'search');
  }

  /**
   * @description Get all Jira labels
   * @author Douglas Lima
   * @date 25/11/2025
   * @param {number} [startAt=0]
   * @param {number} [maxResults=100]
   * @return {*}  {Promise<string[]>}
   * @memberof JiraIssuePushService
   */
  async getAllLabels(startAt: number = 0, maxResults: number = 100): Promise<string[]> {
    try {
      return this.getLabelsPaginated(`?startAt=${startAt}&maxResults=${maxResults}`)
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  private async getLabelsPaginated(urlSearch: string): Promise<string[]> {
    try {
      const response = await this.axiosLabelInstance.get(urlSearch);

      if (!response.data) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      const nextPage = response.data.isLast ? [] : await this.getLabelsPaginated(response.data.nextPage);
      return [...response.data.values, ...nextPage];
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Ensure a Jira label exists, creating it if necessary
   * @author Douglas Lima
   * @date 25/11/2025
   * @param {string[]} labels
   * @return {*}  {Promise<any>}
   * @memberof JiraIssuePushService
   */
  async ensureLabelExists(projectId: string, labels: string[]): Promise<any> {
    try {
      const allLabels = await this.getAllLabels();
      const labelAlreadyExists = labels.filter(label => allLabels.includes(label))
      const labelNotExistsYet = labels.filter(label => !allLabels.includes(label))

      if (labelAlreadyExists) {
        for (const label of labelAlreadyExists) {
          Logger.info(`ℹ️ Label "${label}" já existe`);
        }
      }

      if (labelNotExistsYet.length === 0) {
        return;
      }

      const newLabelsExpression = labelNotExistsYet.join(', ')
      const issueTypes = await this.issueTypeInstance.getIssueTypes();
      const issueTypeId = issueTypes.find(type => type.name.toLowerCase() === 'task' && type.scope?.project?.id === projectId)?.id;

      if (!issueTypeId) {
        Logger.info(`ℹ️ Não foi possível criar a(s) label(s) "${newLabelsExpression}";`);
        return;
      }

      // Criando issue temporária para adicionar o label
      const issue: JiraIssueInput = {
        fields: {
          summary: 'Temporary issue to create labels not existing yet',
          project: {
            id: projectId
          },
          issuetype: {
            id: issueTypeId
          },
          labels: labelNotExistsYet.map(label => label.replace(/ /g, '-'))
        },
        update: {}
      };
      const response = await this.createIssue(issue);
      Logger.success(`✅ Label(s) "${newLabelsExpression}" criada(s) com sucesso`);

      // Removendo issue temporária
      await this.deleteIssue(response.key);
    } catch (error: any) {
      if (error.response?.status === 422 || error.response?.status === 400) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Ensure a Jira label exists, creating it if necessary
   * @author Douglas Lima
   * @date 25/11/2025
   * @param {string} issueIdOrKey
   * @param {string[]} labels
   * @return {*}  {Promise<void>}
   * @memberof JiraIssuePushService
   */
  async addLabelsToIssue(issueIdOrKey: string, labels: string[]): Promise<void> {
    try {
      if (!issueIdOrKey) {
        throw new Error('❌ Issue id or key is not defined');
      }
      if (!labels || labels.length === 0) {
        throw new Error('❌ Labels are not defined');
      }

      const issue: JiraIssueInput = {
        update: {
          labels: [{
            add: labels
          }]
        }
      };

      await this.updateIssue(issueIdOrKey, issue);
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Get a Jira issue by id or key
   * @author Douglas Lima
   * @date 31/10/2025
   * @param {string} issueIdOrKey
   * @return {*}  {Promise<JiraIssue>}
   * @memberof JiraIssuePushService
   */
  async getIssue(issueIdOrKey: string): Promise<JiraIssue> {
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
   * @description Prepare and Create a Jira issue
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {string} projectId
   * @param {Issue} issue
   * @param {JiraIssueType[]} issueTypes
   * @param {Map<string, string>} parentIssues
   * @param {Map<string, string>} members
   * @return {*}  {Promise<JiraIssueCreated>}
   * @memberof JiraIssuePushService
   */
  async prepareAndCreateIssue(projectId: string, issue: Issue, issueTypes: JiraIssueType[], parentIssues: Map<string, string>, members: Map<string, string>): Promise<JiraIssueCreated> {
    try {
      const issueData = this.prepareIssueToCreate(projectId, issue, issueTypes, parentIssues, members)
      return this.createIssue(issueData)
    } catch (error: any) {
      if (error.response?.status === 422 || error.response?.status === 400) {
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
   * @private
   * @param {JiraIssueInput} issue
   * @return {*}  {Promise<JiraIssueCreated>}
   * @memberof JiraIssuePushService
   */
  private async createIssue(issue: JiraIssueInput): Promise<JiraIssueCreated> {
    try {
      // Check for input errors
      if (!issue.fields) {
        throw new Error(`❌ Jira API errors: Issue fields does not defined`);
      }
      if (!issue.fields.summary || !issue.fields.project || !issue.fields.issuetype) {
        throw new Error(`❌ Jira API errors: Summary, project and issue type are required`);
      }

      // Verifica se a issue ja existe antes de criar
      const existingKey = await this.checkIssueExists(issue);

      if (existingKey) return this.getIssue(existingKey);

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
   * @description Check issue exists
   * @author Douglas Lima
   * @date 01/12/2025
   * @private
   * @param {JiraIssueInput} issue
   * @return {*}  {Promise<string>}
   * @memberof JiraIssuePushService
   */
  private async checkIssueExists(issue: JiraIssueInput): Promise<string> {
    const projectKey = issue?.fields?.project.id;
    const summary = issue?.fields?.summary;
    const issueTypeId = issue?.fields?.issuetype?.id;

    if (!projectKey || !summary || !issueTypeId) {
      console.error(`❌ Não foi possível verificar a existência da Issue '${summary}': dados insuficientes.`);
      return '';
    }

    // 2. Construir a JQL com o Tipo de Issue
    const jqlQuery = `project = ${projectKey} AND issuetype = ${issueTypeId} AND summary ~ '${summary}'`;

    const searchPayload = {
      jql: jqlQuery,
      maxResults: 1
    };

    try {
      const response = await this.axiosSearchInstance.post('/jql', searchPayload);
      const searchData = response.data;

      if (searchData.issues && searchData.issues.length) {
        const existingIssueKey = searchData.issues[0].id;
        console.log(`   ✅ Issue com id ${existingIssueKey} já existe. Pulando criação.`);
        return existingIssueKey;
      }

      return '';
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        console.error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      return '';
    }
  }

  /**
   * @description Prepare and Create many Jira issues
   * @author Douglas Lima
   * @date 28/11/2025
   * @param {string} projectId
   * @param {Issue[]} issues
   * @param {JiraIssueType[]} issueTypes
   * @param {Map<string, string>} parentIssues
   * @param {Map<string, string>} members
   * @return {*}  {Promise<JiraIssueCreated[]>}
   * @memberof JiraIssuePushService
   */
  async bulkPrepareAndCreateIssues(projectId: string, issues: Issue[], issueTypes: JiraIssueType[], parentIssues: Map<string, string>, members: Map<string, string>): Promise<JiraIssueCreated[]> {
    try {
      // Check for input errors
      if (!issues || issues?.length === 0) {
        throw new Error(`❌ Jira API errors: Issues does not defined`);
      }

      const batchIssues = issues.map(issue => this.prepareIssueToCreate(projectId, issue, issueTypes, parentIssues, members))

      return this.bulkCreateIssues(batchIssues)
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Prepare a Jira issue to create
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {string} projectId
   * @param {Issue} issue
   * @param {JiraIssueType[]} issueTypes
   * @param {Map<string, string>} parentIssues
   * @param {Map<string, string>} members
   * @return {*}  {JiraIssueInput}
   * @memberof JiraIssuePushService
   */
  private prepareIssueToCreate(projectId: string, issue: Issue, issueTypes: JiraIssueType[], parentIssues: Map<string, string>, members: Map<string, string>): JiraIssueInput {
    const issueType = issueTypes.find(type => type.name === issue.type)
    const assigneeId = members.get(issue.assignee?.email || '')
    const parentKey = parentIssues.get((issue.depends || [])[0]?.id || '')

    return {
      fields: {
        summary: (issue.title || '').replace(/"/g, '\''),
        project: {
          id: projectId,
        },
        issuetype: {
          id: issueType?.id || ''
        },
        description: this.buildDescription(issue),
        labels: issue.labels || [],
        ...(assigneeId ? {
          assignee: {
            id: assigneeId
          }
        } : {}),
        ...(parentKey ? {
          parent: {
            key: parentKey
          }
        } : {})
      }
    }
  }

  /**
   * @description Create many Jira issues
   * @author Douglas Lima
   * @date 31/10/2025
   * @private
   * @param {JiraIssueInput[]} issueUpdates
   * @return {*}  {Promise<JiraIssueCreated[]>}
   * @memberof JiraIssuePushService
   */
  private async bulkCreateIssues(issueUpdates: JiraIssueInput[]): Promise<JiraIssueCreated[]> {
    try {
      // Check for input errors
      if (!issueUpdates || issueUpdates?.length === 0) {
        throw new Error(`❌ Jira API errors: Issues does not defined`);
      }

      const response = await this.axiosInstance.post('/bulk', { issueUpdates });

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

  /**
   * @description Assignee a Jira issue
   * @author Douglas Lima
   * @date 26/11/2025
   * @param {string} issueIdOrKey
   * @param {string} user
   * @return {*}  {Promise<void>}
   * @memberof JiraIssuePushService
   */
  async assigneeIssue(issueIdOrKey: string, user: string): Promise<void> {
    try {
      if (!issueIdOrKey) {
        throw new Error('❌ Issue id or key is not defined');
      }

      const accountId = await this.userInstance.getAccountId(user);
      const issue: JiraIssueInput = {
        fields: {
          assignee: accountId ? { accountId } : null
        } as any
      };

      await this.updateIssue(issueIdOrKey, issue)
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Update a Jira issue
   * @author Douglas Lima
   * @date 25/11/2025
   * @param {string} issueIdOrKey
   * @param {JiraIssueInput} issue
   * @return {*}  {Promise<void>}
   * @memberof JiraIssuePushService
   */
  async updateIssue(issueIdOrKey: string, issue: JiraIssueInput): Promise<void> {
    try {
      if (!issueIdOrKey) {
        throw new Error('❌ Issue id or key is not defined');
      }
      if (!issue || !(issue.update || issue.fields)) {
        throw new Error('❌ Issue data is not defined');
      }

      await this.axiosInstance.put(`/${issueIdOrKey}`, issue);
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Delete Jira issue
   * @author Douglas Lima
   * @date 25/11/2025
   * @param {string} issueIdOrKey
   * @return {*}  {Promise<any>}
   * @memberof JiraIssuePushService
   */
  async deleteIssue(issueIdOrKey: string): Promise<any> {
    try {
      // Check for input errors
      if (!issueIdOrKey) {
        throw new Error(`❌ Jira API errors: Issue id or key does not defined`);
      }

      return this.axiosInstance.delete(`/${issueIdOrKey}`);
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Assign release issues to a milestone
   * @author Douglas Lima
   * @date 29/11/2025
   * @param {string} projectId
   * @param {string} versionId
   * @param {Release[]} releases
   * @return {*}  {Promise<any>}
   * @memberof JiraIssuePushService
   */
  async assignIssuesToVersion(projectId: string, versionId: string, releases: Release[], issueIdToJiraIssueKey: Map<string, string>): Promise<any> {
    try {
      // Check for input errors
      if (!projectId) {
        throw new Error(`❌ Jira API errors: Project id not defined`);
      }
      if (!versionId) {
        throw new Error(`❌ Jira API errors: Version id not defined`);
      }
      if (!releases || !releases.length) {
        return;
      }
      const delayToAssignReleaseIssues = 500

      for (const release of releases) {
        console.log(`📎 Atribuindo issues da release "${release.version} - ${release.name || release.description}" ao milestone`);

        if (!release.issues || !release.issues.length) {
          console.log(`ℹ️ Nenhuma issue na release "${release.version} - ${release.name || release.description}" para ser assinada ao milestone`);
          return;
        }

        const batchResults = await Promise.all(
          release.issues.map(releaseIssue => {
            const issueKey = issueIdToJiraIssueKey.get(releaseIssue.id || '');

            if (!issueKey) {
              console.warn(`⚠️ Issue "${releaseIssue.id} - ${releaseIssue.title}" não encontrada para adicioná-la ao milestone`);
              return false;
            }

            return this.assignIssueToVersion(issueKey, versionId);
          })
        );

        const processedIssues = batchResults.reduce((acc, processed) => processed ? acc + 1 : acc, 0)
        console.log(`✅ Atribuído ${processedIssues} issues da release "${release.version} - ${release.name || release.description}" ao milestone`);

        // Apply depay to process issues for each release
        await new Promise(resolve => setTimeout(resolve, delayToAssignReleaseIssues));
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      throw error;
    }
  }

  /**
   * @description Assign release issues to a milestone
   * @author Douglas Lima
   * @date 29/11/2025
   * @private
   * @param {string} issueKey
   * @param {string} versionId
   * @return {*}  {Promise<boolean>}
   * @memberof JiraIssuePushService
   */
  private async assignIssueToVersion(issueKey: string, versionId: string): Promise<boolean> {
    try {
      // Check for input errors
      if (!issueKey) {
        console.error(`❌ Jira API errors: Issue key not defined to assign issue to milestone`);
        return false;
      }
      if (!versionId) {
        console.error(`❌ Jira API errors: Version id not defined to assign issue to milestone`);
        return false;
      }

      const payload = {
        fields: {
          fixVersions: [
            { id: versionId }
          ]
        }
      };
      await this.axiosInstance.put(`/${issueKey}`, payload);
      console.log(`✅ Issue ${issueKey} atribuído ao milestone`);

      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao atribuir milestone à issue "${issueKey}":`, error.response?.data || error.message);

      return false;
    }
  }

  /**
   * @description Build the Story Issue body description
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {Issue} issue
   * @return {*}  {Object}
   * @memberof JiraIssuePushService
   */
  private buildDescription(issue: Issue): Object {
    if (issue.type === ISSUE_TYPES.EPIC) return this.buildEpicBody(issue)
    if (issue.type === ISSUE_TYPES.STORY) return this.buildStoryBody(issue)
    if (issue.type === ISSUE_TYPES.SUBTASK) return this.buildSubtaskBody(issue)

    return ''
  }
  /**
   * @description Build the Epic Issue body description
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {Issue} issue
   * @return {*}  {Object}
   * @memberof JiraIssuePushService
   */
  private buildEpicBody(issue: Issue): Object {
    // Converte itens de lista para formato de texto simples (o ADF lidará com a lista se necessário)
    const criterionsText = (issue.criterions || []).map(c => `* ${c}`).join('\n') || '[Adicione critérios de aceitação]';
    const observationText = issue.observation || '';

    // Copia o objeto do template em ADF
    const adf = JSON.parse(JSON.stringify(epicBody));

    // Substitui a variável {{description}} no primeiro parágrafo
    adf.content[1].content[0].text = issue.description || '[Descreva de forma clara e sucinta o propósito da Epic.]';

    // Substitui {{criterions}}
    adf.content[3].content[0].text = criterionsText || adf.content[3].content[0].text;

    // Substitui {{observation}}
    adf.content[5].content[0].text = observationText || adf.content[5].content[0].text;

    return adf;
  }

  /**
   * @description Build the Story Issue body description
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {Issue} issue
   * @return {*}  {Object}
   * @memberof JiraIssuePushService
   */
  private buildStoryBody(issue: Issue): Object {
    const requirementsText = (issue.requirements || []).map(r => `* ${r}`).join('\n') || '[Adicione requisitos]';
    const criterionsText = (issue.criterions || []).map(c => `* ${c}`).join('\n') || '[Adicione critérios de aceitação]';
    const tasksMarkdownText = '* [ ] (Subtask associada)';
    const observationText = issue.observation || '';

    const adf = JSON.parse(JSON.stringify(storyBody));

    // Descrição
    adf.content[1].content[0].text = issue.description || '[Descreva de forma clara e sucinta o propósito da funcionalidade.]';

    // Requisitos
    adf.content[3].content[0].text = requirementsText || adf.content[3].content[0].text;

    // Atividades/Tasks
    adf.content[5].content[0].text = tasksMarkdownText || adf.content[5].content[0].text;

    // Critérios
    adf.content[7].content[0].text = criterionsText || adf.content[7].content[0].text;

    // Observações
    adf.content[9].content[0].text = observationText || adf.content[9].content[0].text;

    return adf;
  }

  /**
   * @description Build the Subtask Issue body description
   * @author Douglas Lima
   * @date 28/11/2025
   * @private
   * @param {Issue} issue
   * @return {*}  {Object}
   * @memberof JiraIssuePushService
   */
  private buildSubtaskBody(issue: Issue): Object {
    const deliverablesText = (issue.deliverables || []).map(d => `* ${d}`).join('\n') || '[Adicione entregáveis]';
    const observationText = issue.observation || '';

    const adf = JSON.parse(JSON.stringify(subtaskBody));

    // Descrição/Objetivo
    adf.content[1].content[0].text = issue.description || '[Descreva de forma clara e sucinta o propósito da tarefa.]';

    // Entregáveis
    adf.content[3].content[0].text = deliverablesText || adf.content[3].content[0].text;

    // Observações
    adf.content[5].content[0].text = observationText || adf.content[5].content[0].text;

    return adf;
  }
}
