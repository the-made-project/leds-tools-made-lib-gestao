export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  repository: string;
  repositoryOwner: string;
  author: string;
  assignees: string[];
  milestoneNumber: number;
  customFields: Record<string, string>;
}



export class IssueService {
  constructor(private token: string) {}

  async getFromMilestoneInProject(
    org: string,
    projectNumber: number,
    milestoneNumber: number
  ): Promise<GitHubIssue[]> {
    const query = `
      query($org: String!, $projectNumber: Int!, $after: String) {
        organization(login: $org) {
          projectV2(number: $projectNumber) {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                content {
                  ... on Issue {
                    number
                    title
                    url
                    state
                    createdAt
                    updatedAt
                    repository {
                      name
                      owner {
                        login
                      }
                    }
                    author {
                      login
                    }
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    milestone {
                      number
                    }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    __typename
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldMilestoneValue {
                      milestone {
                        number
                        title
                      }
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2IterationField {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  
    const issues: GitHubIssue[] = [];
    let hasNextPage = true;
    let after: string | null = null;
  
    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { org, projectNumber, after },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Erro ao buscar issues do projeto: ${json.errors[0].message}`);
      }
  
      const items = json.data?.organization?.projectV2?.items;
      if (!items) {
        throw new Error(`❌ Projeto #${projectNumber} não encontrado em ${org}`);
      }
  
      for (const node of items.nodes) {
        const issue = node.content;
        if (!issue?.milestone || issue.milestone.number !== milestoneNumber) continue;
  
        const customFields: Record<string, string> = {};
        for (const fieldValue of node.fieldValues?.nodes || []) {
          let name = null;
          let value = null;
  
          // Extract field name based on the field value type
          if (fieldValue.field?.name) {
            name = fieldValue.field.name;
          }
  
          // Extract value based on the typename
          switch (fieldValue.__typename) {
            case "ProjectV2ItemFieldTextValue":
              value = fieldValue.text;
              break;
            case "ProjectV2ItemFieldNumberValue":
              value = fieldValue.number;
              break;
            case "ProjectV2ItemFieldDateValue":
              value = fieldValue.date;
              break;
            case "ProjectV2ItemFieldSingleSelectValue":
              value = fieldValue.name;
              break;
            case "ProjectV2ItemFieldMilestoneValue":
              value = fieldValue.milestone?.title || fieldValue.milestone?.number;
              break;
            case "ProjectV2ItemFieldIterationValue":
              value = fieldValue.title;
              break;
          }
  
          if (name && value !== null && value !== undefined) {
            customFields[name] = String(value);
          }
        }
  
        issues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          repository: issue.repository.name,
          repositoryOwner: issue.repository.owner.login,
          author: issue.author?.login || "unknown",
          assignees: issue.assignees.nodes.map((a: any) => a.login),
          milestoneNumber,
          customFields,
        });
      }
  
      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
  
    return issues;
  }
  
  async getWithoutMilestonesInProject(
    org: string,
    projectNumber: number
  ): Promise<GitHubIssue[]> {
    const query = `
      query($org: String!, $projectNumber: Int!, $after: String) {
        organization(login: $org) {
          projectV2(number: $projectNumber) {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                content {
                  ... on Issue {
                    number
                    title
                    url
                    state
                    createdAt
                    updatedAt
                    repository {
                      name
                      owner {
                        login
                      }
                    }
                    author {
                      login
                    }
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    milestone {
                      number
                    }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    __typename
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          dataType
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  
    const issues: GitHubIssue[] = [];
    let hasNextPage = true;
    let after: string | null = null;
  
    while (hasNextPage) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { org, projectNumber, after },
        }),
      });
  
      const json = await response.json();
  
      if (json.errors) {
        console.error("GraphQL error:", JSON.stringify(json.errors, null, 2));
        throw new Error(`Erro ao buscar issues do projeto: ${json.errors[0].message}`);
      }
  
      const items = json.data?.organization?.projectV2?.items;
      if (!items) {
        throw new Error(`❌ Projeto #${projectNumber} não encontrado em ${org}`);
      }
  
      for (const node of items.nodes) {
        const issue = node.content;
        if (!issue || issue.milestone !== null) continue;
  
        const customFields: Record<string, string> = {};
        for (const fieldValue of node.fieldValues?.nodes || []) {
          let name = null;
          let value = null;
  
          // Extract field name from the field property
          if (fieldValue.field?.name) {
            name = fieldValue.field.name;
          }
  
          // Extract value based on the typename
          switch (fieldValue.__typename) {
            case "ProjectV2ItemFieldTextValue":
              value = fieldValue.text;
              break;
            case "ProjectV2ItemFieldNumberValue":
              value = fieldValue.number;
              break;
            case "ProjectV2ItemFieldDateValue":
              value = fieldValue.date;
              break;
            case "ProjectV2ItemFieldSingleSelectValue":
              value = fieldValue.name;
              break;
            case "ProjectV2ItemFieldIterationValue":
              value = fieldValue.title;
              break;
          }
  
          if (name && value !== null && value !== undefined) {
            customFields[name] = String(value);
          }
        }
  
        issues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          repository: issue.repository.name,
          repositoryOwner: issue.repository.owner.login,
          author: issue.author?.login || "unknown",
          assignees: issue.assignees.nodes.map((a: any) => a.login),
          milestoneNumber: -1,
          customFields,
        });
      }
  
      hasNextPage = items.pageInfo.hasNextPage;
      after = items.pageInfo.endCursor;
    }
  
    return issues;
  }
  
    
      
}
